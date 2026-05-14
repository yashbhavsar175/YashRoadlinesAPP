/**
 * SplashDiagnosticsService.ts
 *
 * Splash screen pe kya hua — har step ka time, result, aur error
 * AsyncStorage mein save hota hai. Admin Panel se dekh sakte ho.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'splash_diagnostics_logs';
const MAX_LOGS = 30; // Last 30 splash attempts store karo

export interface SplashStep {
  step: string;         // Step ka naam
  status: 'start' | 'ok' | 'timeout' | 'error' | 'info';
  durationMs?: number;  // Kitna time laga (ms)
  detail?: string;      // Extra info ya error message
  ts: string;           // ISO timestamp
}

export interface SplashDiagnosticsReport {
  sessionId: string;    // Unique ID for this launch
  launchTime: string;   // App open hua kab
  resolvedScreen: string | null;  // Kahan navigate hua
  totalDurationMs: number;
  steps: SplashStep[];
  hangDetected: boolean;  // Kya splash pe atka?
  hangStep?: string;      // Kis step pe atka?
}

class SplashDiagnosticsService {
  private static instance: SplashDiagnosticsService;
  private currentReport: SplashDiagnosticsReport | null = null;
  private stepStartTimes: Map<string, number> = new Map();
  private launchStartTime = 0;

  static getInstance(): SplashDiagnosticsService {
    if (!SplashDiagnosticsService.instance) {
      SplashDiagnosticsService.instance = new SplashDiagnosticsService();
    }
    return SplashDiagnosticsService.instance;
  }

  /** Naya splash attempt shuru karo */
  startSession() {
    this.launchStartTime = Date.now();
    this.stepStartTimes.clear();
    this.currentReport = {
      sessionId: `splash_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      launchTime: new Date().toISOString(),
      resolvedScreen: null,
      totalDurationMs: 0,
      steps: [],
      hangDetected: false,
    };
    this._addStep('session_start', 'start', undefined, 'Splash session started');
  }

  /** Ek step shuru karo — timer start */
  beginStep(stepName: string) {
    this.stepStartTimes.set(stepName, Date.now());
    this._addStep(stepName, 'start');
  }

  /** Step successfully complete hua */
  endStep(stepName: string, detail?: string) {
    const start = this.stepStartTimes.get(stepName);
    const duration = start ? Date.now() - start : undefined;
    this._addStep(stepName, 'ok', duration, detail);
    this.stepStartTimes.delete(stepName);
  }

  /** Step timeout hua */
  timeoutStep(stepName: string, detail?: string) {
    const start = this.stepStartTimes.get(stepName);
    const duration = start ? Date.now() - start : undefined;
    this._addStep(stepName, 'timeout', duration, detail || 'Timed out');
    this.stepStartTimes.delete(stepName);

    if (this.currentReport && !this.currentReport.hangDetected) {
      this.currentReport.hangDetected = true;
      this.currentReport.hangStep = stepName;
    }
  }

  /** Step mein error aaya */
  errorStep(stepName: string, error: any) {
    const start = this.stepStartTimes.get(stepName);
    const duration = start ? Date.now() - start : undefined;
    const msg = error instanceof Error ? error.message : String(error);
    this._addStep(stepName, 'error', duration, msg);
    this.stepStartTimes.delete(stepName);
  }

  /** Extra info log karo (koi step nahi, sirf note) */
  info(note: string) {
    this._addStep('info', 'info', undefined, note);
  }

  /** Session khatam — screen resolve hua, save karo */
  async finishSession(resolvedScreen: string) {
    if (!this.currentReport) return;
    this.currentReport.resolvedScreen = resolvedScreen;
    this.currentReport.totalDurationMs = Date.now() - this.launchStartTime;
    this._addStep('session_end', 'ok', this.currentReport.totalDurationMs,
      `Navigated to: ${resolvedScreen}`);
    await this._saveReport(this.currentReport);
    this.currentReport = null;
  }

  /** Hard timeout — splash pe atka, forcefully save karo */
  async forceFinishSession(reason: string) {
    if (!this.currentReport) return;
    this.currentReport.resolvedScreen = 'Login (forced)';
    this.currentReport.totalDurationMs = Date.now() - this.launchStartTime;
    this.currentReport.hangDetected = true;
    this.currentReport.hangStep = this.currentReport.hangStep || reason;
    this._addStep('force_finish', 'timeout', this.currentReport.totalDurationMs, reason);
    await this._saveReport(this.currentReport);
    this.currentReport = null;
  }

  /** Saare saved reports fetch karo */
  async getAllReports(): Promise<SplashDiagnosticsReport[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as SplashDiagnosticsReport[];
    } catch {
      return [];
    }
  }

  /** Saare logs clear karo */
  async clearAllReports() {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  /** Latest report ka summary text — share karne ke liye */
  async getLatestSummaryText(): Promise<string> {
    const reports = await this.getAllReports();
    if (reports.length === 0) return 'Koi splash log nahi mila.';
    const r = reports[reports.length - 1];
    const lines: string[] = [
      `=== SPLASH DIAGNOSTICS ===`,
      `Session: ${r.sessionId}`,
      `Launch: ${r.launchTime}`,
      `Total: ${r.totalDurationMs}ms`,
      `Screen: ${r.resolvedScreen ?? 'unknown'}`,
      `Hang: ${r.hangDetected ? `YES — ${r.hangStep}` : 'No'}`,
      ``,
      `--- Steps ---`,
      ...r.steps.map(s =>
        `[${s.status.toUpperCase()}] ${s.step}${s.durationMs != null ? ` (${s.durationMs}ms)` : ''}${s.detail ? ` — ${s.detail}` : ''}`
      ),
    ];
    return lines.join('\n');
  }

  /** Saare reports ka full text — share karne ke liye */
  async getAllSummaryText(): Promise<string> {
    const reports = await this.getAllReports();
    if (reports.length === 0) return 'Koi splash log nahi mila.';
    return reports.map((r, i) => {
      const lines = [
        `\n=== REPORT #${i + 1} ===`,
        `Session: ${r.sessionId}`,
        `Launch: ${r.launchTime}`,
        `Total: ${r.totalDurationMs}ms`,
        `Screen: ${r.resolvedScreen ?? 'unknown'}`,
        `Hang: ${r.hangDetected ? `YES — ${r.hangStep}` : 'No'}`,
        `Steps:`,
        ...r.steps.map(s =>
          `  [${s.status.toUpperCase()}] ${s.step}${s.durationMs != null ? ` (${s.durationMs}ms)` : ''}${s.detail ? ` — ${s.detail}` : ''}`
        ),
      ];
      return lines.join('\n');
    }).join('\n\n');
  }

  // ---- Private helpers ----

  private _addStep(step: string, status: SplashStep['status'], durationMs?: number, detail?: string) {
    if (!this.currentReport) return;
    this.currentReport.steps.push({ step, status, durationMs, detail, ts: new Date().toISOString() });
  }

  private async _saveReport(report: SplashDiagnosticsReport) {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const existing: SplashDiagnosticsReport[] = raw ? JSON.parse(raw) : [];
      existing.push(report);
      // Only keep last MAX_LOGS
      if (existing.length > MAX_LOGS) existing.splice(0, existing.length - MAX_LOGS);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch (e) {
      console.warn('[SplashDiag] Failed to save report:', e);
    }
  }
}

export default SplashDiagnosticsService.getInstance();
