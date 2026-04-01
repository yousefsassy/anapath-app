import { findExamById, searchCaseArchive } from '../db/queries.js';

const VALID_EXAM_TYPES = ['histology', 'cytology'];
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
        message: `Section invalide. Valeurs acceptees : ${VALID_SECTIONS.join(', ')}`,
      });
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (date_from && !datePattern.test(date_from)) {
      return res.status(400).json({
        success: false,
        message: 'Format de date invalide. Utilisez YYYY-MM-DD.',
      });
    }

    if (date_to && !datePattern.test(date_to)) {
      return res.status(400).json({
        success: false,
        message: 'Format de date invalide. Utilisez YYYY-MM-DD.',
      });
    }

    if (date_from && date_to && date_from > date_to) {
      return res.status(400).json({
        success: false,
        message: 'La date de début doit être antérieure ou égale à la date de fin.',
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
      sourceExamId = Number(req.query.source_exam_id);

      if (!Number.isInteger(sourceExamId) || sourceExamId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Identifiant du prélèvement source invalide.',
        });
      }

      const sourceExam = await findExamById(sourceExamId);

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
      laboratory_id: 1,
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
