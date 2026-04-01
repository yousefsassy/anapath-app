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
let labAId = null;
let labBId = null;
let patientAId = null;
let examAId = null;
let templateAId = null;
let labACookie = '';
let labBCookie = '';

const labAUser = {
  email: 'security-lab-a@anapath.local',
  password: 'LabAAdminPassword123!',
};

const labBUser = {
  email: 'security-lab-b@anapath.local',
  password: 'LabBAdminPassword123!',
};

async function apiRequest(method, path, { body, cookie = '', ip = '172.16.0.1' } = {}) {
  const response = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      'X-Forwarded-For': ip,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json();

  return {
    status: response.status,
    payload,
    cookie: response.headers.get('set-cookie')?.split(';')[0] || '',
  };
}

async function loginAs(email, password, ip) {
  const response = await apiRequest('POST', '/auth/login', {
    body: { email, password },
    ip,
  });

  assert.equal(response.status, 200);
  assert.ok(response.cookie);
  return response.cookie;
}

before(async () => {
  const createdLabA = await query(
    `INSERT INTO laboratories (name, address, phone, email)
     VALUES ($1, '', '', '')
     RETURNING id`,
    [`P1 security lab A ${randomUUID()}`]
  );
  labAId = createdLabA.rows[0].id;

  const createdLabB = await query(
    `INSERT INTO laboratories (name, address, phone, email)
     VALUES ($1, '', '', '')
     RETURNING id`,
    [`P1 security lab B ${randomUUID()}`]
  );
  labBId = createdLabB.rows[0].id;

  await query(
    `INSERT INTO users (laboratory_id, full_name, email, password_hash, role)
     VALUES ($1, 'Security Lab A', $2, $3, 'admin')`,
    [labAId, labAUser.email, await createPasswordHash(labAUser.password)]
  );

  await query(
    `INSERT INTO users (laboratory_id, full_name, email, password_hash, role)
     VALUES ($1, 'Security Lab B', $2, $3, 'admin')`,
    [labBId, labBUser.email, await createPasswordHash(labBUser.password)]
  );

  const patientResult = await query(
    `INSERT INTO patients (
      laboratory_id, first_name, last_name, age, sex, phone, birth_date, general_history
    ) VALUES ($1, 'Archive', 'Isolation', 47, 'F', '0711111111', '1979-04-01', 'Cas de test securite.')
    RETURNING id`,
    [labAId]
  );
  patientAId = patientResult.rows[0].id;

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
      'Clinique securite',
      'Dr Isolation',
      '2026-04-01',
      '2026-04-01',
      '2026-04-02',
      'Biopsie isolation unique',
      'Contexte isolation securite',
      ARRAY['isolation', 'unique'],
      'completed',
      false
    )
    RETURNING id`,
    [labAId, patientAId, `SEC-${randomUUID()}`]
  );
  examAId = examResult.rows[0].id;

  await query(
    `INSERT INTO reports (exam_id, clinical_info, macroscopy, microscopy, conclusion)
     VALUES ($1, 'RC isolation unique', 'Macro isolation', 'Micro isolation', 'Conclusion isolation unique alpha123')`,
    [examAId]
  );

  const templateResult = await query(
    `INSERT INTO report_templates (laboratory_id, name, clinical_info, macroscopy, microscopy, conclusion)
     VALUES ($1, 'Modele isolation', 'RC', 'Macro', 'Micro', 'Conclusion')
     RETURNING id`,
    [labAId]
  );
  templateAId = templateResult.rows[0].id;

  server = http.createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error("Impossible d'initialiser le serveur de test.");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;

  labACookie = await loginAs(labAUser.email, labAUser.password, '172.16.0.11');
  labBCookie = await loginAs(labBUser.email, labBUser.password, '172.16.0.22');
});

after(async () => {
  if (labAId || labBId) {
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

test('security protections enforce authentication, tenant isolation, session invalidation, and throttling', async (t) => {
  await t.test('business routes deny unauthenticated access', async () => {
    const { status, payload } = await apiRequest('GET', '/patients');

    assert.equal(status, 401);
    assert.equal(payload.success, false);
  });

  await t.test('cross-lab patient, exam, report, and template access returns 404', async () => {
    const patientResponse = await apiRequest('GET', `/patients/${patientAId}`, {
      cookie: labBCookie,
      ip: '172.16.0.23',
    });
    assert.equal(patientResponse.status, 404);

    const examResponse = await apiRequest('GET', `/exams/${examAId}`, {
      cookie: labBCookie,
      ip: '172.16.0.24',
    });
    assert.equal(examResponse.status, 404);

    const reportResponse = await apiRequest('GET', `/reports/${examAId}`, {
      cookie: labBCookie,
      ip: '172.16.0.25',
    });
    assert.equal(reportResponse.status, 404);

    const templateResponse = await apiRequest('PUT', `/report-templates/${templateAId}`, {
      cookie: labBCookie,
      ip: '172.16.0.26',
      body: {
        name: 'Tentative intruse',
        clinical_info: 'RC',
        macroscopy: 'Macro',
        microscopy: 'Micro',
        conclusion: 'Conclusion',
      },
    });
    assert.equal(templateResponse.status, 404);
  });

  await t.test('archive preview and archive search stay isolated per laboratory', async () => {
    const previewResponse = await apiRequest('GET', `/case-archive/${examAId}/preview`, {
      cookie: labBCookie,
      ip: '172.16.0.27',
    });
    assert.equal(previewResponse.status, 404);

    const searchResponse = await apiRequest(
      'GET',
      '/case-archive/search?q=alpha123&exam_type=histology',
      {
        cookie: labBCookie,
        ip: '172.16.0.28',
      }
    );
    assert.equal(searchResponse.status, 200);
    assert.equal(searchResponse.payload.success, true);
    assert.equal(searchResponse.payload.data.length, 0);

    const labASearchResponse = await apiRequest(
      'GET',
      '/case-archive/search?q=alpha123&exam_type=histology',
      {
        cookie: labACookie,
        ip: '172.16.0.29',
      }
    );
    assert.equal(labASearchResponse.status, 200);
    assert.ok(
      labASearchResponse.payload.data.some((result) => result.exam_id === examAId)
    );
  });

  await t.test('logout invalidates the session for later protected requests', async () => {
    const logoutResponse = await apiRequest('POST', '/auth/logout', {
      cookie: labACookie,
      ip: '172.16.0.30',
    });

    assert.equal(logoutResponse.status, 200);

    const afterLogoutResponse = await apiRequest('GET', '/patients', {
      cookie: labACookie,
      ip: '172.16.0.31',
    });
    assert.equal(afterLogoutResponse.status, 401);

    labACookie = await loginAs(labAUser.email, labAUser.password, '172.16.0.32');
  });

  await t.test('login attempts are rate-limited', async () => {
    let lastResponse = null;

    for (let attempt = 0; attempt < 9; attempt += 1) {
      lastResponse = await apiRequest('POST', '/auth/login', {
        body: {
          email: labBUser.email,
          password: 'mot-de-passe-invalide',
        },
        ip: '172.16.0.99',
      });
    }

    assert.ok(lastResponse);
    assert.equal(lastResponse.status, 429);
    assert.equal(lastResponse.payload.success, false);
  });
});
