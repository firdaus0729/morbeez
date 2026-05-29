/** Client-side checks before calling auth APIs (server validates again). */

export const STAFF_PASSWORD_MIN = 8;

export function validatePasswordPair(
  password: string,
  confirmPassword: string
): string | null {
  if (password.length < STAFF_PASSWORD_MIN) {
    return `Password must be at least ${STAFF_PASSWORD_MIN} characters`;
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return null;
}
