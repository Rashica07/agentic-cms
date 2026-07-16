import type { AdminFormData, WebsiteFormData } from './types';

export const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export function isValidTenantSlug(slug: string): boolean {
  return TENANT_SLUG_PATTERN.test(slug);
}

export type PasswordStrength = 'weak' | 'fair' | 'strong';

export function passwordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score >= 4) return 'strong';
  if (score >= 2) return 'fair';
  return 'weak';
}

export type AdminFieldErrors = Partial<
  Record<'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword', string>
>;

export function validateAdmin(admin: AdminFormData, confirmPassword: string): AdminFieldErrors {
  const errors: AdminFieldErrors = {};

  if (!admin.firstName.trim()) errors.firstName = 'First name is required.';
  if (!admin.lastName.trim()) errors.lastName = 'Last name is required.';

  if (!admin.email.trim()) errors.email = 'Email is required.';
  else if (!isValidEmail(admin.email)) errors.email = 'Enter a valid email address.';

  if (!admin.password) errors.password = 'Password is required.';
  else if (admin.password.length < 8) errors.password = 'Password must be at least 8 characters.';

  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (confirmPassword !== admin.password) errors.confirmPassword = 'Passwords do not match.';

  return errors;
}

export type WebsiteFieldErrors = Partial<Record<'siteName' | 'tenantSlug', string>>;

export function validateWebsite(website: WebsiteFormData): WebsiteFieldErrors {
  const errors: WebsiteFieldErrors = {};

  if (!website.siteName.trim()) errors.siteName = 'Site name is required.';

  if (!website.tenantSlug.trim()) errors.tenantSlug = 'Tenant slug is required.';
  else if (!isValidTenantSlug(website.tenantSlug)) {
    errors.tenantSlug = 'Use lowercase letters, numbers, and single hyphens (e.g. acme-corp).';
  }

  return errors;
}

/**
 * Hides "required" style errors for fields the user hasn't typed into yet,
 * while still surfacing format errors (bad email, mismatched passwords,
 * invalid slug) as soon as there is content to judge.
 */
export function visibleErrors<K extends string>(
  errors: Partial<Record<K, string>>,
  values: Record<K, string>
): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  (Object.keys(errors) as K[]).forEach((key) => {
    if (values[key] && values[key].length > 0) {
      out[key] = errors[key];
    }
  });
  return out;
}
