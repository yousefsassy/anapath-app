import type { LabSettings } from '../types/domain'
import { defaultLabSettings } from '../types/domain'

const STORAGE_KEY = 'anapath_lab_settings'

export function loadLabSettings(): LabSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultLabSettings }
    const parsed = JSON.parse(raw) as Partial<LabSettings>
    return {
      doctorName: parsed.doctorName ?? defaultLabSettings.doctorName,
      doctorTitle: parsed.doctorTitle ?? defaultLabSettings.doctorTitle,
      doctorPhone: parsed.doctorPhone ?? defaultLabSettings.doctorPhone,
      doctorEmail: parsed.doctorEmail ?? defaultLabSettings.doctorEmail,
      labName: parsed.labName ?? defaultLabSettings.labName,
      labAddress: parsed.labAddress ?? defaultLabSettings.labAddress,
      labPhone: parsed.labPhone ?? defaultLabSettings.labPhone,
    }
  } catch {
    return { ...defaultLabSettings }
  }
}

export function saveLabSettings(settings: LabSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
