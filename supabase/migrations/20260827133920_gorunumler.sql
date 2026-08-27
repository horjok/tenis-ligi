-- ============================================================================
-- Ekranlar için görünümler (view)
--
-- Puan tablosu ve maç geçmişi birkaç tabloyu birleştirip türetilmiş değer
-- (galibiyet sayısı, Elo değişimi) istiyor. Bunu TypeScript tarafında elle
-- birleştirmek yerine SQL'de yapıyoruz: tek sorgu, tek yerde doğrulanabilir
-- mantık.
--
-- DİKKAT — security_invoker = true:
-- Postgres'te görünümler varsayılan olarak SAHİBİNİN yetkisiyle çalışır ve
-- RLS'i atlar. Yani bu satır olmasaydı, herkes her ligin puan tablosunu
-- görebilirdi. Bu ayar görünümü "çağıranın yetkisiyle çalıştır" moduna alır,
-- alttaki tabloların RLS politikaları aynen geçerli olur.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- lig_oyunculari — üyelik + isim
-- ----------------------------------------------------------------------------
-- profiles tablosu auth.users'a bağlı, league_members de öyle. İkisini her
-- ekranda elle join etmemek için tek yerde birleştiriyoruz.
create view public.lig_oyunculari
with (security_invoker = true) as
select
  lm.league_id,
  lm.user_id,
  lm.status,
  lm.role,
  lm.joined_at,
  p.username,
  p.display_name
from public.league_members lm
join public.profiles p on p.id = lm.user_id;

-- ----------------------------------------------------------------------------
-- puan_tablosu
-- ----------------------------------------------------------------------------
-- Galibiyet sayısı ratings tablosunda tutulmuyor (bilinçli: tek doğru kaynak
-- maçların kendisi). Buradan türetiliyor: oyuncunun takım numarası, maçın
-- kazanan takımına eşitse o maç galibiyettir.
create view public.puan_tablosu
with (security_invoker = true) as
select
  r.league_id,
  r.user_id,
  r.match_type,
  p.username,
  p.display_name,
  r.rating,
  r.matches_played,
  coalesce(g.galibiyet, 0)                        as galibiyet,
  r.matches_played - coalesce(g.galibiyet, 0)     as maglubiyet
from public.ratings r
join public.profiles p on p.id = r.user_id
left join (
  select
    mp.user_id,
    m.league_id,
    m.match_type,
    count(*) as galibiyet
  from public.match_participants mp
  join public.matches m on m.id = mp.match_id
  where m.status = 'played'
    and m.winner_team = mp.team_no
  group by mp.user_id, m.league_id, m.match_type
) g on g.user_id  = r.user_id
   and g.league_id = r.league_id
   and g.match_type = r.match_type;

-- ----------------------------------------------------------------------------
-- mac_gecmisi
-- ----------------------------------------------------------------------------
-- Bir maçı ekranda göstermek için gereken her şey tek satırda:
-- iki oyuncu, kazanan, set skorları ve iki oyuncunun Elo değişimi.
create view public.mac_gecmisi
with (security_invoker = true) as
select
  m.id            as match_id,
  m.league_id,
  m.played_at,
  m.location,
  m.winner_team,
  k1.user_id      as oyuncu1_id,
  pr1.display_name as oyuncu1_ad,
  k2.user_id      as oyuncu2_id,
  pr2.display_name as oyuncu2_ad,
  -- Elo değişimi rating_history'den; maç henüz işlenmemişse null gelir.
  (rh1.rating_after - rh1.rating_before) as oyuncu1_elo_degisim,
  (rh2.rating_after - rh2.rating_before) as oyuncu2_elo_degisim,
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
join public.match_participants k1 on k1.match_id = m.id and k1.team_no = 1
join public.match_participants k2 on k2.match_id = m.id and k2.team_no = 2
join public.profiles pr1 on pr1.id = k1.user_id
join public.profiles pr2 on pr2.id = k2.user_id
left join public.profiles prk on prk.id = m.created_by
left join public.rating_history rh1 on rh1.match_id = m.id and rh1.user_id = k1.user_id
left join public.rating_history rh2 on rh2.match_id = m.id and rh2.user_id = k2.user_id
where m.status = 'played';

-- ----------------------------------------------------------------------------
-- Yetkiler
-- ----------------------------------------------------------------------------
-- Görünümler yalnızca okunur. anon hiçbirini göremez; authenticated görür
-- ama alttaki tabloların RLS'i neyi gösterirse onu görür.
grant select on public.lig_oyunculari to authenticated;
grant select on public.puan_tablosu   to authenticated;
grant select on public.mac_gecmisi    to authenticated;

revoke all on public.lig_oyunculari from anon;
revoke all on public.puan_tablosu   from anon;
revoke all on public.mac_gecmisi    from anon;
