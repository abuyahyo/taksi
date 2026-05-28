-- Барча public жадвалларда Row-Level Security (RLS) ёқиш.
--
-- НИМА УЧУН: Supabase'нинг авто Data API (PostgREST + очиқ `anon` калит) RLS
-- ёқилмаган жадвалларни ҲАР КИМГА ўқиш/ёзиш/ўчириш учун очиб қўяди
-- (Supabase advisor огоҳлантириши: `rls_disabled_in_public`).
--
-- БИЗГА ХАВФСИЗ: Бизнинг backend Supabase авто-API'сини ИШЛАТМАЙДИ — у `pg`
-- орқали `postgres` роли билан уланади (жадвалларнинг эгаси + BYPASSRLS), бу
-- роль RLS'ни четлаб ўтади. Frontend ҳам Supabase'га тўғридан уланмайди.
-- Шунинг учун политика қўшмаймиз: anon/authenticated учун дефолт = тўлиқ DENY,
-- backend эса ҳеч таъсирсиз ишлайверади. FORCE ИШЛАТМАЙМИЗ (у эгага ҳам RLS'ни
-- мажбурлаб, backend'ни синдирарди).
--
-- ИДЕМПОТЕНТ: ENABLE RLS бир неча марта чақирилса ҳам хавфсиз; цикл барча
-- public жадвалларни (schema drift'ни ҳам) автомат қамраб олади.
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;
