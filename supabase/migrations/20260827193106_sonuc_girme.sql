-- ============================================================================
-- Faz 2 / Adım 4 — Sonuç girme ve Elo bağlantısı
--
-- Buradaki asıl mesele Elo'nun tetiklenmesi. Faz 1'de Elo'nun tek tetikleyicisi
-- match_participants üzerinde AFTER INSERT'ti; mantığı şuydu: "maç satırı
-- yazıldığında katılımcılar henüz yok, o yüzden son katılımcı eklendiğinde
-- hesapla". Elle maç girmede bu doğru çalışıyor, çünkü record_match maçı
-- zaten 'played' olarak açıp katılımcıları en son yazıyor.
--
-- Faz 2'de düzen ters: katılımcılar ÖNERİ anında yazılıyor ve maç o an
-- 'proposed'. elo_uygula durum kontrolünde erkenden çıkıyor. Maç sonradan
-- 'played' olduğunda hiçbir şey Elo'yu tetiklemiyor.
--
-- Çözüm: matches üzerine ikinci bir tetikleyici. Faz 1'inkine dokunulmuyor —
-- elle girilen maçlar hâlâ oradan geçiyor. elo_uygula idempotent olduğu için
-- iki tetikleyicinin aynı maçta çalışması sorun değil.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Elo tetikleyicisi: durum 'played'e döndüğünde
-- ----------------------------------------------------------------------------
create or replace function private.mac_oynandi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if new.status = 'played' and old.status is distinct from 'played' then
    perform private.elo_uygula(new.id);
  end if;

  return null;
end;
$fn$;

revoke execute on function private.mac_oynandi()
  from public, anon, authenticated, service_role;

-- elo_uygula yalnızca ratings ve rating_history'ye yazıyor, matches'e
-- dokunmuyor; dolayısıyla bu tetikleyici kendini tekrar tetiklemiyor.
create trigger on_match_played
  after update on public.matches
  for each row execute function private.mac_oynandi();

-- ----------------------------------------------------------------------------
-- public.sonuc_gir
-- ----------------------------------------------------------------------------
-- Kesinleşmiş bir maçın sonucunu iki oyuncudan biri girer.
-- played_at değişmez: maç önerilen saatte oynandı sayılır.
create or replace function public.sonuc_gir(
  p_match_id  uuid,
  p_winner_id uuid,
  p_sets      jsonb default '[]'::jsonb,
  p_location  text  default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_ben     uuid := (select auth.uid());
  v_mac     public.matches%rowtype;
  v_takim   smallint;
begin
  if v_ben is null then
    raise exception 'Giriş yapmalısın.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_mac from public.matches where id = p_match_id;
  if not found then
    raise exception 'Maç bulunamadı.' using errcode = 'check_violation';
  end if;

  if not exists (
    select 1 from public.match_participants
    where match_id = p_match_id and user_id = v_ben
  ) then
    raise exception 'Bu maçın oyuncusu değilsin.' using errcode = 'insufficient_privilege';
  end if;

  if v_mac.status <> 'accepted' then
    raise exception 'Yalnızca kesinleşmiş maçlara sonuç girilebilir.'
      using errcode = 'check_violation';
  end if;

  select team_no into v_takim
  from public.match_participants
  where match_id = p_match_id and user_id = p_winner_id;

  if v_takim is null then
    raise exception 'Kazanan, maçın oyuncularından biri olmalı.'
      using errcode = 'check_violation';
  end if;

  -- Setler opsiyonel ve kazananla tutarlılıkları KONTROL EDİLMİYOR:
  -- kural "kazanan zorunlu, setler opsiyonel". Setler bilgi amaçlı.
  delete from public.match_sets where match_id = p_match_id;

  insert into public.match_sets (match_id, set_no, team1_games, team2_games)
  select p_match_id, ord::smallint, (e ->> 'team1')::smallint, (e ->> 'team2')::smallint
  from jsonb_array_elements(coalesce(p_sets, '[]'::jsonb)) with ordinality as t(e, ord);

  -- Bu UPDATE on_match_played tetikleyicisini çalıştırır ve Elo işlenir.
  update public.matches
  set status      = 'played',
      winner_team = v_takim,
      location    = coalesce(nullif(btrim(coalesce(p_location, '')), ''), location)
  where id = p_match_id;
end;
$fn$;

revoke execute on function public.sonuc_gir(uuid, uuid, jsonb, text) from public, anon;
grant execute on function public.sonuc_gir(uuid, uuid, jsonb, text) to authenticated;
