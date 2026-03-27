const laboratories = [
  {
    id: 1,
    name: "Default Laboratory",
    address: "Not set yet",
    phone: "Not set yet",
  },
];

const users = [
  {
    id: 1,
    laboratory_id: 1,
    email: process.env.ADMIN_EMAIL || "admin@anapath.local",
    password: process.env.ADMIN_PASSWORD || "admin123",
    role: "admin",
  },
];

const patients = [
  {
    id: 1,
    laboratory_id: 1,
    first_name: "Fatima",
    last_name: "Bennani",
    age: 46,
    sex: "F",
    phone: "0600000000",
    general_history: "No major history reported.",
    created_at: new Date().toISOString(),
  },
];

const exams = [
  {
    id: 1,
    laboratory_id: 1,
    patient_id: 1,
    exam_number: `1-${new Date().getFullYear()}`,
    exam_type: "histology",
    clinic_name: "Anapath Clinic",
    requesting_doctor: "Dr. Example",
    requested_date: new Date().toISOString().slice(0, 10),
    registered_date: new Date().toISOString().slice(0, 10),
    result_issued_date: null,
    sample_nature: "Biopsy",
    exam_history: "First exam",
    diagnosis_keywords: ["initial"],
    status: "registered",
    created_at: new Date().toISOString(),
  },
];

const reports = [
  {
    id: 1,
    exam_id: 1,
    clinical_info: "",
    macroscopy: "",
    microscopy: "",
    conclusion: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let nextPatientId = 2;
let nextExamId = 2;
let nextReportId = 2;
let cytologyCounter = 1;
let histologyCounter = 1174;

export function getCollections() {
  return { laboratories, users, patients, exams, reports };
}

export function getNextPatientId() {
  const current = nextPatientId;
  nextPatientId += 1;
  return current;
}

export function getNextExamId() {
  const current = nextExamId;
  nextExamId += 1;
  return current;
}

export function getNextReportId() {
  const current = nextReportId;
  nextReportId += 1;
  return current;
}

export function generateExamNumber(examType) {
  const currentYear = new Date().getFullYear();

  if (examType === "cytology") {
    const value = `C${String(cytologyCounter).padStart(4, "0")}-${currentYear}`;
    cytologyCounter += 1;
    return value;
  }

  const value = `${histologyCounter}-${currentYear}`;
  histologyCounter += 1;
  return value;
}
