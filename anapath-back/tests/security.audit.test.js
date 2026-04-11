import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import http from 'node:http';
import test, { after, before } from 'node:test';
import app from '../src/app.js';
import pool, { query } from '../src/config/database.js';
import { createPasswordHash } from '../src/utils/passwordSecurity.js';

let server;
let baseUrl = '';
let labId = null;
let userId = null;
let patientId = null;
let savedExamId = null;
let validationExamId = null;
let sessionCookie = '';

const clinician = {
  email: `audit-admin-${randomUUID().slice(0, 8)}@anapath.local`,
  password: 'AuditAdminPassword123!',
};

async function apiRequest(method, path, { body, cookie = sessionCookie, ip = '127.0.0.1' } = {}) {
  const response = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      'X-Forwarded-For': ip,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  return {
    status: response.status,
    payload,
    cookie: response.headers.get('set-cookie')?.split(';')[0] || '',
  };
}

async function findLatestAuditEvent(eventType, laboratoryId = labId) {
  const result = await query(
    `SELECT *
     FROM audit_events
     WHERE event_type = $1
       AND laboratory_id IS NOT DISTINCT FROM $2
     ORDER BY id DESC
     LIMIT 1`,
    [eventType, laboratoryId]
  );

  return result.rows[0] || null;
}

before(async () => {
  const createdLab = await query(
    `INSERT INTO laboratories (name, address, phone, email)
     VALUES ($1, '', '', '')
     RETURNING id`,
    [`P3 audit lab ${randomUUID()}`]
  );
  labId = createdLab.rows[0].id;

  const createdUser = await query(
    `INSERT INTO users (laboratory_id, full_name, email, password_hash, role)
     VALUES ($1, 'Audit Admin', $2, $3, 'admin')
     RETURNING id`,
    [labId, clinician.email, await createPasswordHash(clinician.password)]
  );
  userId = createdUser.rows[0].id;

  const patientResult = await query(
    `INSERT INTO patients (
      laboratory_id, first_name, last_name, age, sex, phone, birth_date, general_history
    ) VALUES ($1, 'Audit', 'P3', 54, 'F', '0799990000', '1972-04-01', 'Patiente de test audit.')
    RETURNING id`,
    [labId]
  );
  patientId = patientResult.rows[0].id;

  const savedExamResult = await query(
    `INSERT INTO exams (
      laboratory_id,
      patient_id,
      exam_number,
      exam_type,
      clinic_name,
      requesting_doctor,
      requested_date,
      registered_date,
      result_issued_date,
      sample_nature,
      exam_history,
      diagnosis_keywords,
      status,
      urgent
    ) VALUES (
      $1,
      $2,
      $3,
      'histology',
      'Clinique Audit',
      'Dr Audit',
      '2026-04-01',
      '2026-04-01',
      NULL,
      'Biopsie pour test audit',
      'Contexte audit sauvegarde',
      ARRAY['audit', 'save'],
      'in_progress',
      false
    )
    RETURNING id`,
    [labId, patientId, `AS-${randomUUID().slice(0, 8)}`]
  );
  savedExamId = savedExamResult.rows[0].id;

  await query(
    `INSERT INTO reports (exam_id, clinical_info, macroscopy, microscopy, conclusion)
     VALUES ($1, '', '', '', '')`,
    [savedExamId]
  );

  const validationExamResult = await query(
    `INSERT INTO exams (
      laboratory_id,
      patient_id,
      exam_number,
      exam_type,
      clinic_name,
      requesting_doctor,
      requested_date,
      registered_date,
      result_issued_date,
      sample_nature,
      exam_history,
      diagnosis_keywords,
      status,
      urgent
    ) VALUES (
      $1,
      $2,
      $3,
      'histology',
      'Clinique Audit',
      'Dr Audit',
      '2026-04-02',
      '2026-04-02',
      NULL,
      'Biopsie pour validation',
      'Contexte audit validation',
      ARRAY['audit', 'validation'],
      'in_progress',
      false
    )
    RETURNING id`,
    [labId, patientId, `AV-${randomUUID().slice(0, 8)}`]
  );
  validationExamId = validationExamResult.rows[0].id;

  await query(
    `INSERT INTO reports (exam_id, clinical_info, macroscopy, microscopy, conclusion)
     VALUES (
       $1,
       'RC de validation finale.',
       'Macroscopie de validation.',
       'Microscopie de validation.',
       'Conclusion de validation definitive.'
     )`,
    [validationExamId]
  );

  server = http.createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error("Impossible d'initialiser le serveur de test.");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (labId) {
    await query('DELETE FROM report_templates WHERE laboratory_id = $1', [labId]);
    await query('DELETE FROM exam_sequences WHERE laboratory_id = $1', [labId]);
    await query('DELETE FROM users WHERE laboratory_id = $1', [labId]);
    await query('DELETE FROM patients WHERE laboratory_id = $1', [labId]);
    await query('DELETE FROM laboratories WHERE id = $1', [labId]);
  }

  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  await pool.end();
});

test('P3 audit ledger and report revision snapshots are recorded on critical workflows', async (t) => {
  await t.test('failed login writes an audit event without trusting spoofed client IPs', async () => {
    const response = await apiRequest('POST', '/auth/login', {
      cookie: '',
      ip: '203.0.113.10',
      body: {
        email: clinician.email,
        password: 'mot-de-passe-invalide',
      },
    });

    assert.equal(response.status, 401);

    const auditEvent = await findLatestAuditEvent('auth_login_failed');
    assert.ok(auditEvent);
    assert.equal(auditEvent.actor_user_id, userId);
    assert.equal(auditEvent.target_type, 'auth');
    assert.equal(auditEvent.target_id, userId);
    assert.equal(auditEvent.metadata.reason, 'invalid_credentials');
    assert.equal(auditEvent.metadata.identity_known, true);
    assert.ok(auditEvent.ip_address);
    assert.notEqual(auditEvent.ip_address, '203.0.113.10');
  });

  await t.test('successful login writes a session audit event and returns the normal envelope', async () => {
    const response = await apiRequest('POST', '/auth/login', {
      cookie: '',
      ip: '203.0.113.11',
      body: {
        email: clinician.email,
        password: clinician.password,
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.payload.success, true);
    assert.ok(response.cookie);
    sessionCookie = response.cookie;

    const auditEvent = await findLatestAuditEvent('auth_login_succeeded');
    assert.ok(auditEvent);
    assert.equal(auditEvent.actor_user_id, userId);
    assert.equal(auditEvent.target_type, 'session');
    assert.ok(auditEvent.target_id);
    assert.equal(auditEvent.actor_session_id, auditEvent.target_id);
    assert.equal(auditEvent.metadata.role, 'admin');
    assert.ok(auditEvent.ip_address);
    assert.notEqual(auditEvent.ip_address, '203.0.113.11');
  });

  await t.test('explicit report save creates one revision snapshot and deduplicates identical saves', async () => {
    const reportDraft = {
      clinical_info: 'Renseignement clinique de sauvegarde.',
      macroscopy: 'Macroscopie apres sauvegarde.',
      microscopy: 'Microscopie apres sauvegarde.',
      conclusion: 'Conclusion apres sauvegarde.',
    };

    const firstSaveResponse = await apiRequest('PUT', `/reports/${savedExamId}`, {
      body: reportDraft,
    });
    assert.equal(firstSaveResponse.status, 200);
    assert.equal(firstSaveResponse.payload.success, true);

    const secondSaveResponse = await apiRequest('PUT', `/reports/${savedExamId}`, {
      body: reportDraft,
    });
    assert.equal(secondSaveResponse.status, 200);
    assert.equal(secondSaveResponse.payload.success, true);

    const revisionResult = await query(
      `SELECT *
       FROM report_revisions
       WHERE exam_id = $1
       ORDER BY id ASC`,
      [savedExamId]
    );

    assert.equal(revisionResult.rows.length, 1);
    assert.equal(revisionResult.rows[0].snapshot_reason, 'save');
    assert.equal(revisionResult.rows[0].conclusion, reportDraft.conclusion);
    assert.equal(revisionResult.rows[0].actor_user_id, userId);

    const auditResult = await query(
      `SELECT *
       FROM audit_events
       WHERE laboratory_id = $1
         AND event_type = 'report_saved'
       ORDER BY id ASC`,
      [labId]
    );

    assert.equal(auditResult.rows.length, 2);
    assert.equal(auditResult.rows[0].target_type, 'report');
    assert.equal(auditResult.rows[0].metadata.revision_created, true);
    assert.equal(auditResult.rows[1].metadata.revision_created, false);
  });

  await t.test('validation creates a final snapshot when no prior saved revision exists', async () => {
    const response = await apiRequest('PUT', `/exams/${validationExamId}`, {
      body: {
        status: 'completed',
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.payload.success, true);
    assert.equal(response.payload.data.status, 'completed');

    const revisions = await query(
      `SELECT *
       FROM report_revisions
       WHERE exam_id = $1
       ORDER BY id ASC`,
      [validationExamId]
    );

    assert.equal(revisions.rows.length, 1);
    assert.equal(revisions.rows[0].snapshot_reason, 'validation');
    assert.equal(revisions.rows[0].clinical_info, 'RC de validation finale.');
    assert.equal(revisions.rows[0].conclusion, 'Conclusion de validation definitive.');

    const auditEvent = await query(
      `SELECT *
       FROM audit_events
       WHERE laboratory_id = $1
         AND event_type = 'exam_validated'
         AND target_id = $2
       ORDER BY id DESC
       LIMIT 1`,
      [labId, validationExamId]
    );

    assert.equal(auditEvent.rows.length, 1);
    assert.equal(auditEvent.rows[0].metadata.previous_status, 'in_progress');
    assert.equal(auditEvent.rows[0].metadata.next_status, 'completed');
    assert.equal(auditEvent.rows[0].metadata.revision_created, true);
    assert.equal(auditEvent.rows[0].metadata.snapshot_reason, 'validation');
  });

  await t.test('reopening a validated exam records an audit event and clears the issued date', async () => {
    const response = await apiRequest('PUT', `/exams/${validationExamId}`, {
      body: {
        status: 'in_progress',
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.payload.success, true);
    assert.equal(response.payload.data.status, 'in_progress');
    assert.equal(response.payload.data.result_issued_date, null);

    const auditEvent = await query(
      `SELECT *
       FROM audit_events
       WHERE laboratory_id = $1
         AND event_type = 'exam_reopened'
         AND target_id = $2
       ORDER BY id DESC
       LIMIT 1`,
      [labId, validationExamId]
    );

    assert.equal(auditEvent.rows.length, 1);
    assert.equal(auditEvent.rows[0].metadata.previous_status, 'completed');
    assert.equal(auditEvent.rows[0].metadata.next_status, 'in_progress');
    assert.equal(auditEvent.rows[0].metadata.result_issued_date_cleared, true);
  });

  await t.test('restoring a prior report revision records audit metadata and a restore snapshot', async () => {
    const firstRevision = await query(
      `SELECT id
       FROM report_revisions
       WHERE exam_id = $1
       ORDER BY id ASC
       LIMIT 1`,
      [savedExamId]
    );
    const revisionId = firstRevision.rows[0].id;

    const changedDraftResponse = await apiRequest('PUT', `/reports/${savedExamId}`, {
      body: {
        clinical_info: 'Renseignement clinique modifie avant restauration.',
        macroscopy: 'Macroscopie modifiee.',
        microscopy: 'Microscopie modifiee.',
        conclusion: 'Conclusion modifiee avant restauration.',
      },
    });
    assert.equal(changedDraftResponse.status, 200);

    const restoreResponse = await apiRequest(
      'POST',
      `/reports/${savedExamId}/revisions/${revisionId}/restore`,
    );
    assert.equal(restoreResponse.status, 200);
    assert.equal(restoreResponse.payload.success, true);
    assert.equal(restoreResponse.payload.data.conclusion, 'Conclusion apres sauvegarde.');

    const revisions = await query(
      `SELECT *
       FROM report_revisions
       WHERE exam_id = $1
       ORDER BY id ASC`,
      [savedExamId]
    );

    assert.equal(revisions.rows.length, 3);
    assert.equal(revisions.rows[2].snapshot_reason, 'restore');
    assert.equal(revisions.rows[2].conclusion, 'Conclusion apres sauvegarde.');
    assert.equal(revisions.rows[2].actor_user_id, userId);

    const auditEvent = await query(
      `SELECT *
       FROM audit_events
       WHERE laboratory_id = $1
         AND event_type = 'report_restored'
         AND target_type = 'report'
       ORDER BY id DESC
       LIMIT 1`,
      [labId]
    );

    assert.equal(auditEvent.rows.length, 1);
    assert.equal(auditEvent.rows[0].metadata.exam_id, savedExamId);
    assert.equal(auditEvent.rows[0].metadata.source_report_revision_id, revisionId);
    assert.equal(auditEvent.rows[0].metadata.snapshot_reason, 'restore');
    assert.equal(auditEvent.rows[0].metadata.restored_snapshot_reason, 'save');
  });

  await t.test('logout revokes the session and records the logout audit event', async () => {
    const response = await apiRequest('POST', '/auth/logout');

    assert.equal(response.status, 200);
    assert.equal(response.payload.success, true);

    const auditEvent = await findLatestAuditEvent('auth_logout_succeeded');
    assert.ok(auditEvent);
    assert.equal(auditEvent.actor_user_id, userId);
    assert.equal(auditEvent.target_type, 'session');
    assert.equal(auditEvent.metadata.credential_present, true);
    assert.equal(auditEvent.metadata.active_login_found, true);
    assert.equal(auditEvent.metadata.revocation_applied, true);

    sessionCookie = '';
  });
});
