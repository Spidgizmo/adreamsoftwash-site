export const PORTAL_PASSWORD_MIN_LENGTH = 8;

export const PORTAL_PASSWORD_REQUIREMENTS =
  "Use at least 8 characters with at least one uppercase letter, one lowercase letter, and one special character.";

export function portalPasswordErrors(password: string): string[] {
  const errors: string[] = [];
  if (password.length < PORTAL_PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PORTAL_PASSWORD_MIN_LENGTH} characters.`);
  }
  if (!/[A-Z]/.test(password)) errors.push("Password needs at least one uppercase letter.");
  if (!/[a-z]/.test(password)) errors.push("Password needs at least one lowercase letter.");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("Password needs at least one special character.");
  return errors;
}

export function isValidPortalPassword(password: string | null | undefined): password is string {
  return typeof password === "string" && portalPasswordErrors(password).length === 0;
}
