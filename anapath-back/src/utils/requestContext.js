import { parsePositiveInteger } from './requestValidation.js';

export function resolveLaboratoryId(req) {
  const rawHeaderValue = req.get('X-Laboratory-Id');
  return parsePositiveInteger(rawHeaderValue) ?? 1;
}
