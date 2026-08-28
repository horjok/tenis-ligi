-- ============================================================================
-- Faz 3 / Adım 1 — Bildirim fonksiyonları
--
-- Yetki dağılımı:
--   authenticated : eposta_ekle, epostami_sil        (kendi adresi üstünde)
--   anon + auth   : eposta_dogrula, bildirimden_cik  (maildeki linkler)
--   service_role  : gunluk_bildirim_listesi,
--                   dogrulama_maili_verisi           (yalnızca Edge Function)
--
-- Neden dogrulama_maili_verisi tarayıcıya kapalı? Doğrulama token'ını
-- okuyabilen, linke hiç tıklamadan kendini doğrulayabilir. Token yalnızca
-- sunucu tarafında görülür ve oradan doğrudan maile yazılır.
-- ============================================================================

create or replace function public.eposta_ekle(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_email text := lower(btrim(p_email));
  v_son_saatte int;
begin
  if v_uid is null then
    raise exception 'Giriş yapmalısın.' using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1 from public.league_members
    where user_id = v_uid and status = 'active'
  ) then
    raise exception 'Lige üye değilsin.' using errcode = 'insufficient_privilege';
  end if;

  if v_email !~ '^[^@[:space:]]+@[^@[:space:].]+(\.[^@[:space:].]+)+$' then
    raise exception 'Geçerli bir e-posta adresi yaz.' using errcode = 'check_violation';
  end if;

  -- Hız sınırı. Bu fonksiyon bir yabancıya mail göndertebilir: adresi ben
  -- yazıyorum, mail oraya gidiyor. Sınır olmasaydı sistem taciz aracına
  -- dönerdi ve gönderen itibarımız yanardı.
  select count(*) into v_son_saatte
  from public.email_verifications
  where user_id = v_uid and created_at > now() - interval '1 hour';

  if v_son_saatte >= 5 then
    raise exception 'Çok fazla deneme yaptın. Bir saat sonra tekrar dene.'
      using errcode = 'check_violation';
  end if;

  -- Önceki bekleyen linkleri geçersiz kıl: adresini değiştirdiysen eski
  -- linke tıklamak eski adresi doğrulamamalı.
  -- (used_at burada "artık kullanılamaz" demek.)
  update public.email_verifications
  set used_at = now()
  where user_id = v_uid and used_at is null;

  insert into public.email_verifications (user_id, email)
  values (v_uid, v_email);
end;
$$;

-- anon'a açık: link maildeki tarayıcıda, oturum açık olmadan da açılabilir.
-- Güvenliği token sağlıyor (uuid, 122 bit rastgelelik).
create or replace function public.eposta_dogrula(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kayit public.email_verifications%rowtype;
begin
  select * into v_kayit
  from public.email_verifications
  where token = p_token
  for update;

  if not found then
    return jsonb_build_object('durum', 'gecersiz');
  end if;
  if v_kayit.used_at is not null then
    return jsonb_build_object('durum', 'kullanilmis');
  end if;
  if v_kayit.expires_at <= now() then
    return jsonb_build_object('durum', 'suresi_gecti');
  end if;

  update public.notification_settings
  set email             = v_kayit.email,
      email_verified_at = now()
  where user_id = v_kayit.user_id;

  update public.email_verifications
  set used_at = now()
  where user_id = v_kayit.user_id and used_at is null;

  return jsonb_build_object('durum', 'tamam', 'email', v_kayit.email);
end;
$$;

-- Oturum GEREKTİRMEZ. Mailin altındaki linke tıklayanın o an siteye giriş
-- yapmış olmasını bekleyemeyiz; beklersek iptal zorlaşır, insanlar spam'e
-- işaretler ve gönderen itibarımız zarar görür.
create or replace function public.bildirimden_cik(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_etkilenen int;
begin
  update public.notification_settings
  set opt_in = false
  where unsubscribe_token = p_token;

  get diagnostics v_etkilenen = row_count;
  return v_etkilenen > 0;
end;
$$;

create or replace function public.epostami_sil()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Giriş yapmalısın.' using errcode = 'insufficient_privilege';
  end if;

  update public.notification_settings
  set email = null, email_verified_at = null
  where user_id = v_uid;

  update public.email_verifications
  set used_at = now()
  where user_id = v_uid and used_at is null;
end;
$$;

create or replace function public.dogrulama_maili_verisi(p_user_id uuid)
returns table (token uuid, email text, display_name text)
language sql
security definer
set search_path = ''
as $$
  select v.token, v.email, p.display_name
  from public.email_verifications v
  join public.profiles p on p.id = v.user_id
  where v.user_id = p_user_id
    and v.used_at is null
    and v.expires_at > now()
  order by v.created_at desc
  limit 1;
$$;

-- Kimler günlük listeye girer:
--   - doğrulanmış adresi olan
--   - bildirimi kapatmamış
--   - ligin aktif üyesi
--   - CEVABINI BEKLEYEN en az bir önerisi olan
--   - bugün (aynı dry_run kipinde) maili gitmemiş
--
-- "Cevabını bekleyen" seçimi bilinçli: promptta "bekleyen (proposed)
-- öneriler" yazıyor, ama kullanıcının kabul edip rakibini beklediği öneri
-- için yapabileceği bir şey yok. Mailin işi harekete geçirmek.
create or replace function public.gunluk_bildirim_listesi(p_dry boolean default false)
returns table (
  user_id           uuid,
  display_name      text,
  email             text,
  unsubscribe_token uuid,
  oneri_sayisi      integer,
  oneriler          jsonb
)
language sql
security definer
set search_path = ''
as $$
  with bekleyen as (
    select mp.user_id,
           m.played_at,
           rakip.display_name as rakip_ad
    from public.matches m
    join public.match_participants mp on mp.match_id = m.id
    join public.match_participants rakip_mp
           on rakip_mp.match_id = m.id and rakip_mp.user_id <> mp.user_id
    join public.profiles rakip on rakip.id = rakip_mp.user_id
    where m.status = 'proposed'
      and m.played_at > now()
      and mp.accepted_at is null
  )
  select s.user_id,
         p.display_name,
         s.email,
         s.unsubscribe_token,
         count(*)::integer as oneri_sayisi,
         jsonb_agg(
           jsonb_build_object(
             'rakip', b.rakip_ad,
             'ne_zaman', to_char(b.played_at at time zone 'Europe/Istanbul',
                                 'YYYY-MM-DD"T"HH24:MI:SS')
           )
           order by b.played_at
         ) as oneriler
  from public.notification_settings s
  join public.profiles       p  on p.id = s.user_id
  join public.league_members lm on lm.user_id = s.user_id and lm.status = 'active'
  join bekleyen              b  on b.user_id = s.user_id
  where s.email is not null
    and s.opt_in
    and not exists (
      select 1
      from public.notification_log nl
      where nl.user_id = s.user_id
        and nl.kind    = 'daily_proposals'
        and nl.dry_run = p_dry
        and (nl.sent_at at time zone 'Europe/Istanbul')::date
            = (now() at time zone 'Europe/Istanbul')::date
    )
  group by s.user_id, p.display_name, s.email, s.unsubscribe_token;
$$;

-- Postgres'te fonksiyonlar varsayılan olarak PUBLIC'e açıktır; önce kapat.
revoke execute on function public.eposta_ekle(text)                from public;
revoke execute on function public.eposta_dogrula(uuid)             from public;
revoke execute on function public.bildirimden_cik(uuid)            from public;
revoke execute on function public.epostami_sil()                   from public;
revoke execute on function public.dogrulama_maili_verisi(uuid)     from public;
revoke execute on function public.gunluk_bildirim_listesi(boolean) from public;

grant execute on function public.eposta_ekle(text)     to authenticated;
grant execute on function public.epostami_sil()        to authenticated;
grant execute on function public.eposta_dogrula(uuid)  to anon, authenticated;
grant execute on function public.bildirimden_cik(uuid) to anon, authenticated;

-- Yalnızca Edge Function. Tarayıcı bu ikisini çağıramaz.
grant execute on function public.dogrulama_maili_verisi(uuid)      to service_role;
grant execute on function public.gunluk_bildirim_listesi(boolean)  to service_role;
