const ARABIC_INDIC_ZERO = 0x0660;
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0;

/**
 * Converts Arabic-Indic digits (٠١٢) and Persian digits (۰۱۲) to Western
 * digits (012). Arabic phone keyboards often type the former.
 */
export function toWesternDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0);
    const zero =
      code >= EXTENDED_ARABIC_INDIC_ZERO
        ? EXTENDED_ARABIC_INDIC_ZERO
        : ARABIC_INDIC_ZERO;
    return String(code - zero);
  });
}

const DECIMAL = /^-?\d+(\.\d+)?$/;

/**
 * "12.5", "١٢٫٥" or "12,5" → 12.5. Arabic keyboards type "٫" or "," as the
 * decimal point. Returns null when the text is not a plain number.
 */
export function parseDecimal(value: string): number | null {
  const normalized = toWesternDigits(value.trim()).replace(/[٫,]/g, ".");
  return DECIMAL.test(normalized) ? Number(normalized) : null;
}
