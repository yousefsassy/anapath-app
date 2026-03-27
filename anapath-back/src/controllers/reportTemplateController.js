import {
  findAllTemplatesByLabId,
  createTemplate,
  updateTemplateById,
  deleteTemplateById,
} from '../db/queries.js';

function validateTemplatePayload(name, fields) {
  if (!name || !name.trim()) {
    return 'Le nom du modèle est obligatoire.';
  }
  const { clinical_info = '', macroscopy = '', microscopy = '', conclusion = '' } = fields;
  const hasContent =
    clinical_info.trim() || macroscopy.trim() || microscopy.trim() || conclusion.trim();
  if (!hasContent) {
    return 'Le modèle doit contenir au moins un champ non vide.';
  }
  return null;
}

export async function getTemplates(req, res, next) {
  try {
    const labId = Number(req.query.laboratory_id) || 1;
    const templates = await findAllTemplatesByLabId(labId);
    return res.status(200).json({ success: true, data: templates });
  } catch (error) {
    return next(error);
  }
}

export async function createTemplateHandler(req, res, next) {
  try {
    const { name, clinical_info, macroscopy, microscopy, conclusion, laboratory_id } = req.body;
    const validationError = validateTemplatePayload(name, {
      clinical_info,
      macroscopy,
      microscopy,
      conclusion,
    });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const template = await createTemplate({
      laboratory_id: Number(laboratory_id) || 1,
      name: name.trim(),
      clinical_info: clinical_info || '',
      macroscopy: macroscopy || '',
      microscopy: microscopy || '',
      conclusion: conclusion || '',
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
    const templateId = Number(req.params.id);
    const { name, clinical_info, macroscopy, microscopy, conclusion } = req.body;

    const validationError = validateTemplatePayload(name, {
      clinical_info,
      macroscopy,
      microscopy,
      conclusion,
    });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const updated = await updateTemplateById(templateId, {
      name: name.trim(),
      clinical_info,
      macroscopy,
      microscopy,
      conclusion,
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
    const templateId = Number(req.params.id);
    const deleted = await deleteTemplateById(templateId);

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
