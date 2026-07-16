// Shared types for the install wizard. Mirrors the backend contract at
// GET  /api/v1/install/status
// POST /api/v1/install/run

export interface InstallStatus {
  installed: boolean;
  checks: {
    nodeVersion: string;
    db: 'ok' | 'fail';
    pendingMigrations: number;
  };
}

export type InstallStepStatus = 'ok' | 'error' | 'skipped';

export interface InstallStepResult {
  name: string;
  status: InstallStepStatus;
  detail?: string;
}

export interface InstallRunResponse {
  steps: InstallStepResult[];
  success: boolean;
}

export interface AdminFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export type SupportedLanguage = 'en' | 'sq' | 'it';

export interface WebsiteFormData {
  siteName: string;
  tenantSlug: string;
  defaultLanguage: SupportedLanguage;
}

export interface InstallRunPayload {
  licenseAccepted: true;
  admin: AdminFormData;
  website: WebsiteFormData;
}
