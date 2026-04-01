import {
  findActiveUserSessionByTokenHash,
  touchUserSession,
} from '../db/queries.js';
import {
  clearSessionCookie,
  hashSessionToken,
  readSessionTokenFromRequest,
} from '../utils/sessionCookie.js';
import { getRequestLogger } from '../utils/logger.js';

function buildUnauthorizedResponse(res) {
  clearSessionCookie(res);
  return res.status(401).json({
    success: false,
    message: 'Authentification requise.',
  });
}

export async function requireAuth(req, res, next) {
  try {
    const log = getRequestLogger(req);
    const sessionToken = readSessionTokenFromRequest(req);
    if (!sessionToken) {
      log.warn('auth_session_missing');
      return buildUnauthorizedResponse(res);
    }

    const tokenHash = hashSessionToken(sessionToken);
    const session = await findActiveUserSessionByTokenHash(tokenHash);

    if (!session) {
      log.warn('auth_session_invalid');
      return buildUnauthorizedResponse(res);
    }

    await touchUserSession(session.session_id);

    req.auth = {
      userId: session.user_id,
      laboratoryId: session.laboratory_id,
      role: session.role,
      email: session.email,
      fullName: session.full_name,
      sessionId: session.session_id,
      tokenHash,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}
