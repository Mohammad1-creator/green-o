-- Occupational health and safety roles. Added on their own: new enum
-- values must be committed before they are used (next migration).
--   hse_manager:    "مدير الصحة والسلامة المهنية", manages the safety
--                   department like the other department managers.
--   hse_supervisor: "مشرف سلامة", records violations from the phone.
alter type public.app_role add value if not exists 'hse_manager' after 'production_manager';
alter type public.app_role add value if not exists 'hse_supervisor' after 'hse_manager';
