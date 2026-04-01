import {
  appendAuditEvent,
  createUserSession,
  findActiveUserSessionByTokenHash,
  findUserByEmail,
  revokeUserSessionByTokenHash,
} from '../db/queries.js';
import { withDbTransaction } from '../config/database.js';
import { SESSION_DURATION_MS } from '../config/security.js';
import { applyDbPolicyContext } from '../utils/dbPolicyContext.js';
import { verifyPassword } from '../utils/passwordSecurity.js';
import { getRequestLogger } from '../utils/logger.js';
import { buildAuditRequestContext } from '../utils/auditTrail.js';
import {
  clearSessionCookie,
  generateSessionToken,
  hashSessionToken,
  readSessionTokenFromRequest,
  setSessionCookie,
} from '../utils/sessionCookie.js';

function buildAuthUserPayload(user) {
  return {
    id: user.id ?? user.userId ?? user.user_id,
    laboratory_id: user.laboratory_id ?? user.laboratoryId,
    email: user.email,
    role: user.role,
    full_name: user.full_name ?? user.fullName ?? null,
  };
}

export async function login(req, res, next) {
  const email = req.validated?.body?.email ?? String(req.body?.email || '').trim().toLowerCase();
  const password = req.validated?.body?.password ?? String(req.body?.password || '');
  const log = getRequestLogger(req);

  try {
    const user = await findUserByEmail(email);
    const passwordIsValid = user
      ? await verifyPassword(password, user.password_hash)
      : false;

    if (!user || !passwordIsValid) {
      const auditContext = buildAuditRequestContext(req, {
        laboratoryId: user?.laboratory_id ?? null,
        userId: user?.id ?? null,
      });

      await withDbTransaction(async (client) => {
        await appendAuditEvent({
          laboratory_id: auditContext.laboratoryId,
          actor_user_id: auditContext.userId,
          actor_session_id: null,
          request_id: auditContext.requestId,
          event_type: 'auth_login_failed',
          target_type: 'auth',
          target_id: auditContext.userId,
          ip_address: auditContext.ipAddress,
          user_agent: auditContext.userAgent,
          metadata: {
            reason: 'invalid_credentials',
            identity_known: Boolean(user),
          },
        }, client);
      }, {
        context: auditContext,
      });

      log.warn('auth_login_failed', {
        reason: 'invalid_credentials',
        email,
      });
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides.',
      });
    }

    const sessionToken = generateSessionToken();
    const tokenHash = hashSessionToken(sessionToken);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    const auditContext = buildAuditRequestContext(req, {
      laboratoryId: user.laboratory_id,
      userId: user.id,
    });

    await withDbTransaction(async (client) => {
      const session = await createUserSession({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        ip_address: auditContext.ipAddress,
        user_agent: auditContext.userAgent,
      }, client);

      await applyDbPolicyContext(client, {
        ...auditContext,
        sessionId: session?.id ?? null,
      });

      await appendAuditEvent({
        laboratory_id: user.laboratory_id,
        actor_user_id: user.id,
        actor_session_id: session?.id ?? null,
        request_id: auditContext.requestId,
        event_type: 'auth_login_succeeded',
        target_type: 'session',
        target_id: session?.id ?? null,
        ip_address: auditContext.ipAddress,
        user_agent: auditContext.userAgent,
        metadata: {
          role: user.role,
        },
      }, client);
    }, {
      context: auditContext,
    });

    setSessionCookie(res, sessionToken, expiresAt);
    log.info('auth_login_succeeded', {
      email: user.email,
      user_id: user.id,
      laboratory_id: user.laboratory_id,
      role: user.role,
    });

    return res.status(200).json({
      success: true,
      message: 'Connexion réussie.',
      data: buildAuthUserPayload(user),
    });
  } catch (error) {
    return next(error);
  }
}

export async function logout(req, res, next) {
  const log = getRequestLogger(req);

  try {
    const sessionToken = readSessionTokenFromRequest(req);
    const tokenHash = sessionToken ? hashSessionToken(sessionToken) : null;

    await withDbTransaction(async (client) => {
      let session = null;
      let revokedSession = null;

      if (tokenHash) {
        session = await findActiveUserSessionByTokenHash(tokenHash, client);

        if (session) {
          await applyDbPolicyContext(client, {
            laboratoryId: session.laboratory_id,
            userId: session.user_id,
            sessionId: session.session_id,
            requestId: req.requestId ?? null,
          });
        }

        revokedSession = await revokeUserSessionByTokenHash(tokenHash, client);
      }

      const auditContext = buildAuditRequestContext(req, {
        laboratoryId: session?.laboratory_id ?? null,
        userId: session?.user_id ?? null,
        sessionId: session?.session_id ?? null,
      });

      await appendAuditEvent({
        laboratory_id: auditContext.laboratoryId,
        actor_user_id: auditContext.userId,
        actor_session_id: auditContext.sessionId,
        request_id: auditContext.requestId,
        event_type: 'auth_logout_succeeded',
        target_type: 'session',
        target_id: session?.session_id ?? null,
        ip_address: auditContext.ipAddress,
        user_agent: auditContext.userAgent,
        metadata: {
          credential_present: Boolean(sessionToken),
          active_login_found: Boolean(session),
          revocation_applied: Boolean(revokedSession),
        },
      }, client);
    });

    clearSessionCookie(res);
    log.info('auth_logout_succeeded', {
      had_session_cookie: Boolean(sessionToken),
    });

    return res.status(200).json({
      success: true,
      message: 'Déconnexion réussie.',
      data: null,
    });
  } catch (error) {
    return next(error);
  }
}

export function getSession(req, res) {
  return res.status(200).json({
    success: true,
    data: buildAuthUserPayload(req.auth),
  });
}
