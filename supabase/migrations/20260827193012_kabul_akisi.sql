-- ============================================================================
-- Faz 2 / Adım 3 — Kabul, ret ve süre dolumu
--
-- Durum geçişleri yalnızca bu fonksiyonlardan yapılır. Kullanıcının
-- matches ve match_participants tablolarına doğrudan yazma yetkisi Faz 1'de
-- geri alınmıştı; o kural burada da korunuyor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- public.oneriyi_kabul_et
-- ----------------------------------------------------------------------------
-- Çağıranın accepted_at alanını doldurur. İki taraf da kabul etmişse maç
-- kesinleşir ve İKİ OYUNCUNUN da o saatteki diğer önerileri iptal edilir.
--
-- İptalin neden kabul anında değil de kesinleşme anında yapıldığı:
-- kabul eder etmez iptal edilseydi, rakip reddettiğinde oyuncu o saat için
-- boşta kalır ve iptal olan seçenekleri geri gelmezdi. Bu şekilde kimse
-- elindeki seçenekleri karşılık almadan kaybetmiyor.
--
-- Bunun bedeli, aynı oyuncunun aynı saatte iki öneriyi birden kabul
-- edebilmesi olurdu; aşağıdaki "o saatte zaten kesinleşmiş maçın varsa
-- kabul edemezsin" kuralı bunu kapatıyor.
create or replace function public.oneriyi_kabul_et(p_match_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_ben       uuid := (select auth.uid());
  v_mac       public.matches%rowtype;
  v_bekleyen  integer;
begin
  if v_ben is null then
    raise exception 'Giriş yapmalısın.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_mac from public.matches where id = p_match_id;
  if not found then
    raise exception 'Öneri bulunamadı.' using errcode = 'check_violation';
  end if;

  -- Aynı dilimde eşleştirme veya başka bir kabul aynı anda çalışmasın.
  perform private.dilim_kilidi(v_mac.league_id, v_mac.played_at);

  -- Kilidi aldıktan sonra tekrar oku: beklerken durum değişmiş olabilir.
  select * into v_mac from public.matches where id = p_match_id;

  if v_mac.status <> 'proposed' then
    raise exception 'Bu öneri artık geçerli değil.' using errcode = 'check_violation';
  end if;

  if not exists (
    select 1 from public.match_participants
    where match_id = p_match_id and user_id = v_ben
  ) then
    raise exception 'Bu öneri sana ait değil.' using errcode = 'insufficient_privilege';
  end if;

  if exists (
    select 1
    from public.matches m
    join public.match_participants mp on mp.match_id = m.id
    where mp.user_id  = v_ben
      and m.league_id = v_mac.league_id
      and m.played_at = v_mac.played_at
      and m.status    = 'accepted'
  ) then
    raise exception 'O saatte zaten kesinleşmiş bir maçın var.'
      using errcode = 'check_violation';
  end if;

  update public.match_participants
  set accepted_at = now()
  where match_id = p_match_id
    and user_id  = v_ben
    and accepted_at is null;

  select count(*) into v_bekleyen
  from public.match_participants
  where match_id = p_match_id and accepted_at is null;

  if v_bekleyen > 0 then
    return 'bekliyor';
  end if;

  -- Herkes kabul etti: maç kesinleşti.
  update public.matches set status = 'accepted' where id = p_match_id;

  -- Bu maçın oyuncularının o saatteki DİĞER önerileri artık geçersiz.
  update public.matches m
  set status = 'cancelled'
  where m.id <> p_match_id
    and m.league_id = v_mac.league_id
    and m.played_at = v_mac.played_at
    and m.status    = 'proposed'
    and exists (
      select 1
      from public.match_participants mp
      join public.match_participants benimkiler
        on benimkiler.match_id = p_match_id
       and benimkiler.user_id  = mp.user_id
      where mp.match_id = m.id
    );

  return 'kesinlesti';
end;
$fn$;

revoke execute on function public.oneriyi_kabul_et(uuid) from public, anon;
grant execute on function public.oneriyi_kabul_et(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- public.oneriyi_reddet
-- ----------------------------------------------------------------------------
-- Reddedilen öneri 'cancelled' olarak KALIR (silinmez). Bu bilinçli:
-- eslestir() aynı çifte aynı dilim için tekrar öneri açmasın diye. Bir kez
-- soruldu, cevap alındı.
create or replace function public.oneriyi_reddet(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_ben uuid := (select auth.uid());
  v_mac public.matches%rowtype;
begin
  if v_ben is null then
    raise exception 'Giriş yapmalısın.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_mac from public.matches where id = p_match_id;
  if not found then
    raise exception 'Öneri bulunamadı.' using errcode = 'check_violation';
  end if;

  if not exists (
    select 1 from public.match_participants
    where match_id = p_match_id and user_id = v_ben
  ) then
    raise exception 'Bu öneri sana ait değil.' using errcode = 'insufficient_privilege';
  end if;

  if v_mac.status <> 'proposed' then
    raise exception 'Bu öneri artık geçerli değil.' using errcode = 'check_violation';
  end if;

  update public.matches set status = 'cancelled' where id = p_match_id;
end;
$fn$;

revoke execute on function public.oneriyi_reddet(uuid) from public, anon;
grant execute on function public.oneriyi_reddet(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Süresi geçen öneriler
-- ----------------------------------------------------------------------------
-- Saati gelip geçmiş ama kimsenin cevaplamadığı öneriler 'expired' olur.
-- 'cancelled' değil, çünkü kimse reddetmedi — sadece zaman doldu.
create or replace function private.onerileri_sonlandir()
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_sayac integer;
begin
  update public.matches
  set status = 'expired'
  where status = 'proposed'
    and played_at < now();

  get diagnostics v_sayac = row_count;
  return v_sayac;
end;
$fn$;

revoke execute on function private.onerileri_sonlandir()
  from public, anon, authenticated, service_role;

select cron.schedule(
  'oneri-suresi-dolumu',
  '5 * * * *',   -- her saat başını 5 geçe
  $cron$ select private.onerileri_sonlandir(); $cron$
);

-- ----------------------------------------------------------------------------
-- Öneri listesi görünümü
-- ----------------------------------------------------------------------------
-- Ekran önerileri saat dilimine göre gruplayacak. Bunun için her önerinin
-- iki oyuncusu, kabul durumları ve saati tek satırda gerekiyor.
--
-- security_invoker = true olmadan bu görünüm RLS'i atlar ve herkesin
-- önerileri herkese görünür.
create view public.oneri_listesi
with (security_invoker = true) as
select
  m.id         as match_id,
  m.league_id,
  m.played_at,
  m.status,
  k1.user_id   as oyuncu1_id,
  p1.display_name as oyuncu1_ad,
  k1.accepted_at  as oyuncu1_kabul,
  k2.user_id   as oyuncu2_id,
  p2.display_name as oyuncu2_ad,
  k2.accepted_at  as oyuncu2_kabul
from public.matches m
join public.match_participants k1 on k1.match_id = m.id and k1.team_no = 1
join public.match_participants k2 on k2.match_id = m.id and k2.team_no = 2
join public.profiles p1 on p1.id = k1.user_id
join public.profiles p2 on p2.id = k2.user_id
where m.status in ('proposed', 'accepted');

grant select on public.oneri_listesi to authenticated;
revoke all on public.oneri_listesi from anon;
