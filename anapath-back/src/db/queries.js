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
  if (filters.status) {
    const result = await query(
      `${baseQuery} WHERE e.status = $1 ORDER BY e.created_at DESC`,
      [filters.status]
    );
    return result.rows;
  }
  const result = await query(`${baseQuery} ORDER BY e.created_at DESC`);
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
    ]
  );

  return result.rows[0] || null;
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
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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

export async function findUserByEmail(email) {
  const result = await query(
    'SELECT id, laboratory_id, full_name, email, password_hash, role FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}
