/**
 * Currency utility helpers for Ghanaian Cedis (GHS / GH₵).
 * Adheres strictly to the Go backend decimal string conventions.
 */

/**
 * Formats a monetary string or number into standard Ghanaian Cedis representation.
 * Example: "150.00" -> "GH₵ 150.00"
 */
export function formatGHS(amount: string | number | undefined | null): string {
  if (amount === undefined || amount === null || amount === '') {
    return 'GH₵ 0.00';
  }
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numeric)) {
    return 'GH₵ 0.00';
  }
  return `GH₵ ${numeric.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Validates that an amount string is a valid positive number with at most 2 decimal places.
 * Matches backend validation: `!req.Amount.Equal(req.Amount.Round(2))`
 */
export function isValidCurrencyAmount(val: string): { valid: boolean; error?: string } {
  const trimmed = val.trim();
  if (!trimmed) {
    return { valid: false, error: 'Amount is required' };
  }

  // At most 2 decimal digits
  const regex = /^\d+(\.\d{1,2})?$/;
  if (!regex.test(trimmed)) {
    return { valid: false, error: 'Amount can have at most 2 decimal places' };
  }

  const num = parseFloat(trimmed);
  if (isNaN(num) || num <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }

  return { valid: true };
}
