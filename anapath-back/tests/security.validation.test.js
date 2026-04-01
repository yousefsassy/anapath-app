import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import http from 'node:http';
import test, { after, before } from 'node:test';
import app from '../src/app.js';
import pool, { query, withDbTransaction } from '../src/config/database.js';
import { readDbPolicyContext } from '../src/utils/dbPolicyContext.js';
import { createPasswordHash } from '../src/utils/passwordSecurity.js';
import { redactForLogs } from '../src/utils/logger.js';

let server;
let baseUrl = '';
let labAId = null;
let labBId = null;
let patientAId = null;
let patientBId = null;
let examAId = null;
let sessionCookie = '';

const clinician = {
  email: 'validation-admin@anapath.local',
  password: 'ValidationAdmin123!',
};

async function apiRequest(method, path, { body, cookie = sessionCookie, ip = '127.0.0.10', headers = {} } = {}) {
  const response = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      'X-Forwarded-For': ip,
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  return {
    status: response.status,
    payload,
    requestId: response.headers.get('x-request-id'),
    cookie: response.headers.get('set-cookie')?.split(';')[0] || '',
  };
}

before(async () => {
  const createdLabA = await query(
    `INSERT INTO laboratories (name, address, phone, email)
     VALUES ($1, '', '', '')
     RETURNING id`,
    [`P2 validation lab A ${randomUUID()}`]
  );
  labAId = createdLabA.rows[0].id;

  const createdLabB = await query(
    `INSERT INTO laboratories (name, address, phone, email)
     VALUES ($1, '', '', '')
     RETURNING id`,
    [`P2 validation lab B ${randomUUID()}`]
  );
  labBId = createdLabB.rows[0].id;

  await query(
    `INSERT INTO users (laboratory_id, full_name, email, password_hash, role)
     VALUES ($1, 'Validation Admin', $2, $3, 'admin')`,
    [labAId, clinician.email, await createPasswordHash(clinician.password)]
  );

  const patientAResult = await query(
    `INSERT INTO patients (
      laboratory_id, first_name, last_name, age, sex, phone, birth_date, general_history
    ) VALUES ($1, 'Securite', 'Validation', 45, 'F', '0700001111', '1981-03-10', 'Patiente de test.')
    RETURNING id`,
    [labAId]
  );
  patientAId = patientAResult.rows[0].id;

  const patientBResult = await query(
    `INSERT INTO patients (
      laboratory_id, first_name, last_name, age, sex, phone, birth_date, general_history
    ) VALUES ($1, 'Isolation', 'Schema', 50, 'M', '0700002222', '1976-08-22', 'Patient de test.')
    RETURNING id`,
    [labBId]
  );
  patientBId = patientBResult.rows[0].id;

  const examResult = await query(
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
      'Clinique Validation',
      'Dr Validation',
      '2026-04-01',
      '2026-04-01',
      NULL,
      'Biopsie de validation',
      'Contexte de validation P2',
      ARRAY['validation', 'p2'],
      'in_progress',
      false
    )
    RETURNING id`,
    [labAId, patientAId, `VAL-${randomUUID()}`]
  );
  examAId = examResult.rows[0].id;

  await query(
    `INSERT INTO reports (exam_id, clinical_info, macroscopy, microscopy, conclusion)
     VALUES ($1, '', '', '', '')`,
    [examAId]
  );

  server = http.createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error("Impossible d'initialiser le serveur de test.");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;

  const loginResponse = await apiRequest('POST', '/auth/login', {
    body: {
      email: clinician.email,
      password: clinician.password,
    },
    cookie: '',
    ip: '172.20.0.10',
  });

  assert.equal(loginResponse.status, 200);
  assert.ok(loginResponse.cookie);
  sessionCookie = loginResponse.cookie;
});

after(async () => {
  if (labAId) {
    await query('DELETE FROM report_templates WHERE laboratory_id = $1', [labAId]);
    await query('DELETE FROM exam_sequences WHERE laboratory_id = $1', [labAId]);
    await query('DELETE FROM users WHERE laboratory_id = $1', [labAId]);
    await query('DELETE FROM patients WHERE laboratory_id = $1', [labAId]);
    await query('DELETE FROM laboratories WHERE id = $1', [labAId]);
  }

  if (labBId) {
    await query('DELETE FROM report_templates WHERE laboratory_id = $1', [labBId]);
    await query('DELETE FROM exam_sequences WHERE laboratory_id = $1', [labBId]);
    await query('DELETE FROM users WHERE laboratory_id = $1', [labBId]);
    await query('DELETE FROM patients WHERE laboratory_id = $1', [labBId]);
    await query('DELETE FROM laboratories WHERE id = $1', [labBId]);
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

test('P2 security validations, logging redaction, and DB integrity are enforced', async (t) => {
  await t.test('responses include a request id on both success and validation failure paths', async () => {
    const healthResponse = await apiRequest('GET', '/health', { cookie: '' });
    assert.equal(healthResponse.status, 200);
    assert.ok(healthResponse.requestId);

    const invalidPatientResponse = await apiRequest('POST', '/patients', {
      body: {
        first_name: 'Test',
        last_name: 'Invalide',
        age: 40,
        sex: 'F',
        birth_date: '1984-01-01',
        nickname: 'intrus',
      },
    });

    assert.equal(invalidPatientResponse.status, 400);
    assert.ok(invalidPatientResponse.requestId);
  });

  await t.test('unknown body keys are rejected on mutating routes', async () => {
    const response = await apiRequest('POST', '/patients', {
      body: {
        first_name: 'Lea',
        last_name: 'Schema',
        age: 31,
        sex: 'F',
        birth_date: '1995-04-01',
        nickname: 'inattendu',
      },
    });

    assert.equal(response.status, 400);
    assert.equal(response.payload.success, false);
  });

  await t.test('wrong body types are rejected before report persistence', async () => {
    const response = await apiRequest('PUT', `/reports/${examAId}`, {
      body: {
        clinical_info: '',
        macroscopy: '',
        microscopy: '',
        conclusion: 42,
      },
    });

    assert.equal(response.status, 400);
    assert.equal(response.payload.success, false);
  });

  await t.test('repeated query params are rejected as ambiguous input', async () => {
    const response = await apiRequest(
      'GET',
      '/exams?status=registered&status=completed'
    );

    assert.equal(response.status, 400);
    assert.equal(response.payload.success, false);
  });

  await t.test('size limits reject oversized query and narrative payloads', async () => {
    const oversizedSearch = await apiRequest(
      'GET',
      `/case-archive/search?q=${'a'.repeat(201)}`
    );
    assert.equal(oversizedSearch.status, 400);

    const oversizedReport = await apiRequest('PUT', `/reports/${examAId}`, {
      body: {
        conclusion: 'x'.repeat(20001),
      },
    });
    assert.equal(oversizedReport.status, 400);

    const tooManyKeywords = await apiRequest('POST', '/exams', {
      body: {
        patient_id: patientAId,
        exam_type: 'histology',
        clinic_name: 'Clinique Validation',
        requesting_doctor: 'Dr Limites',
        requested_date: '2026-04-01',
        registered_date: '2026-04-02',
        result_issued_date: null,
        sample_nature: 'Biopsie',
        exam_history: 'Contexte limite',
        diagnosis_keywords: Array.from({ length: 21 }, (_, index) => `motcle${index}`),
        status: 'registered',
        urgent: false,
      },
    });
    assert.equal(tooManyKeywords.status, 400);
  });

  await t.test('login throttling ignores spoofed X-Forwarded-For values when trust proxy is disabled', async () => {
    let lastResponse = null;

    for (let attempt = 0; attempt < 9; attempt += 1) {
      lastResponse = await apiRequest('POST', '/auth/login', {
        cookie: '',
        body: {
          email: clinician.email,
          password: 'mot-de-passe-invalide',
        },
        ip: `203.0.113.${attempt + 10}`,
      });
    }

    assert.ok(lastResponse);
    assert.equal(lastResponse.status, 429);
  });

  await t.test('log redaction removes secrets and PHI-like free text keys', async () => {
    const redacted = redactForLogs({
      password: 'SecretPassword!',
      token: 'opaque-token',
      q: 'adenocarcinome unique alpha123',
      clinical_info: 'information clinique sensible',
      nested: {
        cookie: 'session-cookie',
        conclusion: 'contenu medical sensible',
      },
      email: 'admin@anapath.local',
    });

    assert.equal(redacted.password, '[REDACTED]');
    assert.equal(redacted.token, '[REDACTED]');
    assert.equal(redacted.q, '[REDACTED]');
    assert.equal(redacted.clinical_info, '[REDACTED]');
    assert.equal(redacted.nested.cookie, '[REDACTED]');
    assert.equal(redacted.nested.conclusion, '[REDACTED]');
    assert.equal(redacted.email, 'admin@anapath.local');
  });

  await t.test('DB policy context helper sets transaction-local settings for future RLS rollout', async () => {
    const dbPolicyContext = {
      laboratoryId: labAId,
      userId: 9101,
      sessionId: 9202,
      requestId: 'p3-db-context-test',
    };

    const insideTransaction = await withDbTransaction(async (client) => {
      return readDbPolicyContext(client);
    }, {
      context: dbPolicyContext,
    });

    assert.deepEqual(insideTransaction, {
      laboratory_id: String(labAId),
      user_id: '9101',
      session_id: '9202',
      request_id: 'p3-db-context-test',
    });

    const outsideTransaction = await query(
      `SELECT
         NULLIF(current_setting('app.current_laboratory_id', true), '') AS laboratory_id,
         NULLIF(current_setting('app.current_user_id', true), '') AS user_id,
         NULLIF(current_setting('app.current_session_id', true), '') AS session_id,
         NULLIF(current_setting('app.current_request_id', true), '') AS request_id`
    );

    assert.deepEqual(outsideTransaction.rows[0], {
      laboratory_id: null,
      user_id: null,
      session_id: null,
      request_id: null,
    });
  });

  await t.test('tenant tables have forced RLS enabled with catalogued isolation policies', async () => {
    const tableResult = await query(
      `SELECT
         c.relname AS table_name,
         c.relrowsecurity,
         c.relforcerowsecurity
       FROM pg_class c
       INNER JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relname = ANY($1::text[])
       ORDER BY c.relname ASC`,
      [['patients', 'exams', 'reports', 'exam_sequences', 'report_templates', 'audit_events', 'report_revisions']]
    );

    assert.deepEqual(tableResult.rows, [
      { table_name: 'audit_events', relrowsecurity: true, relforcerowsecurity: true },
      { table_name: 'exam_sequences', relrowsecurity: true, relforcerowsecurity: true },
      { table_name: 'exams', relrowsecurity: true, relforcerowsecurity: true },
      { table_name: 'patients', relrowsecurity: true, relforcerowsecurity: true },
      { table_name: 'report_revisions', relrowsecurity: true, relforcerowsecurity: true },
      { table_name: 'report_templates', relrowsecurity: true, relforcerowsecurity: true },
      { table_name: 'reports', relrowsecurity: true, relforcerowsecurity: true },
    ]);

    const policyResult = await query(
      `SELECT
         tablename,
         policyname
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = ANY($1::text[])
       ORDER BY tablename ASC, policyname ASC`,
      [['patients', 'exams', 'reports', 'exam_sequences', 'report_templates', 'audit_events', 'report_revisions']]
    );

    assert.deepEqual(policyResult.rows, [
      {
        tablename: 'audit_events',
        policyname: 'audit_events_laboratory_isolation_policy',
      },
      {
        tablename: 'exam_sequences',
        policyname: 'exam_sequences_laboratory_isolation_policy',
      },
      {
        tablename: 'exams',
        policyname: 'exams_laboratory_isolation_policy',
      },
      {
        tablename: 'patients',
        policyname: 'patients_laboratory_isolation_policy',
      },
      {
        tablename: 'report_revisions',
        policyname: 'report_revisions_laboratory_isolation_policy',
      },
      {
        tablename: 'report_templates',
        policyname: 'report_templates_laboratory_isolation_policy',
      },
      {
        tablename: 'reports',
        policyname: 'reports_exam_laboratory_isolation_policy',
      },
    ]);
  });

  await t.test('DB constraints block cross-lab exam links and allow shared exam numbers across labs only', async () => {
    const sharedExamNumber = `SHARED-${randomUUID()}`;

    const labAExam = await query(
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
        'Clinique A',
        'Dr A',
        '2026-04-01',
        '2026-04-01',
        NULL,
        'Biopsie A',
        'Contexte A',
        ARRAY['a'],
        'registered',
        false
      )
      RETURNING id`,
      [labAId, patientAId, sharedExamNumber]
    );

    const labBExam = await query(
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
        'Clinique B',
        'Dr B',
        '2026-04-01',
        '2026-04-01',
        NULL,
        'Biopsie B',
        'Contexte B',
        ARRAY['b'],
        'registered',
        false
      )
      RETURNING id`,
      [labBId, patientBId, sharedExamNumber]
    );

    assert.ok(labAExam.rows[0].id);
    assert.ok(labBExam.rows[0].id);

    await assert.rejects(
      () => query(
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
          'Clinique A',
          'Dr A',
          '2026-04-01',
          '2026-04-01',
          NULL,
          'Biopsie A bis',
          'Contexte A bis',
          ARRAY['a'],
          'registered',
          false
        )`,
        [labAId, patientAId, sharedExamNumber]
      ),
      /exams_laboratory_exam_number_key/
    );

    await assert.rejects(
      () => query(
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
          'Clinique mismatch',
          'Dr mismatch',
          '2026-04-01',
          '2026-04-01',
          NULL,
          'Biopsie mismatch',
          'Contexte mismatch',
          ARRAY['mismatch'],
          'registered',
          false
        )`,
        [labBId, patientAId, `MISMATCH-${randomUUID()}`]
      ),
      /exams_laboratory_patient_fk/
    );
  });
});
