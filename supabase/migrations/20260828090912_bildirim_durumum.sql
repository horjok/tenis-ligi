-- ============================================================================
-- Faz 3 / Adım 2 — Profil ekranının okuyacağı durum
--
-- Ekran "arda@x.com adresine link gönderildi, tıkla" diyebilmeli. Ama
-- email_verifications tablosu tarayıcıya tamamen kapalı (token orada).
--
-- Bu fonksiyon bekleyen ADRESİ ve son geçerlilik zamanını döndürür,
-- TOKEN'I DÖNDÜRMEZ. Token'ı görebilen kişi linke tıklamadan kendini
-- doğrulayabilirdi; ekranın ona ihtiyacı yok.
--
-- Yalnızca çağıranın kendi satırı: p_user_id parametresi bilerek yok.
-- ============================================================================

create or replace function public.bildirim_durumum()
returns table (
  email                   text,
  email_verified_at       timestamptz,
  opt_in                  boolean,
  bekleyen_email          text,
  bekleyen_son_gecerlilik timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select s.email,
         s.email_verified_at,
         s.opt_in,
         v.email      as bekleyen_email,
         v.expires_at as bekleyen_son_gecerlilik
  from public.notification_settings s
  left join lateral (
    select ev.email, ev.expires_at
    from public.email_verifications ev
    where ev.user_id = s.user_id
      and ev.used_at is null
      and ev.expires_at > now()
    order by ev.created_at desc
    limit 1
  ) v on true
  where s.user_id = (select auth.uid());
$$;

-- Kapatmak için HEM public'ten HEM rollerden geri almak gerekiyor;
-- biri eksik kalırsa fonksiyon açık kalır (bkz. bildirim_yetki_duzeltmesi).
revoke execute on function public.bildirim_durumum() from public, anon;
grant  execute on function public.bildirim_durumum() to authenticated;
