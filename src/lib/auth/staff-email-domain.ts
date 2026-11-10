/**
 * Supabase Auth signs in with an email address, so each employee number maps
 * to a fixed address under this reserved domain. ".invalid" can never receive
 * mail (RFC 2606), so a password-reset email can never reach anyone.
 *
 * Kept free of imports so the Node scripts in scripts/ can use it directly.
 */
export const STAFF_EMAIL_DOMAIN = "staff.green-o.invalid";
