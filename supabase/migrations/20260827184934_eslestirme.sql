-- ============================================================================
-- Faz 2 / Adım 2 — Eşleştirme motoru
--
-- Aynı dilimi işaretleyen oyuncular için otomatik maç önerisi üretir.
-- İki tetikleme yolu var (anlık ve haftalık) ama mantık TEK yerde:
-- private.eslestir(). İkisi de onu çağırır.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Şema düzeltmesi: sistemin ürettiği önerinin yaratıcısı yok
-- ----------------------------------------------------------------------------
-- Faz 1'de her maçı bir insan giriyordu, created_by NOT NULL mantıklıydı.
-- Faz 2'de öneriyi sistem üretiyor; kimseyi yaratıcı olarak göstermek yanlış
-- olur. mac_gecmisi görünümü bu sütunu zaten LEFT JOIN ile okuyor, null'a
-- hazır; arayüz de "kaydeden" satırını null ise gizliyor.
alter table public.matches alter column created_by drop not null;

-- ----------------------------------------------------------------------------
-- private.eslestir — tek kaynak
-- ----------------------------------------------------------------------------
-- Verilen lig + dilim için, o dilimde müsait olan oyuncuların BÜTÜN ikili
-- kombinasyonlarına 'proposed' maç açar.
--
-- Havuza girmeme sebepleri:
--   - ligin 'active' üyesi değilse
--   - o saatte zaten kesinleşmiş ('accepted') ya da oynanmış ('played')
--     maçı varsa — o kişi meşgul
--
-- Çift atlanma sebebi:
--   - o çiftin o dilimde ZATEN bir maçı varsa (durumu ne olursa olsun).
--     Durum ayrımı yapmıyoruz: reddedilmiş bir öneriyi tekrar üretmek
--     kullanıcıyı taciz etmek olur. Bir kez soruldu, cevap alındı.
create or replace function private.eslestir(
  p_league_id  uuid,
  p_slot_start timestamptz
)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_cift     record;
  v_match_id uuid;
  v_sayac    integer := 0;
begin
  -- Yarış koşulu koruması: iki kişi aynı anda aynı dilimi işaretlerse
  -- iki tetikleyici paralel çalışır ve aşağıdaki "zaten var mı" kontrolü
  -- ikisinde de boş dönebilir — aynı çifte iki öneri çıkardı.
  -- Bu kilit aynı dilim için eşleştirmeyi sıraya sokuyor; transaction
  -- bitince kendiliğinden bırakılıyor.
  perform pg_advisory_xact_lock(
    hashtext(p_league_id::text || '|' || p_slot_start::text)
  );

  for v_cift in
    with musait as (
      select a.user_id
      from public.availability_slots a
      join public.league_members lm
        on lm.league_id = a.league_id
       and lm.user_id   = a.user_id
       and lm.status    = 'active'
      where a.league_id  = p_league_id
        and a.slot_start = p_slot_start
        and not exists (
          select 1
          from public.matches m
          join public.match_participants mp on mp.match_id = m.id
          where mp.user_id   = a.user_id
            and m.league_id  = p_league_id
            and m.played_at  = p_slot_start
            and m.status in ('accepted', 'played')
        )
    )
    select m1.user_id as oyuncu1, m2.user_id as oyuncu2
    from musait m1
    join musait m2 on m1.user_id < m2.user_id   -- her çift bir kez
    where not exists (
      select 1
      from public.matches m
      join public.match_participants p1
        on p1.match_id = m.id and p1.user_id = m1.user_id
      join public.match_participants p2
        on p2.match_id = m.id and p2.user_id = m2.user_id
      where m.league_id = p_league_id
        and m.played_at = p_slot_start
    )
  loop
    insert into public.matches
      (league_id, match_type, status, played_at, created_by)
    values
      (p_league_id, 'singles', 'proposed', p_slot_start, null)
    returning id into v_match_id;

    insert into public.match_participants (match_id, user_id, team_no)
    values (v_match_id, v_cift.oyuncu1, 1),
           (v_match_id, v_cift.oyuncu2, 2);

    v_sayac := v_sayac + 1;
  end loop;

  return v_sayac;
end;
$fn$;

revoke execute on function private.eslestir(uuid, timestamptz)
  from public, anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Anlık tetikleme
-- ----------------------------------------------------------------------------
-- Kullanıcı bir dilim işaretlediğinde yalnızca O dilim kontrol edilir.
-- Kullanıcı sayfayı yenilediğinde önerisini hazır bulur.
create or replace function private.musaitlik_eklendi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  perform private.eslestir(new.league_id, new.slot_start);
  return null;
end;
$fn$;

revoke execute on function private.musaitlik_eklendi()
  from public, anon, authenticated, service_role;

create trigger on_availability_slot_inserted
  after insert on public.availability_slots
  for each row execute function private.musaitlik_eklendi();

-- ----------------------------------------------------------------------------
-- Haftalık toplu tarama
-- ----------------------------------------------------------------------------
-- Anlık tetikleme yalnızca yeni eklenen dilime bakar. Bu iş, önümüzdeki
-- haftanın tüm dilimlerini tarayarak arada kaçmış olabilecek çakışmaları
-- yakalar (örn. bir oyuncu ligden çıkıp geri döndüyse).
create or replace function private.haftalik_eslestir()
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_dilim  record;
  v_toplam integer := 0;
begin
  for v_dilim in
    select distinct league_id, slot_start
    from public.availability_slots
    where slot_start > now()
      and slot_start < now() + interval '7 days'
    order by slot_start
  loop
    v_toplam := v_toplam + private.eslestir(v_dilim.league_id, v_dilim.slot_start);
  end loop;

  return v_toplam;
end;
$fn$;

revoke execute on function private.haftalik_eslestir()
  from public, anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Zamanlama
-- ----------------------------------------------------------------------------
create extension if not exists pg_cron;

-- Pazartesi 05:00 UTC = 08:00 İstanbul.
-- Türkiye kalıcı UTC+3 kullandığı için bu eşleme yıl boyu sabit.
select cron.schedule(
  'haftalik-eslestirme',
  '0 5 * * 1',
  $cron$ select private.haftalik_eslestir(); $cron$
);
