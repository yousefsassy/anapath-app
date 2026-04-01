import {
  appendAuditEvent,
  findAllExams,
  findExamById,
  createExamWithReport,
  createEmptyReportForExamId,
  createReportRevision,
  findLatestReportRevisionByExamId,
  findReportByExamId,
  updateExamById,
  clearResultIssuedDateForExam,
  getExamStats,
} from '../db/queries.js';
import { withDbTransaction } from '../config/database.js';
import { resolveLaboratoryId } from '../utils/requestContext.js';
import { buildDbPolicyContext } from '../utils/dbPolicyContext.js';
import {
  buildAuditRequestContext,
  reportSnapshotChanged,
} from '../utils/auditTrail.js';

const EDITABLE_FIELDS = [
  'exam_type',
  'clinic_name',
  'requesting_doctor',
  'requested_date',
  'registered_date',
  'result_issued_date',
  'sample_nature',
  'exam_history',
  'diagnosis_keywords',
  'status',
  'urgent',
];

export async function getStats(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const raw = await getExamStats(labId);
    return res.json({
      success: true,
      data: {
        registered_count: parseInt(raw.registered_count, 10),
        in_progress_count: parseInt(raw.in_progress_count, 10),
        completed_this_month: parseInt(raw.completed_this_month, 10),
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getExams(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const query = req.validated?.query ?? req.query;
    const filters = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.exam_type ? { exam_type: query.exam_type } : {}),
      ...(query.search ? { search: query.search } : {}),
      ...(query.date_from ? { date_from: query.date_from } : {}),
      ...(query.date_to ? { date_to: query.date_to } : {}),
      ...(query.keyword ? { keyword: query.keyword } : {}),
    };

    const exams = await findAllExams(filters, labId);
    return res.status(200).json({ success: true, data: exams });
  } catch (error) {
    return next(error);
  }
}

export async function createExam(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const body = req.validated?.body ?? req.body;

    const result = await createExamWithReport({
      laboratory_id: labId,
      dbPolicyContext: buildDbPolicyContext(req),
      patient_id: body.patient_id,
      exam_type: body.exam_type,
      clinic_name: body.clinic_name || '',
      requesting_doctor: body.requesting_doctor || '',
      requested_date: body.requested_date || null,
      registered_date: body.registered_date || new Date().toISOString().slice(0, 10),
      result_issued_date: body.result_issued_date || null,
      sample_nature: body.sample_nature || '',
      exam_history: body.exam_history || '',
      diagnosis_keywords: body.diagnosis_keywords || [],
      status: body.status || 'registered',
      urgent: body.urgent === true,
    });

    if (result.error === 'PATIENT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Patient introuvable pour ce prélèvement.',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Prélèvement créé.',
      data: result.exam,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getExamById(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const examId = req.validated?.params?.id;
    const exam = await findExamById(examId, labId);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Prélèvement introuvable.' });
    }

    return res.status(200).json({ success: true, data: exam });
  } catch (error) {
    return next(error);
  }
}

export async function updateExam(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const examId = req.validated?.params?.id;
    const body = req.validated?.body ?? req.body;
    const auditContext = buildAuditRequestContext(req, {
      laboratoryId: labId,
    });

    const result = await withDbTransaction(async (client) => {
      const exam = await findExamById(examId, labId, client);

      if (!exam) {
        return { error: 'EXAM_NOT_FOUND' };
      }

      const updateKeys = Object.keys(body).filter((field) => body[field] !== undefined);

      if (
        exam.status === 'completed' &&
        !(updateKeys.length === 1 && body.status === 'in_progress')
      ) {
        return { error: 'VALIDATED_EXAM_LOCKED' };
      }

      const updatePayload = Object.fromEntries(
        EDITABLE_FIELDS
          .filter((field) => body[field] !== undefined)
          .map((field) => [field, body[field]])
      );

      if (
        updatePayload.status === 'completed' &&
        !exam.result_issued_date &&
        !updatePayload.result_issued_date
      ) {
        updatePayload.result_issued_date = new Date().toISOString().slice(0, 10);
      }

      let updatedExam = await updateExamById(examId, labId, updatePayload, client);
      let createdRevision = null;

      if (updatePayload.status === 'completed' && exam.status !== 'completed') {
        let report = await findReportByExamId(examId, labId, client);

        if (!report) {
          await createEmptyReportForExamId(examId, labId, client);
          report = await findReportByExamId(examId, labId, client);
        }

        if (report) {
          const latestRevision = await findLatestReportRevisionByExamId(examId, labId, client);
          if (reportSnapshotChanged(report, latestRevision)) {
            createdRevision = await createReportRevision({
              laboratory_id: labId,
              exam_id: examId,
              report_id: report.id,
              actor_user_id: auditContext.userId,
              actor_session_id: auditContext.sessionId,
              request_id: auditContext.requestId,
              snapshot_reason: 'validation',
              ...report,
            }, client);
          }
        }

        await appendAuditEvent({
          laboratory_id: labId,
          actor_user_id: auditContext.userId,
          actor_session_id: auditContext.sessionId,
          request_id: auditContext.requestId,
          event_type: 'exam_validated',
          target_type: 'exam',
          target_id: updatedExam.id,
          ip_address: auditContext.ipAddress,
          user_agent: auditContext.userAgent,
          metadata: {
            previous_status: exam.status,
            next_status: 'completed',
            revision_created: Boolean(createdRevision),
            report_revision_id: createdRevision?.id ?? null,
            snapshot_reason: 'validation',
          },
        }, client);
      }

      if (updatePayload.status === 'in_progress' && exam.status === 'completed') {
        updatedExam = await clearResultIssuedDateForExam(examId, labId, client);

        await appendAuditEvent({
          laboratory_id: labId,
          actor_user_id: auditContext.userId,
          actor_session_id: auditContext.sessionId,
          request_id: auditContext.requestId,
          event_type: 'exam_reopened',
          target_type: 'exam',
          target_id: updatedExam.id,
          ip_address: auditContext.ipAddress,
          user_agent: auditContext.userAgent,
          metadata: {
            previous_status: exam.status,
            next_status: 'in_progress',
            result_issued_date_cleared: true,
          },
        }, client);
      }

      return { updatedExam };
    }, {
      context: buildDbPolicyContext(req),
    });

    if (result.error === 'EXAM_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Prélèvement introuvable.' });
    }

    if (result.error === 'VALIDATED_EXAM_LOCKED') {
      return res.status(403).json({
        success: false,
        message: 'Ce prélèvement est déjà validé. Rouvrez le dossier avant toute correction.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Prélèvement mis à jour.',
      data: result.updatedExam,
    });
  } catch (error) {
    return next(error);
  }
}
