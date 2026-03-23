import {
  findExamById,
  findReportByExamId,
  createEmptyReportForExamId,
  updateReportByExamId as updateReportByExamIdQuery,
} from '../db/queries.js';

export async function getReportByExamId(req, res, next) {
  try {
    const examId = Number(req.params.examId);

    const exam = await findExamById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const report = await findReportByExamId(examId);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    return res.status(200).json({ success: true, data: report });
  } catch (error) {
    return next(error);
  }
}

export async function updateReportByExamId(req, res, next) {
  try {
    const examId = Number(req.params.examId);

    const exam = await findExamById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    let report = await findReportByExamId(examId);
    if (!report) {
      await createEmptyReportForExamId(examId);
      report = await findReportByExamId(examId);
    }

    if (!report) {
      return res.status(500).json({ success: false, message: 'Unable to initialize report' });
    }

    const updatedReport = await updateReportByExamIdQuery(examId, req.body);

    return res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      data: updatedReport,
    });
  } catch (error) {
    return next(error);
  }
}
