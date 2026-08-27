-- ============================================================================
-- Faz 2 / Adım 1 — Müsaitlik dilimleri
--
-- Oyuncular müsait oldukları saatleri işaretler. Eşleştirme (Adım 2) bu
-- tabloyu okuyup çakışanları bulacak.
--
-- Saat dilimi notu: lig Türkiye'de. Türkiye 2016'dan beri kalıcı UTC+3,
-- yaz saati uygulaması yok. Offset tam saat olduğu için UTC'deki saat başı
-- ile İstanbul'daki saat başı aynı ana denk geliyor — aşağıdaki hizalama
-- kontrolü ikisini birden karşılıyor.
-- ============================================================================

create table public.availability_slots (
  id         uuid primary key default gen_random_uuid(),
  league_id  uuid not null references public.leagues (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  slot_start timestamptz not null,
  created_at timestamptz not null default now(),

  -- Aynı anda tek yerde olabilirsin. Bu kısıt aynı zamanda "aynı dilimi
  -- iki kez işaretleme" durumunu da engelliyor.
  unique (user_id, slot_start),

  -- Dilimler saat başı. `date_trunc(text, timestamptz)` STABLE'dır çünkü
  -- oturumun TimeZone ayarına bakar — CHECK kısıtı IMMUTABLE ifade ister.
  -- `at time zone 'UTC'` ile timestamptz'yi timestamp'e çeviriyoruz;
  -- o biçimdeki date_trunc IMMUTABLE.
  constraint availability_slots_saat_basi check (
    date_trunc('hour', slot_start at time zone 'UTC')
      = (slot_start at time zone 'UTC')
  )
);

-- Eşleştirme "şu ligde şu dilimde kimler müsait" diye soracak.
create index availability_slots_league_slot_idx
  on public.availability_slots (league_id, slot_start);

-- Takvim ekranı "benim dilimlerim" diye soracak.
create index availability_slots_user_idx
  on public.availability_slots (user_id);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.availability_slots enable row level security;

-- Ligin aktif üyeleri birbirinin müsaitliğini görür — sistemin çalışması
-- için gerekli: "bu saatte 4 kişi müsait" bilgisi olmadan takvim işe yaramaz.
create policy availability_secim on public.availability_slots
  for select to authenticated
  using ((select private.aktif_uye_mi(league_id)));

-- Yalnızca kendi dilimini ekleyebilirsin.
--
-- Geçmiş dilim engeli neden burada, CHECK kısıtında değil? Çünkü `now()`
-- IMMUTABLE değil — bugün geçerli olan satır yarın geçersiz olur ve tablo
-- kısıtı bunu kaldıramaz. RLS politikası her istekte yeniden değerlendiği
-- için doğru yer burası.
create policy availability_ekleme on public.availability_slots
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select private.aktif_uye_mi(league_id))
    and slot_start > now()
    and slot_start < now() + interval '14 days'
    -- 08:00'de başlayan ilk dilim, 21:00'de başlayan son dilim 22:00'de biter.
    and extract(hour from (slot_start at time zone 'Europe/Istanbul')) between 8 and 21
  );

create policy availability_silme on public.availability_slots
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Güncelleme yok: dilim ya işaretlidir ya değildir.
revoke update on public.availability_slots from anon, authenticated;

-- ----------------------------------------------------------------------------
-- Silme koruması
-- ----------------------------------------------------------------------------
-- İki iş yapıyor:
--   1. O saatte kesinleşmiş maçın varsa müsaitliği kaldırmanı engeller.
--      Sözünü verdiğin maçtan takvimi silerek kaçamazsın.
--   2. Kesinleşmemiş öneriler varsa onları iptal eder. Artık müsait
--      değilsen o dilim için bekleyen önerilerin de anlamı kalmaz.
create or replace function private.musaitlik_silme_kontrolu()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.matches m
    join public.match_participants mp on mp.match_id = m.id
    where mp.user_id = old.user_id
      and m.league_id = old.league_id
      and m.status = 'accepted'
      and m.played_at = old.slot_start
  ) then
    raise exception 'Bu saatte kesinleşmiş bir maçın var, müsaitliği kaldıramazsın.'
      using errcode = 'check_violation';
  end if;

  update public.matches m
  set status = 'cancelled'
  from public.match_participants mp
  where mp.match_id = m.id
    and mp.user_id = old.user_id
    and m.league_id = old.league_id
    and m.status = 'proposed'
    and m.played_at = old.slot_start;

  return old;
end;
$$;

revoke execute on function private.musaitlik_silme_kontrolu()
  from public, anon, authenticated, service_role;

create trigger on_availability_slot_deleted
  before delete on public.availability_slots
  for each row execute function private.musaitlik_silme_kontrolu();
