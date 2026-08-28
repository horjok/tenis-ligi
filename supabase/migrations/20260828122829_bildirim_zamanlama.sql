-- ============================================================================
-- Faz 3 / Adım 4 — Günlük bildirimin zamanlanması
--
-- pg_cron veritabanının içinde çalışır, Edge Function dışarıda. Aradaki
-- köprü pg_net: Postgres'ten HTTP isteği atmayı sağlıyor.
--
-- SIRLAR CRON TANIMINDA DURMUYOR.
-- `cron.job.command` düz metindir ve veritabanını okuyabilen görür. O yüzden
-- komut sadece `select private.gunluk_bildirim_tetikle();` — sırlar Vault'ta,
-- fonksiyon oradan okuyor.
--
-- Vault'ta duran sır, servis anahtarı DEĞİL, yalnızca bu işi tetiklemeye
-- yarayan ayrı bir değer. Sızsa bile elde edilen tek yetki "günlük maili
-- başlat" oluyor; veritabanına erişim vermiyor.
-- ============================================================================

create extension if not exists pg_net with schema extensions;

create or replace function private.gunluk_bildirim_tetikle()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_pub text;
  v_sir text;
  v_istek bigint;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'bildirim_fonksiyon_url';
  select decrypted_secret into v_pub
    from vault.decrypted_secrets where name = 'bildirim_publishable_key';
  select decrypted_secret into v_sir
    from vault.decrypted_secrets where name = 'bildirim_cron_secret';

  if v_url is null or v_pub is null or v_sir is null then
    -- Sessizce geçmiyoruz: eksik yapılandırma her gün günlüğe düşsün.
    raise warning 'Bildirim sırları Vault''ta eksik; günlük iş tetiklenmedi.';
    return null;
  end if;

  -- Authorization: publishable anahtar. Supabase'in kapısı orada geçerli bir
  -- anahtar görmek istiyor; publishable zaten herkese açık, burada durması
  -- bir şey sızdırmıyor. Asıl yetki x-cron-secret başlığında.
  select net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || v_pub,
                 'x-cron-secret', v_sir
               ),
    body    := jsonb_build_object('kind', 'gunluk'),
    timeout_milliseconds := 60000
  ) into v_istek;

  return v_istek;
end;
$$;

revoke execute on function private.gunluk_bildirim_tetikle()
  from public, anon, authenticated, service_role;

-- Her gün 06:00 UTC = 09:00 İstanbul.
-- Türkiye kalıcı UTC+3, yaz saati yok — sabit offset güvenli.
select cron.schedule(
  'gunluk-bildirim',
  '0 6 * * *',
  $cron$ select private.gunluk_bildirim_tetikle(); $cron$
);
