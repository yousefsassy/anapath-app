import {
  appendAuditEvent,
  createReportRevision,
  findExamById,
  findReportByExamId,
  createEmptyReportForExamId,
  findLatestReportRevisionByExamId,
  updateReportByExamId as updateReportByExamIdQuery,
} from '../db/queries.js';
import { withDbTransaction } from '../config/database.js';
import { buildDbPolicyContext } from '../utils/dbPolicyContext.js';
import { resolveLaboratoryId } from '../utils/requestContext.js';
import {
  buildAuditRequestContext,
  reportSnapshotChanged,
} from '../utils/auditTrail.js';

export async function getReportByExamId(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const examId = req.validated?.params?.examId;

    const exam = await findExamById(examId, labId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Prélèvement introuvable.' });
    }

    const report = await findReportByExamId(examId, labId);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Compte rendu introuvable.' });
    }

    return res.status(200).json({ success: true, data: report });
  } catch (error) {
    return next(error);
  }
}

export async function updateReportByExamId(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const examId = req.validated?.params?.examId;
    const body = req.validated?.body ?? req.body;
    const auditContext = buildAuditRequestContext(req, {
      laboratoryId: labId,
    });

    const result = await withDbTransaction(async (client) => {
      const exam = await findExamById(examId, labId, client);
      if (!exam) {
        return { error: 'EXAM_NOT_FOUND' };
      }

      if (exam.status === 'completed') {
        return { error: 'REPORT_LOCKED' };
      }

      let report = await findReportByExamId(examId, labId, client);
      if (!report) {
        await createEmptyReportForExamId(examId, labId, client);
        report = await findReportByExamId(examId, labId, client);
      }

      if (!report) {
        return { error: 'REPORT_INIT_FAILED' };
      }

      const updatedReport = await updateReportByExamIdQuery(examId, body, labId, client);
      const latestRevision = await findLatestReportRevisionByExamId(examId, labId, client);

      let createdRevision = null;
      if (reportSnapshotChanged(updatedReport, latestRevision)) {
        createdRevision = await createReportRevision({
          laboratory_id: labId,
          exam_id: examId,
          report_id: updatedReport.id,
          actor_user_id: auditContext.userId,
          actor_session_id: auditContext.sessionId,
          request_id: auditContext.requestId,
          snapshot_reason: 'save',
          ...updatedReport,
        }, client);
      }

      await appendAuditEvent({
        laboratory_id: labId,
        actor_user_id: auditContext.userId,
        actor_session_id: auditContext.sessionId,
        request_id: auditContext.requestId,
        event_type: 'report_saved',
        target_type: 'report',
        target_id: updatedReport.id,
        ip_address: auditContext.ipAddress,
        user_agent: auditContext.userAgent,
        metadata: {
          exam_id: examId,
          revision_created: Boolean(createdRevision),
          report_revision_id: createdRevision?.id ?? null,
          snapshot_reason: 'save',
        },
      }, client);

      return { updatedReport };
    }, {
      context: buildDbPolicyContext(req),
    });

    if (result.error === 'EXAM_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Prélèvement introuvable.' });
    }

    if (result.error === 'REPORT_LOCKED') {
      return res.status(403).json({
        success: false,
        message: 'Ce compte rendu est verrouillé. Le prélèvement a été validé.',
      });
    }

    if (result.error === 'REPORT_INIT_FAILED') {
      return res.status(500).json({
        success: false,
        message: "Impossible d'initialiser le compte rendu.",
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Compte rendu mis à jour.',
      data: result.updatedReport,
    });
  } catch (error) {
    return next(error);
  }
}
