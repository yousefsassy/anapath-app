import {
  findExamById,
  findReportByExamId,
  createEmptyReportForExamId,
  updateReportByExamId as updateReportByExamIdQuery,
} from '../db/queries.js';
import { parsePositiveInteger } from '../utils/requestValidation.js';
import { resolveLaboratoryId } from '../utils/requestContext.js';

export async function getReportByExamId(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const examId = parsePositiveInteger(req.params.examId);
    if (!examId) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant prélèvement invalide.',
      });
    }

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
    const examId = parsePositiveInteger(req.params.examId);
    if (!examId) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant prélèvement invalide.',
      });
    }

    const exam = await findExamById(examId, labId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Prélèvement introuvable.' });
    }

    if (exam.status === 'completed') {
      return res.status(403).json({
        success: false,
        message: 'Ce compte rendu est verrouillé. Le prélèvement a été validé.',
      });
    }

    let report = await findReportByExamId(examId, labId);
    if (!report) {
      await createEmptyReportForExamId(examId, labId);
      report = await findReportByExamId(examId, labId);
    }

    if (!report) {
      return res.status(500).json({
        success: false,
        message: "Impossible d'initialiser le compte rendu.",
      });
    }

    const updatedReport = await updateReportByExamIdQuery(examId, req.body, labId);

    return res.status(200).json({
      success: true,
      message: 'Compte rendu mis à jour.',
      data: updatedReport,
    });
  } catch (error) {
    return next(error);
  }
}
