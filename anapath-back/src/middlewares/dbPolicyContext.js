import {
  buildDbPolicyContext,
  runWithDbPolicyContext,
} from '../utils/dbPolicyContext.js';

export function attachDbPolicyContext(req, res, next) {
  return runWithDbPolicyContext(buildDbPolicyContext(req), () => next());
}
