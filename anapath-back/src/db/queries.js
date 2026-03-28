import pool, { query } from '../config/database.js';

export async function findAllPatients() {
  const result = await query('SELECT * FROM patients ORDER BY id ASC');
  return result.rows;
}

export async function findPatientById(patientId) {
  const result = await query('SELECT * FROM patients WHERE id = $1', [patientId]);
  return result.rows[0] || null;
}

export async function insertPatient(payload) {
  const result = await query(
    `INSERT INTO patients (
      laboratory_id, first_name, last_name, age, sex, phone, birth_date, general_history
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      payload.laboratory_id,
      payload.first_name,
      payload.last_name,
      payload.age,
      payload.sex,
      payload.phone,
      payload.birth_date,
      payload.general_history,
    ]
  );

  return result.rows[0];
}

export async function updatePatientById(patientId, payload) {
  const result = await query(
    `UPDATE patients
     SET
       first_name = COALESCE($2, first_name),
       last_name = COALESCE($3, last_name),
       age = COALESCE($4, age),
       sex = COALESCE($5, sex),
       phone = COALESCE($6, phone),
       general_history = COALESCE($7, general_history),
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      patientId,
      payload.first_name,
      payload.last_name,
      payload.age,
      payload.sex,
      payload.phone,
      payload.general_history,
    ]
  );

  return result.rows[0] || null;
}

export async function searchPatientsByName(labId, firstName, lastName, phone = '') {
  const normalizedPhone = phone ? phone.replace(/\D/g, '') : '';
  const result = await query(
    `SELECT * FROM patients
     WHERE laboratory_id = $1
       AND (
         (LOWER(first_name) ILIKE $2 AND LOWER(last_name) ILIKE $3)
         OR ($4 <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') = $4)
       )
     ORDER BY last_name, first_name
     LIMIT 5`,
    [labId, `%${firstName.toLowerCase()}%`, `%${lastName.toLowerCase()}%`, normalizedPhone]
  );
  return result.rows;
}

export async function findExamsByPatientId(patientId) {
  const result = await query(
    'SELECT * FROM exams WHERE patient_id = $1 ORDER BY created_at DESC',
    [patientId]
  );
  return result.rows;
}

export async function findExamsByPatientIdWithReportSummary(patientId) {
  const result = await query(
    `SELECT e.*, r.conclusion AS report_conclusion, r.updated_at AS report_updated_at
     FROM exams e
     LEFT JOIN reports r ON r.exam_id = e.id
     WHERE e.patient_id = $1
     ORDER BY e.created_at DESC`,
    [patientId]
  );
  return result.rows.map((row) => {
    const { report_conclusion, report_updated_at, ...exam } = row;
    return {
      ...exam,
      report_summary: report_conclusion !== null
        ? { conclusion: report_conclusion, updated_at: report_updated_at }
        : null,
    };
  });
}

export async function findAllExams(filters = {}) {
  const baseQuery = `
    SELECT e.*, p.first_name AS patient_first_name, p.last_name AS patient_last_name
    FROM exams e
    LEFT JOIN patients p ON p.id = e.patient_id
  `;
  const conditions = [];
  const params = [];

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`e.status = $${params.length}`);
  }

  if (filters.exam_type) {
    params.push(filters.exam_type);
    conditions.push(`e.exam_type = $${params.length}`);
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    params.push(term);
    const n = params.length;
    conditions.push(`(
      p.last_name ILIKE $${n}
      OR p.first_name ILIKE $${n}
      OR e.exam_number ILIKE $${n}
      OR e.sample_nature ILIKE $${n}
    )`);
  }

  if (filters.date_from) {
    params.push(filters.date_from);
    conditions.push(`e.registered_date >= $${params.length}`);
  }

  if (filters.date_to) {
    params.push(filters.date_to);
    conditions.push(`e.registered_date <= $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(
    `${baseQuery} ${whereClause} ORDER BY e.urgent DESC, e.created_at DESC`,
    params
  );
  return result.rows;
}

export async function findExamById(examId) {
  const result = await query('SELECT * FROM exams WHERE id = $1', [examId]);
  return result.rows[0] || null;
}

export async function updateExamById(examId, payload) {
  const result = await query(
    `UPDATE exams
     SET
       exam_type = COALESCE($2, exam_type),
       clinic_name = COALESCE($3, clinic_name),
       requesting_doctor = COALESCE($4, requesting_doctor),
       requested_date = COALESCE($5, requested_date),
       registered_date = COALESCE($6, registered_date),
       result_issued_date = COALESCE($7, result_issued_date),
       sample_nature = COALESCE($8, sample_nature),
       exam_history = COALESCE($9, exam_history),
       diagnosis_keywords = COALESCE($10, diagnosis_keywords),
       status = COALESCE($11, status),
       urgent = COALESCE($12, urgent),
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      examId,
      payload.exam_type,
      payload.clinic_name,
      payload.requesting_doctor,
      payload.requested_date,
      payload.registered_date,
      payload.result_issued_date,
      payload.sample_nature,
      payload.exam_history,
      payload.diagnosis_keywords,
      payload.status,
      payload.urgent ?? null,
    ]
  );

  return result.rows[0] || null;
}

export async function clearResultIssuedDateForExam(examId) {
  const result = await query(
    'UPDATE exams SET result_issued_date = NULL, updated_at = NOW() WHERE id = $1 RETURNING *',
    [examId]
  );
  return result.rows[0] ?? null;
}

function formatExamNumber(examType, sequenceValue, year) {
  if (examType === 'cytology') {
    return `C${String(sequenceValue).padStart(4, '0')}-${year}`;
  }
  return `${sequenceValue}-${year}`;
}

export async function createExamWithReport(payload) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const patientResult = await client.query('SELECT id FROM patients WHERE id = $1', [
      payload.patient_id,
    ]);

    if (!patientResult.rows[0]) {
      await client.query('ROLLBACK');
      return { error: 'PATIENT_NOT_FOUND' };
    }

    const sequenceResult = await client.query(
      `INSERT INTO exam_sequences (laboratory_id, exam_type, current_value)
       VALUES ($1, $2, 1)
       ON CONFLICT (laboratory_id, exam_type)
       DO UPDATE
         SET current_value = exam_sequences.current_value + 1,
             updated_at = NOW()
       RETURNING current_value`,
      [payload.laboratory_id, payload.exam_type]
    );

    const sequenceValue = sequenceResult.rows[0].current_value;
    const currentYear = new Date().getFullYear();
    const examNumber = formatExamNumber(payload.exam_type, sequenceValue, currentYear);

    const examResult = await client.query(
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        payload.laboratory_id,
        payload.patient_id,
        examNumber,
        payload.exam_type,
        payload.clinic_name,
        payload.requesting_doctor,
        payload.requested_date,
        payload.registered_date,
        payload.result_issued_date,
        payload.sample_nature,
        payload.exam_history,
        payload.diagnosis_keywords,
        payload.status,
        payload.urgent === true,
      ]
    );

    const exam = examResult.rows[0];

    await client.query(
      `INSERT INTO reports (exam_id, clinical_info, macroscopy, microscopy, conclusion)
       VALUES ($1, '', '', '', '')`,
      [exam.id]
    );

    await client.query('COMMIT');
    return { exam };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function findReportByExamId(examId) {
  const result = await query('SELECT * FROM reports WHERE exam_id = $1', [examId]);
  return result.rows[0] || null;
}

export async function createEmptyReportForExamId(examId) {
  const result = await query(
    `INSERT INTO reports (exam_id, clinical_info, macroscopy, microscopy, conclusion)
     VALUES ($1, '', '', '', '')
     ON CONFLICT (exam_id) DO NOTHING
     RETURNING *`,
    [examId]
  );

  return result.rows[0] || null;
}

export async function updateReportByExamId(examId, payload) {
  const result = await query(
    `UPDATE reports
     SET
       clinical_info = COALESCE($2, clinical_info),
       macroscopy = COALESCE($3, macroscopy),
       microscopy = COALESCE($4, microscopy),
       conclusion = COALESCE($5, conclusion),
       updated_at = NOW()
     WHERE exam_id = $1
     RETURNING *`,
    [
      examId,
      payload.clinical_info,
      payload.macroscopy,
      payload.microscopy,
      payload.conclusion,
    ]
  );

  return result.rows[0] || null;
}

export async function findAllTemplatesByLabId(labId) {
  const result = await query(
    'SELECT * FROM report_templates WHERE laboratory_id = $1 ORDER BY name ASC',
    [labId]
  );
  return result.rows;
}

export async function createTemplate(payload) {
  const result = await query(
    `INSERT INTO report_templates (laboratory_id, name, clinical_info, macroscopy, microscopy, conclusion)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      payload.laboratory_id,
      payload.name,
      payload.clinical_info || '',
      payload.macroscopy || '',
      payload.microscopy || '',
      payload.conclusion || '',
    ]
  );
  return result.rows[0];
}

export async function updateTemplateById(templateId, payload) {
  const result = await query(
    `UPDATE report_templates
     SET
       name          = COALESCE($2, name),
       clinical_info  = COALESCE($3, clinical_info),
       macroscopy     = COALESCE($4, macroscopy),
       microscopy     = COALESCE($5, microscopy),
       conclusion     = COALESCE($6, conclusion),
       updated_at     = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      templateId,
      payload.name,
      payload.clinical_info,
      payload.macroscopy,
      payload.microscopy,
      payload.conclusion,
    ]
  );
  return result.rows[0] || null;
}

export async function deleteTemplateById(templateId) {
  const result = await query(
    'DELETE FROM report_templates WHERE id = $1 RETURNING *',
    [templateId]
  );
  return result.rows[0] || null;
}

export async function getExamStats(laboratoryId) {
  const result = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'registered')  AS registered_count,
       COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
       COUNT(*) FILTER (
         WHERE status = 'completed'
           AND result_issued_date >= date_trunc('month', CURRENT_DATE)
           AND result_issued_date <  date_trunc('month', CURRENT_DATE) + interval '1 month'
       ) AS completed_this_month
     FROM exams
     WHERE laboratory_id = $1`,
    [laboratoryId]
  );
  return result.rows[0];
}

export async function findUserByEmail(email) {
  const result = await query(
    'SELECT id, laboratory_id, full_name, email, password_hash, role FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}
