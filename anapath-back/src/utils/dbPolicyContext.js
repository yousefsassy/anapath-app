import { AsyncLocalStorage } from 'node:async_hooks';

const dbPolicyContextStorage = new AsyncLocalStorage();

const DB_POLICY_SETTINGS = {
  laboratoryId: 'app.current_laboratory_id',
  userId: 'app.current_user_id',
  sessionId: 'app.current_session_id',
  requestId: 'app.current_request_id',
};

function normalizeDbPolicyValue(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  return String(value);
}

export function buildDbPolicyContext(req) {
  return {
    laboratoryId: req?.auth?.laboratoryId ?? null,
    userId: req?.auth?.userId ?? null,
    sessionId: req?.auth?.sessionId ?? null,
    requestId: req?.requestId ?? null,
  };
}

export function runWithDbPolicyContext(context, callback) {
  return dbPolicyContextStorage.run(context, callback);
}

export function getDbPolicyContext() {
  return dbPolicyContextStorage.getStore() || null;
}

export async function applyDbPolicyContext(client, context = {}) {
  for (const [key, settingName] of Object.entries(DB_POLICY_SETTINGS)) {
    await client.query(
      'SELECT set_config($1, $2, true)',
      [settingName, normalizeDbPolicyValue(context[key])]
    );
  }
}

export async function readDbPolicyContext(client) {
  const result = await client.query(
    `SELECT
       NULLIF(current_setting('app.current_laboratory_id', true), '') AS laboratory_id,
       NULLIF(current_setting('app.current_user_id', true), '') AS user_id,
       NULLIF(current_setting('app.current_session_id', true), '') AS session_id,
       NULLIF(current_setting('app.current_request_id', true), '') AS request_id`
  );

  return result.rows[0] || null;
}
