import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import http from 'node:http';
import test, { after, before } from 'node:test';
import app from '../src/app.js';
import pool, { query } from '../src/config/database.js';

let server;
let baseUrl = '';
let labId = null;

async function apiRequest(method, path, body) {
  const response = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(labId ? { 'X-Laboratory-Id': String(labId) } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json();

  return {
    status: response.status,
    payload,
  };
}

before(async () => {
  const createdLab = await query(
    `INSERT INTO laboratories (name, address, phone, email)
     VALUES ($1, '', '', '')
     RETURNING id`,
    [`P3 test lab ${randomUUID()}`]
  );

  labId = createdLab.rows[0].id;

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

test('critical API contracts stay stable across the main workflows', async (t) => {
  let patientId;
  let examId;
  let templateId;

  await t.test('patient creation contract', async () => {
    const { status, payload } = await apiRequest('POST', '/patients', {
      first_name: 'Nadia',
      last_name: 'Test P3',
      age: 52,
      sex: 'F',
      phone: '0700000000',
      birth_date: '1974-02-10',
      general_history: 'ATCD de surveillance annuelle.',
    });

    assert.equal(status, 201);
    assert.equal(payload.success, true);
    patientId = payload.data.id;
    assert.equal(payload.data.laboratory_id, labId);
    assert.ok(payload.data.birth_date);
  });

  await t.test('exam creation auto-creates a report', async () => {
    const { status, payload } = await apiRequest('POST', '/exams', {
      patient_id: patientId,
      exam_type: 'histology',
      clinic_name: 'Clinique P3',
      requesting_doctor: 'Dr Stabilisation',
      requested_date: '2026-04-01',
      registered_date: '2026-04-02',
      result_issued_date: null,
      sample_nature: 'Biopsie thyroidienne',
      exam_history: 'Nodule thyroidien suspect avec microcalcifications.',
      diagnosis_keywords: ['papillaire', 'thyroide', 'carcinome'],
      status: 'registered',
      urgent: false,
    });

    assert.equal(status, 201);
    assert.equal(payload.success, true);
    assert.match(payload.data.exam_number, /2026$/);
    examId = payload.data.id;

    const reportResponse = await apiRequest('GET', `/reports/${examId}`);
    assert.equal(reportResponse.status, 200);
    assert.equal(reportResponse.payload.data.exam_id, examId);
    assert.equal(reportResponse.payload.data.clinical_info, '');
    assert.equal(reportResponse.payload.data.macroscopy, '');
    assert.equal(reportResponse.payload.data.microscopy, '');
    assert.equal(reportResponse.payload.data.conclusion, '');
  });

  await t.test('report save/load contract', async () => {
    const reportDraft = {
      clinical_info: 'Nodule thyroidien suspect.',
      macroscopy: 'Deux fragments beigeatres de petite taille.',
      microscopy: 'Architecture papillaire avec atypies nucleaires.',
      conclusion: 'Aspect suspect de carcinome papillaire thyroidien.',
    };

    const saveResponse = await apiRequest('PUT', `/reports/${examId}`, reportDraft);
    assert.equal(saveResponse.status, 200);
    assert.equal(saveResponse.payload.success, true);
    assert.equal(saveResponse.payload.data.conclusion, reportDraft.conclusion);

    const loadResponse = await apiRequest('GET', `/reports/${examId}`);
    assert.equal(loadResponse.status, 200);
    assert.equal(loadResponse.payload.data.microscopy, reportDraft.microscopy);
  });

  await t.test('template CRUD stays functional', async () => {
    const createResponse = await apiRequest('POST', '/report-templates', {
      name: 'Modele P3',
      clinical_info: 'RC P3',
      macroscopy: 'Macro P3',
      microscopy: 'Micro P3',
      conclusion: 'Conclusion P3',
    });

    assert.equal(createResponse.status, 201);
    assert.equal(createResponse.payload.success, true);
    templateId = createResponse.payload.data.id;

    const listResponse = await apiRequest('GET', '/report-templates');
    assert.equal(listResponse.status, 200);
    assert.ok(listResponse.payload.data.some((template) => template.id === templateId));

    const updateResponse = await apiRequest('PUT', `/report-templates/${templateId}`, {
      name: 'Modele P3 mis a jour',
      clinical_info: 'RC mis a jour',
      macroscopy: 'Macro P3',
      microscopy: 'Micro P3',
      conclusion: 'Conclusion P3',
    });

    assert.equal(updateResponse.status, 200);
    assert.equal(updateResponse.payload.data.name, 'Modele P3 mis a jour');

    const deleteResponse = await apiRequest('DELETE', `/report-templates/${templateId}`);
    assert.equal(deleteResponse.status, 200);
    assert.equal(deleteResponse.payload.data.id, templateId);
  });

  await t.test('validation locks the report and exposes the case in archive search', async () => {
    const validateResponse = await apiRequest('PUT', `/exams/${examId}`, {
      status: 'completed',
    });

    assert.equal(validateResponse.status, 200);
    assert.equal(validateResponse.payload.success, true);
    assert.equal(validateResponse.payload.data.status, 'completed');
    assert.ok(validateResponse.payload.data.result_issued_date);

    const lockedReportResponse = await apiRequest('PUT', `/reports/${examId}`, {
      clinical_info: 'Modification interdite',
      macroscopy: '',
      microscopy: '',
      conclusion: '',
    });
    assert.equal(lockedReportResponse.status, 403);

    const forbiddenExamEdit = await apiRequest('PUT', `/exams/${examId}`, {
      sample_nature: 'Correction interdite apres validation',
    });
    assert.equal(forbiddenExamEdit.status, 403);

    const archiveSearchResponse = await apiRequest(
      'GET',
      `/case-archive/search?q=papillaire&exam_type=histology`
    );
    assert.equal(archiveSearchResponse.status, 200);
    assert.ok(
      archiveSearchResponse.payload.data.some((result) => String(result.exam_id) === String(examId))
    );

    const archivePreviewResponse = await apiRequest('GET', `/case-archive/${examId}/preview`);
    assert.equal(archivePreviewResponse.status, 200);
    assert.equal(archivePreviewResponse.payload.data.exam.id, examId);
    assert.equal(
      archivePreviewResponse.payload.data.report.conclusion,
      'Aspect suspect de carcinome papillaire thyroidien.'
    );
  });

  await t.test('reopen clears issued date and restores report edition', async () => {
    const reopenResponse = await apiRequest('PUT', `/exams/${examId}`, {
      status: 'in_progress',
    });

    assert.equal(reopenResponse.status, 200);
    assert.equal(reopenResponse.payload.data.status, 'in_progress');
    assert.equal(reopenResponse.payload.data.result_issued_date, null);

    const saveAfterReopen = await apiRequest('PUT', `/reports/${examId}`, {
      clinical_info: 'Nodule thyroidien suspect apres reouverture.',
      macroscopy: 'Deux fragments beigeatres de petite taille.',
      microscopy: 'Architecture papillaire avec atypies nucleaires persistantes.',
      conclusion: 'Controle apres reouverture du dossier.',
    });

    assert.equal(saveAfterReopen.status, 200);
    assert.equal(saveAfterReopen.payload.success, true);
    assert.equal(saveAfterReopen.payload.data.conclusion, 'Controle apres reouverture du dossier.');
  });
});
