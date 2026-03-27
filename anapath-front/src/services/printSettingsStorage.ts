import type { PrintSettings } from '../types/domain'
import { defaultPrintSettings } from '../types/domain'

const STORAGE_KEY = 'anapath_print_settings'

export function loadPrintSettings(): PrintSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultPrintSettings }
    const parsed = JSON.parse(raw) as Partial<PrintSettings>
    return {
      sectionSpacing: parsed.sectionSpacing ?? defaultPrintSettings.sectionSpacing,
      labelStyle: parsed.labelStyle ?? defaultPrintSettings.labelStyle,
      conclusionStyle: parsed.conclusionStyle ?? defaultPrintSettings.conclusionStyle,
      fontSize: parsed.fontSize ?? defaultPrintSettings.fontSize,
    }
  } catch {
    return { ...defaultPrintSettings }
  }
}

export function savePrintSettings(settings: PrintSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
