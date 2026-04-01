export function resolveLaboratoryId(req) {
  if (!req.auth?.laboratoryId) {
    const error = new Error("Contexte d'authentification introuvable.");
    error.status = 401;
    throw error;
  }

  return req.auth.laboratoryId;
}
