-- ============================================================================
-- Faz 3 / Adım 1 — Bildirim şeması
--
-- PROMPTTAN SAPMA: adres neden `profiles`'a eklenmedi?
-- Faz 1'deki `profiles_secim` politikası ligdeki herkesin birbirinin profil
-- satırının TAMAMINI okumasına izin veriyor. E-postayı oraya koysaydık
-- herkesin adresi ligdeki herkese açılırdı. Postgres'te RLS sütun bazında
-- kısıtlayamaz. Ayrı tablo + "sadece kendi satırın" politikası daha güvenli.
--
-- auth.users.email (<kullaniciadi>@tenis-ligi.local) DEĞİŞTİRİLMİYOR.
-- Giriş kimliği ona bağlı. Buradaki `email` sadece bildirim için.
-- ============================================================================

create table public.notification_settings (
  user_id           uuid primary key references auth.users (id) on delete cascade,

  -- Yalnızca DOĞRULANMIŞ adres buraya yazılır. Ham adres email_verifications'ta
  -- bekler; link tıklanana kadar buraya geçmez. Böylece "bu sütunda ne varsa
  -- gönderilebilir" kuralı hep doğru kalıyor.
  email             text,
  email_verified_at timestamptz,
  opt_in            boolean not null default true,

  -- İptal linki bu token'ı taşır, kullanıcı kimliğini değil. Token'dan
  -- kullanıcıya gidilebilir ama kullanıcıdan token üretilemez.
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at        timestamptz not null default now(),

  constraint notification_settings_email_bicimi check (
    email is null or email ~ '^[^@[:space:]]+@[^@[:space:].]+(\.[^@[:space:].]+)+$'
  ),
  constraint notification_settings_dogrulama_tutarli check (
    (email is null) = (email_verified_at is null)
  )
);

create unique index notification_settings_iptal_token_idx
  on public.notification_settings (unsubscribe_token);

create table public.email_verifications (
  token      uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  used_at    timestamptz,
  sent_at    timestamptz
);

create index email_verifications_bekleyen_idx
  on public.email_verifications (user_id, created_at desc)
  where used_at is null;

create table public.notification_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  sent_at     timestamptz not null default now(),
  kind        text not null,
  match_count integer not null,

  -- RESEND_API_KEY yokken sistem çalışır ama göndermez; o çalışmalar
  -- buraya dry_run = true olarak düşer.
  dry_run     boolean not null default false,

  constraint notification_log_kind_check check (kind in ('daily_proposals')),
  constraint notification_log_match_count_check check (match_count >= 0)
);

-- "Aynı gün ikinci mail gitmesin" kuralı burada, uygulamada değil.
-- Uygulama katmanında kontrol etmek yeterli görünür ama iş iki kez aynı anda
-- tetiklenirse ikisi de "hayır" cevabını alır ve iki mail gider. Benzersiz
-- indeks bu yarışı imkânsız kılıyor.
--
-- timezone(text, timestamptz) IMMUTABLE'dır (oturumun TimeZone ayarına
-- bakmaz), o yüzden indeks ifadesinde kullanılabiliyor. date_trunc STABLE
-- olduğu için kullanılamazdı.
--
-- dry_run anahtara dahil: kuru çalışma o günü "harcamasın", anahtar
-- sonradan eklendiğinde o gün de gerçek mail gidebilsin.
create unique index notification_log_gunde_bir_idx
  on public.notification_log (
    user_id, kind, dry_run, ((sent_at at time zone 'Europe/Istanbul')::date)
  );

-- handle_new_user'a dokunmuyoruz — çalışan kayıt akışını değiştirmenin riski,
-- ayrı bir trigger eklemenin maliyetinden büyük.
create or replace function private.bildirim_ayari_ac()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function private.bildirim_ayari_ac()
  from public, anon, authenticated, service_role;

create trigger profiles_bildirim_ayari
  after insert on public.profiles
  for each row execute function private.bildirim_ayari_ac();

insert into public.notification_settings (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

alter table public.notification_settings enable row level security;
alter table public.email_verifications   enable row level security;
alter table public.notification_log      enable row level security;

create policy bildirim_ayari_secim on public.notification_settings
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy bildirim_ayari_guncelleme on public.notification_settings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke insert, update, delete on public.notification_settings from anon, authenticated;
grant  update (opt_in) on public.notification_settings to authenticated;

-- Politika yazmıyoruz: RLS açık ve politika yoksa hiçbir satır görünmez.
-- Bu tablolara yalnızca SECURITY DEFINER fonksiyonlar ve service_role dokunur.
revoke all on public.email_verifications from anon, authenticated;
revoke all on public.notification_log    from anon, authenticated;
