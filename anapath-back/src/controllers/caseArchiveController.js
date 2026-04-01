import {
  findCaseArchivePreviewByExamId,
  findExamById,
  searchCaseArchive,
} from '../db/queries.js';
import {
  VALID_EXAM_TYPES,
  parsePositiveInteger,
  validateDateRange,
} from '../utils/requestValidation.js';
import { resolveLaboratoryId } from '../utils/requestContext.js';

const VALID_SECTIONS = ['all', 'clinical_info', 'macroscopy', 'microscopy', 'conclusion'];
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

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
    const { exam_type, date_from, date_to, section = 'all' } = req.query;

    if (exam_type && !VALID_EXAM_TYPES.includes(exam_type)) {
      return res.status(400).json({
        success: false,
        message: `Type d'examen invalide. Valeurs acceptées : ${VALID_EXAM_TYPES.join(', ')}`,
      });
    }

    if (section && !VALID_SECTIONS.includes(section)) {
      return res.status(400).json({
        success: false,
        message: `Section invalide. Valeurs acceptées : ${VALID_SECTIONS.join(', ')}`,
      });
    }

    const dateRangeError = validateDateRange(date_from, date_to);
    if (dateRangeError) {
      return res.status(400).json({
        success: false,
        message: dateRangeError,
      });
    }

    let limit = DEFAULT_LIMIT;
    if (req.query.limit !== undefined) {
      limit = Number(req.query.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
        return res.status(400).json({
          success: false,
          message: `Limite invalide. Utilisez un entier compris entre 1 et ${MAX_LIMIT}.`,
        });
      }
    }

    let sourceExamId;
    let sourceExamType = null;
    let sourceKeywords = [];

    if (req.query.source_exam_id !== undefined) {
      sourceExamId = parsePositiveInteger(req.query.source_exam_id);

      if (!sourceExamId) {
        return res.status(400).json({
          success: false,
          message: 'Identifiant du prélèvement source invalide.',
        });
      }

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
      q: req.query.q?.trim() ?? '',
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
    const examId = parsePositiveInteger(req.params.id);

    if (!examId) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant du cas archivé invalide.',
      });
    }

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
