-- ============================================================================
-- Tenis Ligi — Faz 1 şeması
--
-- Bu migration tabloları, kısıtları ve kayıt (signup) akışını kurar.
-- RLS politikaları bir sonraki migration'da. Burada tüm tablolarda RLS
-- AÇILIR ama politika yazılmaz — Postgres'te politikasız RLS "hiç kimse
-- erişemez" demektir, yani güvenli taraf. Politikalar eklenene kadar
-- tablolara sadece trigger'lar ve SECURITY DEFINER fonksiyonlar dokunabilir.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- private şeması: API'ye açılmayan yardımcılar
-- ----------------------------------------------------------------------------
-- config.toml'daki `schemas` listesinde olmadığı için PostgREST bu şemayı
-- hiç görmez. SECURITY DEFINER fonksiyonların doğru evi burası.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Enum'lar
-- ----------------------------------------------------------------------------
create type public.match_type as enum ('singles', 'doubles');
create type public.match_status as enum ('proposed', 'accepted', 'played', 'cancelled', 'expired');
create type public.league_member_status as enum ('pending', 'active', 'left');
create type public.league_role as enum ('player', 'admin');

-- ----------------------------------------------------------------------------
-- profiles — oyuncu kimliği
-- ----------------------------------------------------------------------------
-- auth.users'da sadece kimlik doğrulama verisi var. Kullanıcı adı ve puan
-- tablosunda görünecek isim burada durur; SQL'de join edilebilsin diye.
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique,
  display_name text not null,
  created_at   timestamptz not null default now(),

  constraint profiles_username_format
    check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_display_name_length
    check (char_length(btrim(display_name)) between 2 and 40)
);

comment on column public.profiles.username is
  'Giriş için kullanılan ad. Supabase''e <username>@tenis-ligi.local olarak yazılır.';

-- ----------------------------------------------------------------------------
-- leagues
-- ----------------------------------------------------------------------------
create table public.leagues (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 2 and 60),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- league_members — hesap ≠ lig üyeliği
-- ----------------------------------------------------------------------------
create table public.league_members (
  id        uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  status    public.league_member_status not null default 'pending',
  role      public.league_role not null default 'player',
  joined_at timestamptz,

  unique (league_id, user_id)
);

-- (league_id, user_id) unique indeksi league_id sorgularını zaten karşılıyor.
-- Ters yön için ayrı indeks gerekiyor: "bu kullanıcı hangi liglerde?"
create index league_members_user_id_idx on public.league_members (user_id);

-- ----------------------------------------------------------------------------
-- invite_codes — kayıt kapısı
-- ----------------------------------------------------------------------------
-- Kayıt herkese açık değil: geçerli bir davet kodu olan kişi kayıt olur ve
-- lige DOĞRUDAN active üye olarak girer. Ayrı bir admin onayı yok.
create table public.invite_codes (
  id         uuid primary key default gen_random_uuid(),
  league_id  uuid not null references public.leagues (id) on delete cascade,
  code       text not null unique,
  max_uses   integer not null default 1 check (max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),

  constraint invite_codes_not_overused check (used_count <= max_uses),
  constraint invite_codes_format check (code ~ '^[A-Z0-9-]{6,32}$')
);

create index invite_codes_league_id_idx on public.invite_codes (league_id);
create index invite_codes_created_by_idx on public.invite_codes (created_by);

-- ----------------------------------------------------------------------------
-- matches
-- ----------------------------------------------------------------------------
create table public.matches (
  id          uuid primary key default gen_random_uuid(),
  league_id   uuid not null references public.leagues (id) on delete cascade,
  match_type  public.match_type not null default 'singles',
  status      public.match_status not null default 'played',
  winner_team smallint check (winner_team in (1, 2)),
  played_at   timestamptz not null,
  location    text check (location is null or char_length(location) <= 120),
  created_by  uuid not null references auth.users (id),
  created_at  timestamptz not null default now(),

  -- "Kazanan zorunlu" kuralı burada, veritabanı seviyesinde.
  -- Frontend'i atlayıp API'ye doğrudan istek atsan da geçemezsin.
  constraint matches_winner_required_when_played
    check (status <> 'played' or winner_team is not null)
);

-- Puan tablosu ve maç geçmişi hep "bu ligin maçları, yeniden eskiye" diye
-- sorguluyor. Bileşik indeks tam bu erişim düzenine göre.
create index matches_league_played_at_idx on public.matches (league_id, played_at desc);
create index matches_created_by_idx on public.matches (created_by);

-- ----------------------------------------------------------------------------
-- match_participants — oyuncular ayrı tabloda
-- ----------------------------------------------------------------------------
-- Bilinçli karar: matches tablosunda player1_id/player2_id YOK.
-- Çiftler geldiğinde bu tabloya 4 satır yazılır, şema değişmez.
create table public.match_participants (
  match_id    uuid not null references public.matches (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  team_no     smallint not null check (team_no in (1, 2)),
  accepted_at timestamptz,

  primary key (match_id, user_id)
);

create index match_participants_user_id_idx on public.match_participants (user_id);

-- ----------------------------------------------------------------------------
-- match_sets — set skorları (opsiyonel)
-- ----------------------------------------------------------------------------
create table public.match_sets (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches (id) on delete cascade,
  set_no      smallint not null check (set_no between 1 and 5),
  team1_games smallint not null check (team1_games between 0 and 99),
  team2_games smallint not null check (team2_games between 0 and 99),

  unique (match_id, set_no)
);

-- ----------------------------------------------------------------------------
-- ratings — Elo puanları
-- ----------------------------------------------------------------------------
-- Birincil anahtarda match_type var: tekler ve çiftler ayrı puan havuzu.
-- rating numeric, integer değil — Elo küsuratlı üretir. Her maçta yuvarlarsak
-- hata birikir; yuvarlamayı sadece ekranda yapıyoruz.
create table public.ratings (
  league_id      uuid not null references public.leagues (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  match_type     public.match_type not null,
  rating         numeric(8, 3) not null default 1000,
  matches_played integer not null default 0 check (matches_played >= 0),

  primary key (league_id, user_id, match_type)
);

create index ratings_user_id_idx on public.ratings (user_id);

-- ----------------------------------------------------------------------------
-- rating_history — "puanım neden düştü?"
-- ----------------------------------------------------------------------------
create table public.rating_history (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid not null references public.matches (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  rating_before numeric(8, 3) not null,
  rating_after  numeric(8, 3) not null,
  created_at    timestamptz not null default now(),

  unique (match_id, user_id)
);

create index rating_history_user_id_idx on public.rating_history (user_id);

-- ============================================================================
-- Kayıt akışı
-- ============================================================================

-- ----------------------------------------------------------------------------
-- private.handle_new_user — kaydın atomik kısmı
-- ----------------------------------------------------------------------------
-- auth.users'a yeni satır eklendiğinde AYNI transaction'da çalışır:
--   davet kodunu doğrular → profiles satırını açar → lige active üye yapar.
-- Kod geçersizse exception fırlatır; INSERT geri alınır, hesap oluşmaz.
--
-- Neden trigger? Çünkü kayıt Auth API üzerinden yapılıyor. Kontrolü sadece
-- sunucu kodunda yapsaydık, Auth API'ye doğrudan istek atan biri davet
-- kodunu tamamen atlayarak hesap açabilirdi.
--
-- raw_user_meta_data kullanıcının kendi yazabildiği bir alan. Burada yetki
-- kararı için DEĞİL, doğrulanan bir arama anahtarı olarak kullanılıyor:
-- kod invite_codes tablosuna karşı kontrol ediliyor.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username     text;
  v_display_name text;
  v_code         text;
  v_invite       public.invite_codes%rowtype;
begin
  v_username     := lower(btrim(new.raw_user_meta_data ->> 'username'));
  v_display_name := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  v_code         := upper(btrim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));

  if v_username is null or v_username = '' then
    raise exception 'Kullanıcı adı zorunlu.' using errcode = 'check_violation';
  end if;

  if v_display_name = '' then
    v_display_name := v_username;
  end if;

  -- Kodu kilitleyerek oku: iki kişi aynı anda son hakkı kullanamasın.
  select * into v_invite
  from public.invite_codes
  where code = v_code
  for update;

  if not found then
    raise exception 'Davet kodu geçersiz.' using errcode = 'check_violation';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'Davet kodunun süresi dolmuş.' using errcode = 'check_violation';
  end if;

  if v_invite.used_count >= v_invite.max_uses then
    raise exception 'Davet kodunun kullanım hakkı dolmuş.' using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, v_display_name);

  insert into public.league_members (league_id, user_id, status, role, joined_at)
  values (v_invite.league_id, new.id, 'active', 'player', now());

  update public.invite_codes
  set used_count = used_count + 1
  where id = v_invite.id;

  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated, service_role;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ----------------------------------------------------------------------------
-- Kayıt formu için ön kontrol fonksiyonları
-- ----------------------------------------------------------------------------
-- Yukarıdaki trigger kuralı uygular ama hatası kullanıcıya "Database error"
-- diye ulaşır. Bu iki fonksiyon forma anlaşılır mesaj verebilmek için var.
-- Kural yine de trigger'da — bunlar sadece nezaket katmanı.
--
-- Kayıt olacak kişi henüz giriş yapmamış olduğu için `anon` rolüyle çağırır.
-- Bu yüzden dönüş değerleri kasıtlı olarak sadece boolean: tablodan hiçbir
-- veri sızmaz.

create or replace function public.kullanici_adi_musait_mi(p_username text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select not exists (
    select 1 from public.profiles
    where username = lower(btrim(p_username))
  );
$$;

create or replace function public.davet_kodu_gecerli_mi(p_code text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.invite_codes
    where code = upper(btrim(p_code))
      and used_count < max_uses
      and (expires_at is null or expires_at > now())
  );
$$;

grant execute on function public.kullanici_adi_musait_mi(text) to anon, authenticated;
grant execute on function public.davet_kodu_gecerli_mi(text) to anon, authenticated;

-- ============================================================================
-- RLS: hepsini aç. Politikalar bir sonraki migration'da.
-- ============================================================================
alter table public.profiles           enable row level security;
alter table public.leagues            enable row level security;
alter table public.league_members     enable row level security;
alter table public.invite_codes       enable row level security;
alter table public.matches            enable row level security;
alter table public.match_participants enable row level security;
alter table public.match_sets         enable row level security;
alter table public.ratings            enable row level security;
alter table public.rating_history     enable row level security;

-- ============================================================================
-- Seed: tek lig + bootstrap davet kodu
-- ============================================================================
-- Yumurta-tavuk problemi: davet kodu üretecek admin ekranına girmek için
-- önce kayıt olmak, kayıt olmak için koda ihtiyaç var. Bu kod o düğümü çözer.
--
-- ÖNEMLİ: bu kod git'e giriyor. Arda kayıt olduktan sonra admin ekranından
-- yeni kod üretip bunu iptal etmeli (max_uses'ı düşürmek yeterli).
insert into public.leagues (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Tenis Ligi')
on conflict (id) do nothing;

insert into public.invite_codes (league_id, code, max_uses)
values ('00000000-0000-0000-0000-000000000001', 'KURULUM-2026', 20)
on conflict (code) do nothing;
