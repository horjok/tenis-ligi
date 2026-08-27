-- ============================================================================
-- Elo motoru + maç kaydı
--
-- İki parça var:
--   1. Elo hesabı — trigger olarak, kullanıcının erişemediği yerde
--   2. record_match — maç kaydının TEK giriş kapısı
--
-- Neden tek kapı: bir maç üç tabloya birden yazılıyor (matches,
-- match_participants, match_sets). PostgREST'te ayrı ayrı INSERT'ler ayrı
-- transaction demek — yarıda kalırsa katılımcısız maç kaydı kalır ve Elo
-- hiç çalışmaz. Fonksiyon içinde hepsi tek transaction.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Elo formülü
-- ----------------------------------------------------------------------------
-- beklenen = 1 / (1 + 10^((rakip - benim) / 400))
--
-- Sezgisi: 400 puan fark, 10 kat kazanma olasılığı demek. Eşit puanlıysanız
-- beklenen 0.5 çıkar; favoriysen 0.5'in üstünde. Sürpriz yenilgi çok puan
-- götürür, beklenen galibiyet az puan getirir.
create or replace function private.beklenen_skor(
  p_benim numeric,
  p_rakip numeric
)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 1.0 / (1.0 + power(10.0, (p_rakip - p_benim)::double precision / 400.0));
$$;

-- Yeni oyuncunun puanı gerçek seviyesine hızlı otursun diye ilk 5 maçta
-- K daha büyük. Sonrasında oturaklı hale gelir.
create or replace function private.k_katsayisi(p_oynanan integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when p_oynanan < 5 then 48 else 32 end;
$$;

-- ----------------------------------------------------------------------------
-- private.elo_uygula — bir maçın puan etkisini işler
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER, çünkü `ratings` tablosuna kimse yazamıyor (bilinçli).
-- Yazma yetkisi sadece burada.
--
-- İDEMPOTENT: aynı maç için ikinci kez çağrılırsa hiçbir şey yapmaz.
-- Bu şart, çünkü trigger her katılımcı satırı için bir kez tetikleniyor —
-- teklerde iki kez. Koruma olmasa puanlar iki kat işlenirdi.
create or replace function private.elo_uygula(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mac      public.matches%rowtype;
  v_katilimci integer;
  v_p1 uuid; v_p2 uuid;
  v_r1 numeric; v_r2 numeric;
  v_o1 integer; v_o2 integer;
  v_beklenen1 double precision;
  v_s1 double precision;
  v_yeni1 numeric; v_yeni2 numeric;
begin
  -- Zaten işlenmiş mi?
  if exists (select 1 from public.rating_history where match_id = p_match_id) then
    return;
  end if;

  select * into v_mac from public.matches where id = p_match_id;
  if not found then
    return;
  end if;

  -- Sadece oynanmış ve kazananı belli maçlar puana etki eder.
  if v_mac.status <> 'played' or v_mac.winner_team is null then
    return;
  end if;

  if v_mac.match_type <> 'singles' then
    raise exception 'Şimdilik yalnızca tekler maçları puanlanıyor (match_type=%).', v_mac.match_type
      using errcode = 'feature_not_supported';
  end if;

  select count(*) into v_katilimci
  from public.match_participants where match_id = p_match_id;

  -- Katılımcılar henüz tam değil; son satır eklendiğinde tekrar çağrılacak.
  if v_katilimci <> 2 then
    return;
  end if;

  select user_id into v_p1 from public.match_participants
   where match_id = p_match_id and team_no = 1;
  select user_id into v_p2 from public.match_participants
   where match_id = p_match_id and team_no = 2;

  if v_p1 is null or v_p2 is null then
    return;
  end if;

  -- Puan satırı yoksa 1000'den başla.
  insert into public.ratings (league_id, user_id, match_type)
  values (v_mac.league_id, v_p1, v_mac.match_type),
         (v_mac.league_id, v_p2, v_mac.match_type)
  on conflict do nothing;

  select rating, matches_played into v_r1, v_o1 from public.ratings
   where league_id = v_mac.league_id and user_id = v_p1 and match_type = v_mac.match_type;
  select rating, matches_played into v_r2, v_o2 from public.ratings
   where league_id = v_mac.league_id and user_id = v_p2 and match_type = v_mac.match_type;

  v_beklenen1 := private.beklenen_skor(v_r1, v_r2);
  v_s1 := case when v_mac.winner_team = 1 then 1.0 else 0.0 end;

  -- Her oyuncunun K'sı kendi maç sayısına göre — biri yeni, diğeri eski olabilir.
  v_yeni1 := round((v_r1 + private.k_katsayisi(v_o1) * (v_s1 - v_beklenen1))::numeric, 3);
  v_yeni2 := round((v_r2 + private.k_katsayisi(v_o2) * ((1.0 - v_s1) - (1.0 - v_beklenen1)))::numeric, 3);

  insert into public.rating_history (match_id, user_id, rating_before, rating_after)
  values (p_match_id, v_p1, v_r1, v_yeni1),
         (p_match_id, v_p2, v_r2, v_yeni2);

  update public.ratings
     set rating = v_yeni1, matches_played = matches_played + 1
   where league_id = v_mac.league_id and user_id = v_p1 and match_type = v_mac.match_type;

  update public.ratings
     set rating = v_yeni2, matches_played = matches_played + 1
   where league_id = v_mac.league_id and user_id = v_p2 and match_type = v_mac.match_type;
end;
$$;

revoke execute on function private.elo_uygula(uuid) from public, anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Trigger: son katılımcı eklendiğinde Elo çalışır
-- ----------------------------------------------------------------------------
-- Neden matches üzerinde değil: maç satırı yazıldığında katılımcılar henüz
-- yok. Kim kime karşı oynadı bilinmeden puan hesaplanamaz.
create or replace function private.katilimci_eklendi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.elo_uygula(new.match_id);
  return null;
end;
$$;

revoke execute on function private.katilimci_eklendi() from public, anon, authenticated, service_role;

create trigger on_match_participant_inserted
  after insert on public.match_participants
  for each row execute function private.katilimci_eklendi();

-- ----------------------------------------------------------------------------
-- public.record_match — maç kaydının tek giriş kapısı
-- ----------------------------------------------------------------------------
-- Çağıran kişi her zaman 1. takım, rakip 2. takım.
-- p_sets biçimi: [{"team1": 6, "team2": 4}, {"team1": 3, "team2": 6}]
--
-- SECURITY DEFINER olmak zorunda: matches/match_participants/match_sets
-- tablolarına RLS ile yazma tamamen kapalı. Bu yüzden yetki kontrolleri
-- gövdenin içinde, auth.uid() ile açıkça yapılıyor.
create or replace function public.record_match(
  p_league_id   uuid,
  p_opponent_id uuid,
  p_winner_id   uuid,
  p_played_at   timestamptz,
  p_location    text default null,
  p_sets        jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ben      uuid := (select auth.uid());
  v_match_id uuid;
  v_kazanan  smallint;
begin
  if v_ben is null then
    raise exception 'Giriş yapmalısın.' using errcode = 'insufficient_privilege';
  end if;

  -- "Yalnızca kendisinin katılımcı olduğu maç" kuralı burada uygulanıyor.
  if not private.aktif_uye_mi(p_league_id) then
    raise exception 'Bu ligin aktif üyesi değilsin.' using errcode = 'insufficient_privilege';
  end if;

  if p_opponent_id = v_ben then
    raise exception 'Kendinle maç kaydedemezsin.' using errcode = 'check_violation';
  end if;

  if not exists (
    select 1 from public.league_members
    where league_id = p_league_id and user_id = p_opponent_id and status = 'active'
  ) then
    raise exception 'Rakip bu ligin aktif üyesi değil.' using errcode = 'check_violation';
  end if;

  if p_winner_id = v_ben then
    v_kazanan := 1;
  elsif p_winner_id = p_opponent_id then
    v_kazanan := 2;
  else
    raise exception 'Kazanan, maçın iki oyuncusundan biri olmalı.' using errcode = 'check_violation';
  end if;

  if p_played_at > now() + interval '1 day' then
    raise exception 'Maç tarihi gelecekte olamaz.' using errcode = 'check_violation';
  end if;

  insert into public.matches
    (league_id, match_type, status, winner_team, played_at, location, created_by)
  values
    (p_league_id, 'singles', 'played', v_kazanan, p_played_at, nullif(btrim(coalesce(p_location,'')), ''), v_ben)
  returning id into v_match_id;

  -- Set skorları opsiyonel. Kazananla tutarlı olup olmadığını KONTROL
  -- ETMİYORUZ: kural "kazanan zorunlu, setler opsiyonel". Setler bilgi amaçlı.
  insert into public.match_sets (match_id, set_no, team1_games, team2_games)
  select v_match_id, ord::smallint, (e ->> 'team1')::smallint, (e ->> 'team2')::smallint
  from jsonb_array_elements(coalesce(p_sets, '[]'::jsonb)) with ordinality as t(e, ord);

  -- Katılımcılar en son: bu INSERT trigger'ı tetikleyip Elo'yu çalıştırır.
  insert into public.match_participants (match_id, user_id, team_no)
  values (v_match_id, v_ben, 1),
         (v_match_id, p_opponent_id, 2);

  return v_match_id;
end;
$$;

revoke execute on function public.record_match(uuid, uuid, uuid, timestamptz, text, jsonb) from public, anon;
grant execute on function public.record_match(uuid, uuid, uuid, timestamptz, text, jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- public.recalculate_ratings — zinciri baştan sar
-- ----------------------------------------------------------------------------
-- Elo zincirleme çalışır: 3. maçın sonucu 2. maçtan kalan puana bağlıdır.
-- Bu yüzden hatalı bir maç silindiğinde ondan SONRAKİ her maç yeniden
-- hesaplanmalı. Bu fonksiyon en basit yolu seçiyor: her şeyi sıfırla,
-- maçları tarih sırasıyla baştan işle.
--
-- Bizim ölçeğimizde (15 kişi, yılda birkaç yüz maç) bu milisaniyelik iş.
-- Optimize etmeye çalışma.
create or replace function public.recalculate_ratings(p_league_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mac    record;
  v_sayac  integer := 0;
begin
  if not private.lig_admini_mi(p_league_id) then
    raise exception 'Bu işlem için lig yöneticisi olmalısın.' using errcode = 'insufficient_privilege';
  end if;

  -- Geçmişi ve puanları sıfırla
  delete from public.rating_history rh
   using public.matches m
   where rh.match_id = m.id and m.league_id = p_league_id;

  delete from public.ratings where league_id = p_league_id;

  -- Maçları oynanma sırasına göre yeniden işle.
  -- created_at ikincil sıralama: aynı anda oynanmış iki maçın sırası
  -- her çalıştırmada aynı olsun diye (deterministik sonuç).
  for v_mac in
    select id from public.matches
     where league_id = p_league_id and status = 'played'
     order by played_at, created_at, id
  loop
    perform private.elo_uygula(v_mac.id);
    v_sayac := v_sayac + 1;
  end loop;

  return v_sayac;
end;
$$;

revoke execute on function public.recalculate_ratings(uuid) from public, anon;
grant execute on function public.recalculate_ratings(uuid) to authenticated;
