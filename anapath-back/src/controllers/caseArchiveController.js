import {
  findCaseArchivePreviewByExamId,
  findExamById,
  searchCaseArchive,
} from '../db/queries.js';
import { resolveLaboratoryId } from '../utils/requestContext.js';

function normalizeSourceKeywords(value) {
  if (Array.isArray(value)) {
    return [...new Set(
      value
        .map((keyword) => String(keyword).trim().toLowerCase())
        .filter(Boolean)
    )];
  }

  if (typeof value === 'string') {
    return [...new Set(
      value
        .split(',')
        .map((keyword) => keyword.trim().toLowerCase())
        .filter(Boolean)
    )];
  }

  return [];
}

export async function getCaseArchiveSearch(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const query = req.validated?.query ?? req.query;
    const {
      exam_type,
      date_from,
      date_to,
      section = 'all',
      limit = 20,
    } = query;

    let sourceExamId;
    let sourceExamType = null;
    let sourceKeywords = [];

    if (query.source_exam_id !== undefined) {
      sourceExamId = query.source_exam_id;

      const sourceExam = await findExamById(sourceExamId, labId);

      if (!sourceExam) {
        return res.status(404).json({
          success: false,
          message: 'Prélèvement source introuvable.',
        });
      }

      sourceExamType = sourceExam.exam_type ?? null;
      sourceKeywords = normalizeSourceKeywords(sourceExam.diagnosis_keywords);
    }

    const results = await searchCaseArchive({
      laboratory_id: labId,
      q: query.q ?? '',
      section,
      exam_type,
      date_from,
      date_to,
      source_exam_id: sourceExamId,
      source_exam_type: sourceExamType,
      source_keywords: sourceKeywords,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getCaseArchivePreview(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const examId = req.validated?.params?.id;
    const preview = await findCaseArchivePreviewByExamId(labId, examId);

    if (!preview) {
      return res.status(404).json({
        success: false,
        message: 'Cas archivé introuvable.',
      });
    }

    return res.status(200).json({
      success: true,
      data: preview,
    });
  } catch (error) {
    return next(error);
  }
}
