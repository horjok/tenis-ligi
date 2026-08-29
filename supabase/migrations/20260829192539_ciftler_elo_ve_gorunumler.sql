-- ============================================================================
-- Faz 5 / Adım 1 — Çiftler: Elo motoru, maç kaydı ve görünümler
--
-- Veri modeli çiftlere baştan hazırdı: katılımcılar match_participants'ta
-- team_no ile duruyor, matches.match_type zaten var. Değişen tek şey
-- motorun bunu kullanması.
--
-- TEKLER DAVRANIŞI BOZULMUYOR. Aşağıdaki genelleştirme teklerde birebir
-- eski hesabı yapıyor: bir kişilik "takım"ın ortalaması kendi puanı,
-- takımın en az maçlı oyuncusu da kendisi. Aynı sayılar çıkıyor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- private.elo_uygula — artık iki maç türünü de biliyor
-- ----------------------------------------------------------------------------
-- Çiftler kuralı:
--   * Takımın gücü = iki oyuncunun ÇİFTLER Elo'sunun ortalaması
--   * Beklenen sonuç iki takım ortalaması karşılaştırılarak bulunur
--   * Çıkan puan değişimi takımdaki HER İKİ oyuncuya AYNI miktarda uygulanır
--
-- K katsayısı için not: prompt hem "ilk 5 maçta K=48" hem "iki oyuncuya aynı
-- miktar" diyor. Oyuncu başına K alsaydık, 3 maçlık oyuncuyla 10 maçlık
-- partneri farklı miktar alırdı ve ikinci kural bozulurdu. "Aynı miktar"
-- bitti-kriteri olduğu için o kazanıyor; K takımın EN AZ maç oynamış
-- oyuncusuna göre seçiliyor — kalibrasyona en çok onun ihtiyacı var.
create or replace function private.elo_uygula(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mac        public.matches%rowtype;
  v_takim_boyu integer;
  v_katilimci  integer;
  v_t1 uuid[]; v_t2 uuid[];
  v_g1 numeric; v_g2 numeric;      -- takım güçleri (ortalama puan)
  v_o1 integer; v_o2 integer;      -- takımın en az maç oynamışının maç sayısı
  v_beklenen1 double precision;
  v_s1 double precision;
  v_delta1 numeric; v_delta2 numeric;
  v_uid uuid;
  v_r numeric;
begin
  -- İdempotent: aynı maç ikinci kez işlenmez. Tetikleyici her katılımcı
  -- satırında bir kez çalışıyor (çiftlerde dört kez), bu koruma şart.
  if exists (select 1 from public.rating_history where match_id = p_match_id) then
    return;
  end if;

  select * into v_mac from public.matches where id = p_match_id;
  if not found then return; end if;
  if v_mac.status <> 'played' or v_mac.winner_team is null then return; end if;

  v_takim_boyu := case v_mac.match_type
                    when 'singles' then 1
                    when 'doubles' then 2
                  end;
  if v_takim_boyu is null then
    raise exception 'Bilinmeyen maç türü: %', v_mac.match_type
      using errcode = 'feature_not_supported';
  end if;

  select count(*) into v_katilimci
    from public.match_participants where match_id = p_match_id;

  -- Katılımcılar henüz tam değil; son satır eklendiğinde tekrar çağrılacak.
  if v_katilimci <> v_takim_boyu * 2 then return; end if;

  select array_agg(user_id) into v_t1
    from public.match_participants where match_id = p_match_id and team_no = 1;
  select array_agg(user_id) into v_t2
    from public.match_participants where match_id = p_match_id and team_no = 2;

  -- Takımlar dengesiz olamaz. Sayı tutuyor ama dağılım bozuksa
  -- (3+1 gibi) hesap anlamsız olur; sessizce çıkmak yerine görünür olsun.
  if coalesce(array_length(v_t1, 1), 0) <> v_takim_boyu
     or coalesce(array_length(v_t2, 1), 0) <> v_takim_boyu then
    raise exception 'Takımlar dengesiz (maç %): 1. takım %, 2. takım %, beklenen % + %',
      p_match_id, coalesce(array_length(v_t1,1),0), coalesce(array_length(v_t2,1),0),
      v_takim_boyu, v_takim_boyu
      using errcode = 'check_violation';
  end if;

  -- Puan satırı olmayan oyuncular 1000'den başlar.
  insert into public.ratings (league_id, user_id, match_type)
  select v_mac.league_id, u, v_mac.match_type
  from unnest(v_t1 || v_t2) as u
  on conflict do nothing;

  select avg(rating), min(matches_played) into v_g1, v_o1
    from public.ratings
   where league_id = v_mac.league_id and match_type = v_mac.match_type
     and user_id = any(v_t1);

  select avg(rating), min(matches_played) into v_g2, v_o2
    from public.ratings
   where league_id = v_mac.league_id and match_type = v_mac.match_type
     and user_id = any(v_t2);

  v_beklenen1 := private.beklenen_skor(v_g1, v_g2);
  v_s1 := case when v_mac.winner_team = 1 then 1.0 else 0.0 end;

  v_delta1 := round((private.k_katsayisi(v_o1) * (v_s1 - v_beklenen1))::numeric, 3);
  v_delta2 := round((private.k_katsayisi(v_o2) * ((1.0 - v_s1) - (1.0 - v_beklenen1)))::numeric, 3);

  -- Takım 1
  foreach v_uid in array v_t1 loop
    select rating into v_r from public.ratings
     where league_id = v_mac.league_id and user_id = v_uid and match_type = v_mac.match_type;

    insert into public.rating_history (match_id, user_id, rating_before, rating_after)
    values (p_match_id, v_uid, v_r, v_r + v_delta1);

    update public.ratings
       set rating = v_r + v_delta1, matches_played = matches_played + 1
     where league_id = v_mac.league_id and user_id = v_uid and match_type = v_mac.match_type;
  end loop;

  -- Takım 2
  foreach v_uid in array v_t2 loop
    select rating into v_r from public.ratings
     where league_id = v_mac.league_id and user_id = v_uid and match_type = v_mac.match_type;

    insert into public.rating_history (match_id, user_id, rating_before, rating_after)
    values (p_match_id, v_uid, v_r, v_r + v_delta2);

    update public.ratings
       set rating = v_r + v_delta2, matches_played = matches_played + 1
     where league_id = v_mac.league_id and user_id = v_uid and match_type = v_mac.match_type;
  end loop;
end;
$$;

revoke execute on function private.elo_uygula(uuid)
  from public, anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- public.cift_mac_kaydet — çiftler maçının tek giriş kapısı
-- ----------------------------------------------------------------------------
-- Teklerdeki kuralın birebir karşılığı: ÇAĞIRAN HER ZAMAN 1. TAKIMDA.
-- Böylece başkası adına maç kaydetmek bir kontrolle değil, fonksiyon
-- imzasıyla imkânsız. Kendi yenilgini kaydedebilirsin — kazanan takımı
-- 2 seçersin, tıpkı teklerde rakibi kazanan göstermek gibi.
--
-- Aynı oyuncunun iki yerde olması zaten match_participants'ın birincil
-- anahtarıyla (match_id, user_id) imkânsız. Buradaki kontroller anlaşılır
-- hata mesajı için; asıl bekçi anahtar.
create or replace function public.cift_mac_kaydet(
  p_league_id     uuid,
  p_partner_id    uuid,
  p_rakip1_id     uuid,
  p_rakip2_id     uuid,
  p_kazanan_takim smallint,
  p_played_at     timestamptz,
  p_location      text default null,
  p_sets          jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ben      uuid := (select auth.uid());
  v_match_id uuid;
  v_hepsi    uuid[];
  v_eksik    integer;
begin
  if v_ben is null then
    raise exception 'Giriş yapmalısın.' using errcode = 'insufficient_privilege';
  end if;

  if not private.aktif_uye_mi(p_league_id) then
    raise exception 'Bu ligin aktif üyesi değilsin.' using errcode = 'insufficient_privilege';
  end if;

  if p_kazanan_takim not in (1, 2) then
    raise exception 'Kazanan takım 1 ya da 2 olmalı.' using errcode = 'check_violation';
  end if;

  v_hepsi := array[v_ben, p_partner_id, p_rakip1_id, p_rakip2_id];

  if array_length(array(select distinct u from unnest(v_hepsi) as u), 1) <> 4 then
    raise exception 'Dört farklı oyuncu seç; aynı kişi iki yerde olamaz.'
      using errcode = 'check_violation';
  end if;

  select count(*) into v_eksik
  from unnest(v_hepsi) as u
  where not exists (
    select 1 from public.league_members lm
    where lm.league_id = p_league_id and lm.user_id = u and lm.status = 'active'
  );
  if v_eksik > 0 then
    raise exception 'Seçtiğin oyunculardan % tanesi bu ligin aktif üyesi değil.', v_eksik
      using errcode = 'check_violation';
  end if;

  if p_played_at > now() + interval '1 day' then
    raise exception 'Maç tarihi gelecekte olamaz.' using errcode = 'check_violation';
  end if;

  insert into public.matches
    (league_id, match_type, status, winner_team, played_at, location, created_by)
  values
    (p_league_id, 'doubles', 'played', p_kazanan_takim, p_played_at,
     nullif(btrim(coalesce(p_location, '')), ''), v_ben)
  returning id into v_match_id;

  insert into public.match_sets (match_id, set_no, team1_games, team2_games)
  select v_match_id, ord::smallint, (e ->> 'team1')::smallint, (e ->> 'team2')::smallint
  from jsonb_array_elements(coalesce(p_sets, '[]'::jsonb)) with ordinality as t(e, ord);

  -- Dört katılımcı tek INSERT'te: satır tetikleyicileri ifade bitince
  -- çalıştığı için elo_uygula dördünü birden görüyor.
  insert into public.match_participants (match_id, user_id, team_no)
  values (v_match_id, v_ben,          1),
         (v_match_id, p_partner_id,   1),
         (v_match_id, p_rakip1_id,    2),
         (v_match_id, p_rakip2_id,    2);

  return v_match_id;
end;
$$;

revoke execute on function public.cift_mac_kaydet(uuid, uuid, uuid, uuid, smallint, timestamptz, text, jsonb)
  from public, anon;
grant execute on function public.cift_mac_kaydet(uuid, uuid, uuid, uuid, smallint, timestamptz, text, jsonb)
  to authenticated;

-- ----------------------------------------------------------------------------
-- mac_gecmisi — takım bazlı
-- ----------------------------------------------------------------------------
-- ESKİ HALİ ÇİFTLERDE BOZULUYORDU. İki ayrı join vardı:
--     join match_participants k1 on k1.team_no = 1
--     join match_participants k2 on k2.team_no = 2
-- Çiftlerde her takımda iki kişi olduğu için bu 2x2 = DÖRT satır üretiyordu:
-- tek maç ekranda dört kez, üstelik yanlış Elo değişimleriyle görünürdü.
--
-- Yeni hâli takımları önce toplayıp sonra birleştiriyor; her maç bir satır.
drop view if exists public.mac_gecmisi;

create view public.mac_gecmisi
with (security_invoker = true) as
with takimlar as (
  select mp.match_id,
         mp.team_no,
         jsonb_agg(
           jsonb_build_object('id', mp.user_id, 'ad', p.display_name)
           order by p.display_name
         ) as oyuncular,
         -- Takımın Elo değişimi. Takımdaki herkes AYNI miktarı alıyor,
         -- o yüzden tek değer yeterli. max(): bir üyenin geçmiş satırı
         -- eksikse null yerine diğerinin değeri gelsin.
         max(rh.rating_after - rh.rating_before) as elo_degisim
  from public.match_participants mp
  join public.profiles p on p.id = mp.user_id
  left join public.rating_history rh
         on rh.match_id = mp.match_id and rh.user_id = mp.user_id
  group by mp.match_id, mp.team_no
)
select
  m.id         as match_id,
  m.league_id,
  m.match_type,
  m.played_at,
  m.location,
  m.winner_team,
  t1.oyuncular    as takim1_oyuncular,
  t2.oyuncular    as takim2_oyuncular,
  t1.elo_degisim  as takim1_elo_degisim,
  t2.elo_degisim  as takim2_elo_degisim,
  prk.display_name as kaydeden_ad,
  (
    select coalesce(
      jsonb_agg(
        jsonb_build_object('set_no', s.set_no, 't1', s.team1_games, 't2', s.team2_games)
        order by s.set_no
      ),
      '[]'::jsonb
    )
    from public.match_sets s
    where s.match_id = m.id
  ) as setler
from public.matches m
join takimlar t1 on t1.match_id = m.id and t1.team_no = 1
join takimlar t2 on t2.match_id = m.id and t2.team_no = 2
left join public.profiles prk on prk.id = m.created_by
where m.status = 'played';

grant select on public.mac_gecmisi to authenticated;
revoke all on public.mac_gecmisi from anon;

-- ----------------------------------------------------------------------------
-- sezon_puanlari — artık maç türüne göre ayrı
-- ----------------------------------------------------------------------------
-- Faz 4'te yazıldığında tek bir Elo havuzu vardı. Çiftler gelince bu
-- görünüm tekler ve çiftler kazançlarını TEK SAYIDA toplardı — promptun
-- açıkça yasakladığı "ortak sıralama" tam olarak bu olurdu.
drop view if exists public.sezon_puanlari;

create view public.sezon_puanlari
with (security_invoker = true) as
select s.id        as season_id,
       s.league_id,
       s.name      as sezon_adi,
       m.match_type,
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
      and (m.played_at at time zone 'Europe/Istanbul')::date
          <@ daterange(s.starts_on, s.ends_on, '[]')
join public.rating_history     rh on rh.match_id = m.id
join public.match_participants mp on mp.match_id = m.id and mp.user_id = rh.user_id
join public.profiles           p  on p.id = rh.user_id
group by s.id, s.league_id, s.name, m.match_type, rh.user_id, p.display_name, p.username;

grant select on public.sezon_puanlari to authenticated;
revoke all on public.sezon_puanlari from anon;
