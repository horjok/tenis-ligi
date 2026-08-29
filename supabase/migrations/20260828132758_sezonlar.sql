-- ============================================================================
-- Faz 4 / Adım 1 — Sezonlar
--
-- Sezon SADECE bir tarih aralığıdır. Maç kayıtlarına sezon kimliği YAZILMIYOR.
-- Bir maçın hangi sezona ait olduğu her seferinde `matches.played_at`'ten
-- hesaplanıyor. Böylece sezon tarihi değiştiğinde tek bir maç satırına bile
-- dokunmak gerekmiyor.
--
-- ---------------------------------------------------------------------------
-- SEZON KAZANCI NEDEN rating_history.created_at İLE SÜZÜLEMEZ?
--
-- Doğal refleks "rating_history'yi tarihe göre süz" demek. Çalışmaz:
-- `recalculate_ratings()` tüm geçmişi silip baştan yazıyor, dolayısıyla
-- created_at maçın oynandığı anı değil, son yeniden hesaplama anını tutuyor.
-- Ölçüldü: 112 satırın hepsi aynı dakikaya düşmüş durumda.
--
-- Tek güvenilir kaynak `matches.played_at`. Görünüm oradan gidiyor.
-- ---------------------------------------------------------------------------

create extension if not exists btree_gist with schema extensions;

create table public.seasons (
  id         uuid primary key default gen_random_uuid(),
  league_id  uuid not null references public.leagues (id) on delete cascade,
  name       text not null,
  starts_on  date not null,
  -- Boş = sezon hâlâ sürüyor. Aşağıdaki aralık ifadesi bunu üst sınırsız
  -- aralık olarak ele alıyor, ayrı bir kural gerekmiyor.
  ends_on    date,
  created_at timestamptz not null default now(),

  constraint seasons_ad_uzunlugu check (
    char_length(btrim(name)) between 2 and 60
  ),
  constraint seasons_tarih_sirasi check (
    ends_on is null or ends_on >= starts_on
  ),

  -- Çakışma engeli uygulamada değil, burada.
  --
  -- Uygulamada "çakışan sezon var mı" diye sorup sonra eklemek yeterli
  -- görünür ama iki admin aynı anda sezon açarsa ikisi de "yok" cevabını
  -- alır ve iki çakışan sezon oluşur. Dışlama kısıtı bu yarışı imkânsız
  -- kılıyor: ikinci ekleme veritabanı tarafından reddedilir.
  --
  -- `league_id with =` kısmı için btree_gist gerekiyor; gist tek başına
  -- uuid eşitliğini bilmiyor.
  constraint seasons_cakisma exclude using gist (
    league_id with =,
    daterange(starts_on, ends_on, '[]') with &&
  )
);

create index seasons_league_baslangic_idx
  on public.seasons (league_id, starts_on desc);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.seasons enable row level security;

create policy seasons_secim on public.seasons
  for select to authenticated
  using ((select private.aktif_uye_mi(league_id)));

create policy seasons_admin_ekleme on public.seasons
  for insert to authenticated
  with check ((select private.lig_admini_mi(league_id)));

create policy seasons_admin_guncelleme on public.seasons
  for update to authenticated
  using ((select private.lig_admini_mi(league_id)))
  with check ((select private.lig_admini_mi(league_id)));

create policy seasons_admin_silme on public.seasons
  for delete to authenticated
  using ((select private.lig_admini_mi(league_id)));

revoke all on public.seasons from anon;

-- ----------------------------------------------------------------------------
-- Sezon sıralaması
-- ----------------------------------------------------------------------------
-- Şampiyon "en yüksek Elo'ya sahip" değil, "o sezon en çok Elo KAZANAN".
-- O yüzden rating_after - rating_before toplamı.
--
-- security_invoker = true OLMAZSA bu görünüm RLS'i atlar ve lig üyesi
-- olmayanlara da açılır. Faz 1'de aynı tuzağa düşmüştük.
create view public.sezon_puanlari
with (security_invoker = true) as
select s.id        as season_id,
       s.league_id,
       s.name      as sezon_adi,
       rh.user_id,
       p.display_name,
       p.username,
       sum(rh.rating_after - rh.rating_before)            as kazanc,
       count(*)::integer                                  as mac,
       count(*) filter (where m.winner_team = mp.team_no)::integer as galibiyet
from public.seasons s
join public.matches m
       on m.league_id = s.league_id
      and m.status = 'played'
      -- Sezon sınırları İstanbul tarihine göre; iki uç da dahil.
      and (m.played_at at time zone 'Europe/Istanbul')::date
          <@ daterange(s.starts_on, s.ends_on, '[]')
join public.rating_history   rh on rh.match_id = m.id
join public.match_participants mp on mp.match_id = m.id and mp.user_id = rh.user_id
join public.profiles          p  on p.id = rh.user_id
group by s.id, s.league_id, s.name, rh.user_id, p.display_name, p.username;
