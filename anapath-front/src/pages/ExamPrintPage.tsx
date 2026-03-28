import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { examService } from '../services/examService'
import { patientService } from '../services/patientService'
import { loadLabSettings } from '../services/labSettingsStorage'
import { loadPrintSettings, savePrintSettings } from '../services/printSettingsStorage'
import type { Exam, LabSettings, Patient, PrintSettings, ReportInput } from '../types/domain'
import { defaultPrintSettings } from '../types/domain'
import { formatDate } from '../utils/formatting'
import { displaySexFrench } from '../utils/domainMappings'

const emptyReport: ReportInput = {
  clinical_info: '',
  macroscopy: '',
  microscopy: '',
  conclusion: '',
}

function formatPatientName(patient: Patient | null): string {
  if (!patient) return '—'
  return `${patient.last_name} ${patient.first_name}`.trim() || '—'
}

function buildSheetClasses(s: PrintSettings): string {
  return [
    'print-sheet',
    s.sectionSpacing !== 'normal' ? `print-sheet--spacing-${s.sectionSpacing}` : '',
    s.labelStyle !== 'underline-bold' ? `print-sheet--label-${s.labelStyle}` : '',
    s.conclusionStyle === 'plain' ? 'print-sheet--conclusion-plain' : '',
    s.fontSize !== 'normal' ? `print-sheet--font-${s.fontSize}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

export function ExamPrintPage() {
  const { id = '' } = useParams()
  const printSheetRef = useRef<HTMLElement>(null)

  const [exam, setExam] = useState<Exam | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [report, setReport] = useState<ReportInput>(emptyReport)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEnteteImage, setShowEnteteImage] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() => loadPrintSettings())
  const [labSettings] = useState<LabSettings>(() => loadLabSettings())

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError('')
      try {
        const examData = await examService.getById(id)

        if (!examData) {
          setExam(null)
          setPatient(null)
          setReport(emptyReport)
          return
        }

        setExam(examData)

        const [patientData, reportData] = await Promise.all([
          patientService.getById(examData.patient_id),
          examService.getReportByExamId(id),
        ])

        setPatient(patientData)
        setReport(reportData ?? emptyReport)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger le document.')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [id])

  const handleDownload = async () => {
    const element = printSheetRef.current
    if (!element || !exam) return
    setIsDownloading(true)
    // Suppress screen-only styles (border, shadow) before capture
    element.classList.add('print-sheet--exporting')
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { default: html2pdf } = await import('html2pdf.js')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await html2pdf()
        .set({
          filename: `CR-${exam.exam_number}.pdf`,
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          margin: 0,
        })
        .from(element)
        .save()
    } finally {
      element.classList.remove('print-sheet--exporting')
      setIsDownloading(false)
    }
  }

  function updateSetting<K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) {
    const next = { ...printSettings, [key]: value }
    setPrintSettings(next)
    savePrintSettings(next)
  }

  function resetSettings() {
    setPrintSettings({ ...defaultPrintSettings })
    savePrintSettings({ ...defaultPrintSettings })
  }

  if (isLoading) {
    return (
      <main className="print-page-screen-state">
        <p>Chargement du compte rendu…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="print-page-screen-state">
        <p className="error-message">{error}</p>
        <Link to={`/exams/${id}`} className="button tertiary">
          Retour au prélèvement
        </Link>
      </main>
    )
  }

  if (!exam) {
    return (
      <main className="print-page-screen-state">
        <p>Prélèvement introuvable.</p>
        <Link to="/dashboard" className="button tertiary">
          Retour à l'accueil
        </Link>
      </main>
    )
  }

  return (
    <main className="print-page-root">
      <div className="print-toolbar no-print">
        <Link to={`/exams/${id}`} className="button tertiary">
          Retour
        </Link>
        <button
          type="button"
          className="button tertiary"
          onClick={() => { setIsPanelOpen(open => !open) }}
        >
          Mise en page {isPanelOpen ? '▴' : '▾'}
        </button>
        <button
          type="button"
          className="button"
          onClick={() => { void handleDownload() }}
          disabled={isDownloading}
        >
          {isDownloading ? 'Génération…' : 'Télécharger le PDF'}
        </button>
      </div>

      {isPanelOpen && (
        <div className="print-format-panel no-print">
          <div className="print-format-panel-body">
            <div className="print-format-row">
              <span className="print-format-row-label">Espacement entre sections</span>
              <div className="print-format-segmented">
                {(['compact', 'normal', 'spacious'] as const).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    className={printSettings.sectionSpacing === opt ? 'active' : ''}
                    onClick={() => { updateSetting('sectionSpacing', opt) }}
                  >
                    {opt === 'compact' ? 'Compact' : opt === 'normal' ? 'Normal' : 'Spacieux'}
                  </button>
                ))}
              </div>
            </div>

            <div className="print-format-row">
              <span className="print-format-row-label">Style des libellés</span>
              <div className="print-format-segmented">
                {(['underline-bold', 'bold', 'normal'] as const).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    className={printSettings.labelStyle === opt ? 'active' : ''}
                    onClick={() => { updateSetting('labelStyle', opt) }}
                  >
                    {opt === 'underline-bold' ? 'Souligné + Gras' : opt === 'bold' ? 'Gras' : 'Normal'}
                  </button>
                ))}
              </div>
            </div>

            <div className="print-format-row">
              <span className="print-format-row-label">Conclusion</span>
              <div className="print-format-segmented">
                {(['boxed', 'plain'] as const).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    className={printSettings.conclusionStyle === opt ? 'active' : ''}
                    onClick={() => { updateSetting('conclusionStyle', opt) }}
                  >
                    {opt === 'boxed' ? 'Encadrée' : 'Sans encadrement'}
                  </button>
                ))}
              </div>
            </div>

            <div className="print-format-row">
              <span className="print-format-row-label">Taille du texte</span>
              <div className="print-format-segmented">
                {(['small', 'normal', 'large'] as const).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    className={printSettings.fontSize === opt ? 'active' : ''}
                    onClick={() => { updateSetting('fontSize', opt) }}
                  >
                    {opt === 'small' ? 'Petit' : opt === 'normal' ? 'Normal' : 'Grand'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="print-format-panel-footer">
            <button type="button" className="print-format-reset" onClick={resetSettings}>
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      <article ref={printSheetRef} className={buildSheetClasses(printSettings)} aria-label="Compte rendu imprimable">

        {/* ── ENTÊTE ─────────────────────────────────────────────── */}
        <header className="print-entete">
          {showEnteteImage ? (
            <img
              src="/entete-compte-rendu.png"
              alt="Entête du laboratoire"
              className="print-entete-image"
              onError={() => { setShowEnteteImage(false) }}
            />
          ) : (
            <div className="print-entete-fallback">
              <div className="print-entete-left">
                <p className="print-entete-doctor">{labSettings.doctorName}</p>
                {labSettings.doctorTitle.split('\n').filter(Boolean).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
                {labSettings.doctorPhone && <p>Tél : {labSettings.doctorPhone}</p>}
                {labSettings.doctorEmail && <p>Email : {labSettings.doctorEmail}</p>}
              </div>
              <div className="print-entete-right">
                <p className="print-entete-lab">{labSettings.labName}</p>
                {labSettings.labAddress.split('\n').filter(Boolean).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
                {labSettings.labPhone && <p>Tél : {labSettings.labPhone}</p>}
              </div>
            </div>
          )}
        </header>

        <hr className="print-separator" />

        {/* ── EXAM BLOCK ─────────────────────────────────────────── */}
        <section className="print-exam-block">
          <div className="print-meta-columns">
            <div className="print-meta-left">
              <p>
                <span className="print-meta-label">Clinique :</span>{' '}
                {exam.clinic_name || '—'}
              </p>
              <p>
                <span className="print-meta-label">Examen demandé le :</span>{' '}
                {formatDate(exam.requested_date)}
              </p>
              <p>
                <span className="print-meta-label">Enregistré le :</span>{' '}
                {formatDate(exam.registered_date)}
              </p>
              <p>
                <span className="print-meta-label">Résultat émis le :</span>{' '}
                {formatDate(exam.result_issued_date)}
              </p>
              <p>
                <span className="print-meta-label">Type :</span>{' '}
                {exam.exam_type === 'histology' ? 'Histologie' : exam.exam_type === 'cytology' ? 'Cytologie' : '—'}
              </p>
            </div>
            <div className="print-meta-right">
              <p>
                <span className="print-meta-label">Nom et prénom :</span>{' '}
                <strong>{formatPatientName(patient)}</strong>
              </p>
              <p>
                <span className="print-meta-label">Age :</span>{' '}
                {patient?.age ?? '—'}
              </p>
              <p>
                <span className="print-meta-label">Sexe :</span>{' '}
                {patient?.sex ? displaySexFrench(patient.sex) : '—'}
              </p>
              <p>
                <strong>
                  <span className="print-meta-label">Examen N° :</span>{' '}
                  {exam.exam_number}
                </strong>
              </p>
              <p>
                <span className="print-meta-label">Demandé par :</span>{' '}
                <span className="print-requesting-doctor">{exam.requesting_doctor || '—'}</span>
              </p>
            </div>
          </div>

          {exam.exam_history?.trim() ? (
            <p className="print-exam-history">
              <span className="print-meta-label">Contexte clinique :</span>{' '}
              {exam.exam_history}
            </p>
          ) : null}
        </section>

        <hr className="print-separator" />

        {/* ── REPORT BLOCK ───────────────────────────────────────── */}
        <section className="print-report-block">

          {report.clinical_info.trim() ? (
            <div className="print-section">
              <p>
                <span className="print-section-label">RC :</span>{' '}
                {report.clinical_info}
              </p>
            </div>
          ) : null}

          {exam.sample_nature?.trim() ? (
            <p className="print-sample-title">{exam.sample_nature.toUpperCase()} :</p>
          ) : null}

          {report.macroscopy.trim() ? (
            <div className="print-section">
              <p>
                <span className="print-section-label print-section-label--underline">Macroscopie :</span>{' '}
                {report.macroscopy}
              </p>
            </div>
          ) : null}

          {report.microscopy.trim() ? (
            <div className="print-section">
              <p className="print-section-label print-section-label--underline">Microscopie :</p>
              <p>{report.microscopy}</p>
            </div>
          ) : null}

          {report.conclusion.trim() ? (
            <div className="print-section print-conclusion">
              <p className="print-conclusion-label">CONCLUSION :</p>
              <p className="print-conclusion-text">{report.conclusion}</p>
            </div>
          ) : null}

        </section>

        {/* ── SIGNATURE ──────────────────────────────────────────── */}
        <footer className="print-signature-area">
          <p>{labSettings.doctorName}</p>
          <p className="print-signature-text">Signature électronique</p>
        </footer>

      </article>
    </main>
  )
}
