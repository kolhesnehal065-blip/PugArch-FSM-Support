const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_NUMBER_PATTERN = /^\d{10}$/;

export function validateEmailAddress(email: string | null | undefined): string {
  const value = typeof email === "string" ? email.trim() : "";
  if (!value) return "Email Address is required.";
  if (!EMAIL_PATTERN.test(value)) return "Enter a valid email address.";
  return "";
}

export function validateContactNumber(phone: string | null | undefined): string {
  const value = typeof phone === "string" ? phone.trim() : "";
  if (!value) return "Contact Number is required.";
  if (!CONTACT_NUMBER_PATTERN.test(value)) return "Contact Number must contain exactly 10 digits.";
  return "";
}

export function sanitizeContactNumber(phone: string): string {
  return phone.replace(/\D/g, "").slice(0, 10);
}
