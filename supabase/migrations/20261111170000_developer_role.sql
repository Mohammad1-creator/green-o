-- A fifth role, the developer ("المبرمج"), above the general manager.
-- Added on its own: a new enum value must be committed before it is used,
-- so the permissions that use it are in the next migration.
alter type public.app_role add value if not exists 'developer' before 'general_manager';
