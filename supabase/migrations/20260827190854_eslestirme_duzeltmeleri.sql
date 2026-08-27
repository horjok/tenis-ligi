-- ============================================================================
-- Eşleştirme motoru düzeltmeleri
--
-- Adım 2 uygulandıktan sonra yapılan bağımsız denetimde dört kusur çıktı.
-- Hepsi burada kapatılıyor. En ciddisi 2 numara: gerçek bir kullanıcı
-- senaryosuyla üretilip doğrulandı.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Kilit anahtarı saat dilimine bağlıydı
-- ----------------------------------------------------------------------------
-- Eski hali: hashtext(lig::text || '|' || dilim::text)
--
-- Sorun: timestamptz::text (timestamptz_out) STABLE'dır, IMMUTABLE değil —
-- çıktısı oturumun TimeZone ayarına bağlı. Aynı an, UTC oturumda
-- '2026-09-07 19:00:00+00', İstanbul oturumunda '2026-09-07 22:00:00+03'
-- diye yazılır. Farklı metin, farklı hash, FARKLI KİLİT: iki oturum
-- birbirini beklemez ve aynı çifte iki öneri açılabilir.
--
-- Aynı STABLE/IMMUTABLE tuzağına müsaitlik migration'ında date_trunc için
-- düşmüştük ve orada önlemini almıştık; burada gözden kaçmış.
--
-- Yeni hali epoch üzerinden: epoch mutlak bir sayı, saat diliminden bağımsız.
create or replace function private.dilim_kilit_anahtari(
  p_league_id  uuid,
  p_slot_start timestamptz
)
returns bigint
language sql
stable
set search_path = ''
as $fn$
  select hashtext(
    p_league_id::text || '|' || extract(epoch from p_slot_start)::bigint::text
  )::bigint;
$fn$;

create or replace function private.dilim_kilidi(
  p_league_id  uuid,
  p_slot_start timestamptz
)
returns void
language sql
security definer
set search_path = ''
as $fn$
  select pg_advisory_xact_lock(private.dilim_kilit_anahtari(p_league_id, p_slot_start));
$fn$;

revoke execute on function private.dilim_kilit_anahtari(uuid, timestamptz)
  from public, anon, authenticated, service_role;
revoke execute on function private.dilim_kilidi(uuid, timestamptz)
  from public, anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2) Takvim hücresini aç/kapa yapmak çifti kalıcı olarak kilitliyordu
-- ----------------------------------------------------------------------------
-- KUSUR (üretilerek doğrulandı):
--   1. Ahmet ve Burak aynı dilimi işaretler -> aralarında 'proposed' öneri
--   2. Ahmet yanlışlıkla hücreye tekrar tıklar -> silme tetikleyicisi
--      öneriyi 'cancelled' yapar
--   3. Ahmet hatasını görüp tekrar işaretler
--   4. eslestir()'in çift kontrolü duruma bakmadığı için 'cancelled' satırı
--      "bu çifte zaten soruldu" diye okunur ve çift atlanır
--   5. İkisi de takvimde müsait görünür ama o saat için bir daha ASLA öneri
--      çıkmaz. Haftalık tarama da kurtarmaz. Uygulama içinden düzeltilemez,
--      çünkü matches tablosuna yazma yetkisi hiçbir kullanıcıda yok.
--
-- Zarar tek taraflı da değildi: Ahmet'in yanlış tıklaması, hiçbir şey
-- yapmamış olan Burak'ı da o dilim için kilitliyordu.
--
-- ÇÖZÜM: iptalin sebebini ayırt et.
--   - Kimse kabul etmemişse öneri SİLİNİR. Ortada soru-cevap yoktu, iz
--     bırakmaya değer bir şey olmadı. Kayıt kalmayınca dilim tekrar
--     işaretlendiğinde öneri normal şekilde yeniden doğar.
--   - Biri kabul etmişse 'cancelled' olarak kalır. Orada gerçek bir insan
--     eylemi var; izi korunmalı ve o çift o dilim için tekrar önerilmemeli.
create or replace function private.musaitlik_silme_kontrolu()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  -- Eşleştirme ile aynı kilit: biri müsaitliğini geri çekerken diğer yandan
  -- eslestir() çalışıp geri çekilen dilim için yeni öneri açmasın.
  -- (Denetimde çıkan 3. kusur.)
  perform private.dilim_kilidi(old.league_id, old.slot_start);

  if exists (
    select 1
    from public.matches m
    join public.match_participants mp on mp.match_id = m.id
    where mp.user_id   = old.user_id
      and m.league_id  = old.league_id
      and m.status     = 'accepted'
      and m.played_at  = old.slot_start
  ) then
    raise exception 'Bu saatte kesinleşmiş bir maçın var, müsaitliği kaldıramazsın.'
      using errcode = 'check_violation';
  end if;

  -- Kimsenin dokunmadığı öneriler: sil, iz bırakma.
  delete from public.matches m
  where m.id in (
    select m2.id
    from public.matches m2
    join public.match_participants mp on mp.match_id = m2.id
    where mp.user_id   = old.user_id
      and m2.league_id = old.league_id
      and m2.status    = 'proposed'
      and m2.played_at = old.slot_start
      and not exists (
        select 1 from public.match_participants mp2
        where mp2.match_id = m2.id
          and mp2.accepted_at is not null
      )
  );

  -- Birinin kabul ettiği öneriler: iptal et ama kaydı koru.
  update public.matches m
  set status = 'cancelled'
  from public.match_participants mp
  where mp.match_id  = m.id
    and mp.user_id   = old.user_id
    and m.league_id  = old.league_id
    and m.status     = 'proposed'
    and m.played_at  = old.slot_start;

  return old;
end;
$fn$;

-- ----------------------------------------------------------------------------
-- 3) eslestir() ortak kilit yardımcısını kullansın
-- ----------------------------------------------------------------------------
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
  perform private.dilim_kilidi(p_league_id, p_slot_start);

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
    join musait m2 on m1.user_id < m2.user_id
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

-- ----------------------------------------------------------------------------
-- 4) Anlık tetikleyici artık satır değil İFADE düzeyinde
-- ----------------------------------------------------------------------------
-- KUSUR: satır düzeyindeki tetikleyici, çok satırlı tek bir INSERT'te
-- (örn. "haftamı toplu işaretle" gibi bir istek) her satır için ayrı kilit
-- alıyordu, üstelik istemcinin gönderdiği rastgele sırayla. İki böyle istek
-- çakışırsa kilitler ters sırada alınır ve deadlock oluşur.
--
-- ÇÖZÜM: ifade düzeyinde tek sefer çalış ve dilimleri deterministik sırayla
-- (league_id, slot_start) işle. Aynı sırayı kullanan iki işlem birbirini
-- bekleyebilir ama asla kilitlenmez.
drop trigger if exists on_availability_slot_inserted on public.availability_slots;

create or replace function private.musaitlik_eklendi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_dilim record;
begin
  for v_dilim in
    select distinct league_id, slot_start
    from yeni_dilimler
    order by league_id, slot_start
  loop
    perform private.eslestir(v_dilim.league_id, v_dilim.slot_start);
  end loop;

  return null;
end;
$fn$;

create trigger on_availability_slot_inserted
  after insert on public.availability_slots
  referencing new table as yeni_dilimler
  for each statement execute function private.musaitlik_eklendi();

-- ----------------------------------------------------------------------------
-- 5) Haftalık tarama kilit beklemesin
-- ----------------------------------------------------------------------------
-- KUSUR: tek transaction içinde yüze yakın dilimin kilidini biriktirip iş
-- bitene kadar tutuyordu. Bu hem anlık eşleştirmeyi bekletiyor hem de
-- deadlock yüzeyini büyütüyordu.
--
-- ÇÖZÜM: kilidi beklemeden dene. Bir dilimin kilidi başkasındaysa o dilim
-- şu anda zaten işleniyor demektir; atlamak doğru davranış, çünkü işi yapan
-- taraf aynı sonucu üretecek.
create or replace function private.haftalik_eslestir()
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_dilim   record;
  v_toplam  integer := 0;
  v_atlanan integer := 0;
begin
  for v_dilim in
    select distinct league_id, slot_start
    from public.availability_slots
    where slot_start > now()
      and slot_start < now() + interval '7 days'
    order by league_id, slot_start
  loop
    if pg_try_advisory_xact_lock(
         private.dilim_kilit_anahtari(v_dilim.league_id, v_dilim.slot_start)
       ) then
      v_toplam := v_toplam + private.eslestir(v_dilim.league_id, v_dilim.slot_start);
    else
      v_atlanan := v_atlanan + 1;
    end if;
  end loop;

  if v_atlanan > 0 then
    raise notice 'haftalik_eslestir: % dilim baska islem tarafindan tutuluyordu, atlandi', v_atlanan;
  end if;

  return v_toplam;
end;
$fn$;

-- ----------------------------------------------------------------------------
-- Eski davranışın bıraktığı mezar taşlarını temizle
-- ----------------------------------------------------------------------------
-- Düzeltmeden önce üretilmiş, kimsenin kabul etmediği 'cancelled' öneriler
-- çiftleri boş yere kilitliyor. Bunlar sistemin ürettiği iptallerdi, kimse
-- reddetmemişti. created_by is null olması sistem üretimi olduklarını gösterir.
delete from public.matches m
where m.status = 'cancelled'
  and m.created_by is null
  and not exists (
    select 1 from public.match_participants mp
    where mp.match_id = m.id and mp.accepted_at is not null
  );
