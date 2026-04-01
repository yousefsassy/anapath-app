import 'dotenv/config';
import { query } from '../src/config/database.js';
import {
  createPasswordHash,
  validateBootstrapPassword,
} from '../src/utils/passwordSecurity.js';

function readRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }

  return value;
}

async function ensureLaboratory(labId, labName) {
  const existingLab = await query(
    'SELECT id FROM laboratories WHERE id = $1',
    [labId]
  );

  if (existingLab.rows[0]) {
    return existingLab.rows[0].id;
  }

  const createdLab = await query(
    `INSERT INTO laboratories (id, name, address, phone, email)
     VALUES ($1, $2, '', '', '')
     RETURNING id`,
    [labId, labName]
  );

  return createdLab.rows[0].id;
}

async function upsertAdminUser({
  laboratoryId,
  fullName,
  email,
  passwordHash,
}) {
  const result = await query(
    `INSERT INTO users (laboratory_id, full_name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, 'admin')
     ON CONFLICT (email)
     DO UPDATE SET
       laboratory_id = EXCLUDED.laboratory_id,
       full_name = EXCLUDED.full_name,
       password_hash = EXCLUDED.password_hash,
       role = 'admin'
     RETURNING id, email, laboratory_id`,
    [laboratoryId, fullName, email, passwordHash]
  );

  return result.rows[0];
}

async function main() {
  const laboratoryId = Number(process.env.BOOTSTRAP_ADMIN_LAB_ID || '1');
  const laboratoryName =
    process.env.BOOTSTRAP_ADMIN_LAB_NAME?.trim() || 'Default Laboratory';
  const fullName =
    process.env.BOOTSTRAP_ADMIN_FULL_NAME?.trim() || 'Default Admin';
  const email = readRequiredEnv('BOOTSTRAP_ADMIN_EMAIL').toLowerCase();
  const password = readRequiredEnv('BOOTSTRAP_ADMIN_PASSWORD');

  if (!Number.isInteger(laboratoryId) || laboratoryId <= 0) {
    throw new Error("BOOTSTRAP_ADMIN_LAB_ID doit être un entier positif.");
  }

  const passwordValidationError = validateBootstrapPassword(password);
  if (passwordValidationError) {
    throw new Error(passwordValidationError);
  }

  const passwordHash = await createPasswordHash(password);
  const ensuredLaboratoryId = await ensureLaboratory(laboratoryId, laboratoryName);
  const adminUser = await upsertAdminUser({
    laboratoryId: ensuredLaboratoryId,
    fullName,
    email,
    passwordHash,
  });

  console.log(
    `Admin bootstrap terminé pour ${adminUser.email} (lab ${adminUser.laboratory_id}).`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
