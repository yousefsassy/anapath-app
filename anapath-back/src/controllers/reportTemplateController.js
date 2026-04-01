import {
  findAllTemplatesByLabId,
  createTemplate,
  updateTemplateById,
  deleteTemplateById,
} from '../db/queries.js';
import { resolveLaboratoryId } from '../utils/requestContext.js';

export async function getTemplates(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const templates = await findAllTemplatesByLabId(labId);
    return res.status(200).json({ success: true, data: templates });
  } catch (error) {
    return next(error);
  }
}

export async function createTemplateHandler(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const body = req.validated?.body ?? req.body;

    const template = await createTemplate({
      laboratory_id: labId,
      name: body.name,
      clinical_info: body.clinical_info,
      macroscopy: body.macroscopy,
      microscopy: body.microscopy,
      conclusion: body.conclusion,
    });

    return res.status(201).json({
      success: true,
      message: 'Modèle créé avec succès.',
      data: template,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateTemplateHandler(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const templateId = req.validated?.params?.id;
    const body = req.validated?.body ?? req.body;

    const updated = await updateTemplateById(templateId, labId, {
      name: body.name,
      clinical_info: body.clinical_info,
      macroscopy: body.macroscopy,
      microscopy: body.microscopy,
      conclusion: body.conclusion,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Modèle introuvable.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Modèle mis à jour.',
      data: updated,
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteTemplateHandler(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const templateId = req.validated?.params?.id;
    const deleted = await deleteTemplateById(templateId, labId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Modèle introuvable.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Modèle supprimé.',
      data: deleted,
    });
  } catch (error) {
    return next(error);
  }
}
