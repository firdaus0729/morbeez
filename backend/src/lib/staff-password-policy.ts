import { ValidationError } from './errors.js';

export const STAFF_PASSWORD_MIN_LENGTH = 8;
export const STAFF_PASSWORD_MAX_LENGTH = 128;

/** Validate a new staff password (optional confirmation field). */
export function validateStaffPassword(password: string, confirmPassword?: string): void {
  const p = password ?? '';
  if (p.length < STAFF_PASSWORD_MIN_LENGTH) {
    throw new ValidationError(
      `Password must be at least ${STAFF_PASSWORD_MIN_LENGTH} characters`
    );
  }
  if (p.length > STAFF_PASSWORD_MAX_LENGTH) {
    throw new ValidationError(
      `Password must be at most ${STAFF_PASSWORD_MAX_LENGTH} characters`
    );
  }
  if (confirmPassword !== undefined && p !== confirmPassword) {
    throw new ValidationError('Passwords do not match');
  }
}
