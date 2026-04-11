import {
  appendAuditEvent,
  createReportRevision,
  findReportRevisionById as findReportRevisionByIdQuery,
  findReportRevisionsByExamId as findReportRevisionsByExamIdQuery,
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

export async function getReportRevisionsByExamId(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const examId = req.validated?.params?.examId;

    const exam = await findExamById(examId, labId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Prélèvement introuvable.' });
    }

    const revisions = await findReportRevisionsByExamIdQuery(examId, labId);
    return res.status(200).json({ success: true, data: revisions });
  } catch (error) {
    return next(error);
  }
}

export async function getReportRevisionById(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const examId = req.validated?.params?.examId;
    const revisionId = req.validated?.params?.revisionId;

    const exam = await findExamById(examId, labId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Prélèvement introuvable.' });
    }

    const revision = await findReportRevisionByIdQuery(examId, revisionId, labId);
    if (!revision) {
      return res.status(404).json({ success: false, message: 'Version introuvable.' });
    }

    return res.status(200).json({ success: true, data: revision });
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

export async function restoreReportRevisionById(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const examId = req.validated?.params?.examId;
    const revisionId = req.validated?.params?.revisionId;
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

      const revision = await findReportRevisionByIdQuery(examId, revisionId, labId, client);
      if (!revision) {
        return { error: 'REVISION_NOT_FOUND' };
      }

      let report = await findReportByExamId(examId, labId, client);
      if (!report) {
        await createEmptyReportForExamId(examId, labId, client);
        report = await findReportByExamId(examId, labId, client);
      }

      if (!report) {
        return { error: 'REPORT_INIT_FAILED' };
      }

      const updatedReport = await updateReportByExamIdQuery(examId, revision, labId, client);
      const createdRevision = await createReportRevision({
        laboratory_id: labId,
        exam_id: examId,
        report_id: updatedReport.id,
        actor_user_id: auditContext.userId,
        actor_session_id: auditContext.sessionId,
        request_id: auditContext.requestId,
        snapshot_reason: 'restore',
        ...updatedReport,
      }, client);

      await appendAuditEvent({
        laboratory_id: labId,
        actor_user_id: auditContext.userId,
        actor_session_id: auditContext.sessionId,
        request_id: auditContext.requestId,
        event_type: 'report_restored',
        target_type: 'report',
        target_id: updatedReport.id,
        ip_address: auditContext.ipAddress,
        user_agent: auditContext.userAgent,
        metadata: {
          exam_id: examId,
          source_report_revision_id: revision.id,
          restored_snapshot_reason: revision.snapshot_reason,
          report_revision_id: createdRevision?.id ?? null,
          snapshot_reason: 'restore',
        },
      }, client);

      return { updatedReport };
    }, {
      context: buildDbPolicyContext(req),
    });

    if (result.error === 'EXAM_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Prélèvement introuvable.' });
    }

    if (result.error === 'REVISION_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Version introuvable.' });
    }

    if (result.error === 'REPORT_LOCKED') {
      return res.status(403).json({
        success: false,
        message: 'Ce compte rendu est verrouillé. Rouvrez le dossier avant toute restauration.',
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
      message: 'Version restaurée.',
      data: result.updatedReport,
    });
  } catch (error) {
    return next(error);
  }
}
