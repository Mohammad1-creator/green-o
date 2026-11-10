type DatabaseError = { code?: string; message?: string } | null | undefined;

const FALLBACK = "حدث خطأ غير متوقع. حاول مرة أخرى.";
const ARABIC = /[؀-ۿ]/;

function arabicOr(message: string | undefined, fallback: string): string {
  return message && ARABIC.test(message) ? message : fallback;
}

/**
 * Turns a database or API error into a message for the user. Business rule
 * errors raised by the database functions are already in Arabic.
 */
export function toUserMessage(
  error: DatabaseError,
  fallback = FALLBACK,
): string {
  if (!error) return fallback;
  switch (error.code) {
    case "P0001":
    case "P0002":
      return arabicOr(error.message, fallback);
    case "42501":
      return arabicOr(error.message, "ليست لديك صلاحية لهذا الإجراء");
    case "23505":
      return "هذه القيمة مستخدمة مسبقاً";
    case "23503":
      return "العنصر المرتبط غير موجود";
    case "23514":
    case "22023":
    case "22P02":
      return arabicOr(error.message, "قيمة غير صالحة");
    default:
      return fallback;
  }
}
