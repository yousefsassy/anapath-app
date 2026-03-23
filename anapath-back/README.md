# Anapath Backend (PostgreSQL)

Beginner-friendly Express backend for an anatomopathology laboratory app.

## What this version uses

- Node.js + Express
- PostgreSQL with plain SQL (`pg`)
- Same API routes as before
- Database-backed exam number generation

## Project structure

```
anapath-back/
├── src/
│   ├── app.js
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   ├── db/
│   │   ├── queries.js
│   │   ├── schema.sql
│   │   └── seed.sql
│   ├── data/
│   │   └── mockData.js (kept for reference, not used)
│   ├── middlewares/
│   ├── models/
│   └── routes/
├── server.js
├── .env.example
└── package.json
```

## 1) Install and configure

```bash
npm install
cp .env.example .env
```

Edit `.env` if needed:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=anapath
```

## 2) Create database and tables

This project includes SQL files, but **you still need to execute them**.

### Create database object

```bash
createdb anapath
```

### Create tables (schema)

```bash
psql -d anapath -f src/db/schema.sql
```

### Insert seed data

```bash
psql -d anapath -f src/db/seed.sql
```

After these commands, you can open pgAdmin and see the tables:
- `laboratories`
- `users`
- `patients`
- `exams`
- `reports`
- `exam_sequences`

## 3) Start backend

```bash
npm run dev
```

or

```bash
npm start
```

The server log prints the URL to test.

## API endpoints

- `GET /`
- `GET /api/health`
- `POST /api/auth/login` (minimal placeholder)
- `GET /api/patients`
- `POST /api/patients`
- `GET /api/patients/:id`
- `GET /api/patients/:id/exams`
- `GET /api/exams`
- `POST /api/exams`
- `GET /api/exams/:id`
- `GET /api/reports/:examId`
- `PUT /api/reports/:examId`

## Exam number logic (persistent)

Stored in table `exam_sequences` by `(laboratory_id, exam_type)`:

- Cytology: `C0001-2026`
- Histology: `1-2026`

This no longer resets when server restarts.

## Example payloads

### POST `/api/patients`

```json
{
  "first_name": "Sara",
  "last_name": "Amrani",
  "age": 52,
  "sex": "F",
  "phone": "0611223344",
  "general_history": "Diabetes"
}
```

### POST `/api/exams`

```json
{
  "patient_id": 1,
  "exam_type": "histology",
  "clinic_name": "Central Clinic",
  "requesting_doctor": "Dr. Karim",
  "requested_date": "2026-03-22",
  "sample_nature": "Biopsy",
  "exam_history": "Second check",
  "diagnosis_keywords": ["tumor", "biopsy"],
  "status": "registered"
}
```

### PUT `/api/reports/:examId`

```json
{
  "clinical_info": "Patient has persistent pain",
  "macroscopy": "Sample measures 2cm",
  "microscopy": "Cellular atypia observed",
  "conclusion": "Suspicious lesion, recommend follow-up"
}
```
