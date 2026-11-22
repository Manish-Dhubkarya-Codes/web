const NATIONAL_LENGTH = 10;

export function digitsOnly(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits.slice(0, NATIONAL_LENGTH);
}

export function formatNational(digits: string): string {
  const clean = digitsOnly(digits);
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)} ${clean.slice(5)}`;
}

export function isValidNational(nationalDigits: string): boolean {
  return digitsOnly(nationalDigits).length === NATIONAL_LENGTH;
}
