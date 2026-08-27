-- ============================================================================
-- RLS politikaları
--
-- Faz 1 şemasında tüm tablolarda RLS açıldı ama politika yazılmadı; bu
-- "hiç kimse hiçbir şey yapamaz" demekti. Şimdi kapıları tek tek açıyoruz.
--
-- Temel ilke: TO authenticated tek başına yetmez. O sadece "giriş yapmış mı"
-- der, "bu satır senin mi" demez. Her politikada ayrıca üyelik/sahiplik
-- koşulu var.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Yardımcı fonksiyonlar
-- ----------------------------------------------------------------------------
-- Neden ayrı fonksiyon? league_members üzerindeki bir politika yine
-- league_members'ı sorgularsa Postgres sonsuz özyinelemeye girer.
-- SECURITY DEFINER fonksiyon RLS'i atladığı için bu döngü kırılır.
--
-- Üçü de "ben kimim" sorusuna auth.uid() ile kendi içinde cevap veriyor;
-- parametreyle başkasının verisini çekmeye zorlanamazlar.

create or replace function private.aktif_uye_mi(p_league_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.league_members
    where league_id = p_league_id
      and user_id = (select auth.uid())
      and status = 'active'
  );
$$;

create or replace function private.lig_admini_mi(p_league_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.league_members
    where league_id = p_league_id
      and user_id = (select auth.uid())
      and status = 'active'
      and role = 'admin'
  );
$$;

create or replace function private.ayni_ligde_mi(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.league_members benim
    join public.league_members digeri on digeri.league_id = benim.league_id
    where benim.user_id = (select auth.uid())
      and benim.status = 'active'
      and digeri.user_id = p_user_id
      and digeri.status = 'active'
  );
$$;

-- RLS politikası içinden çağrılan fonksiyon, çağıran kullanıcının yetkisiyle
-- kontrol edilir — trigger'lardan farkı bu. O yüzden authenticated'a şema
-- kullanımı ve bu üç fonksiyon için EXECUTE veriyoruz.
--
-- Bu, private şemasını API'ye açmaz: PostgREST yalnızca config.toml'daki
-- `schemas` listesindeki şemaları yayımlar, private orada yok.
grant usage on schema private to authenticated;
grant execute on function private.aktif_uye_mi(uuid)  to authenticated;
grant execute on function private.lig_admini_mi(uuid) to authenticated;
grant execute on function private.ayni_ligde_mi(uuid) to authenticated;

-- anon hiçbirini çağıramaz.
revoke all on schema private from anon;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
-- Okuma: aynı ligde olduğun kişilerin profili (kendi profilin dahil).
create policy profiles_secim on public.profiles
  for select to authenticated
  using ((select private.ayni_ligde_mi(id)));

-- Yazma: sadece kendi satırın. Ve sadece display_name sütunu —
-- username değişemez, çünkü giriş kimliği (<username>@tenis-ligi.local)
-- ona bağlı. Sütun kısıtı RLS ile ifade edilemediği için GRANT ile yapılıyor.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy profiles_kendi_guncelleme on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- INSERT politikası yok: profil satırını yalnızca kayıt trigger'ı açar.

-- ----------------------------------------------------------------------------
-- leagues
-- ----------------------------------------------------------------------------
create policy leagues_secim on public.leagues
  for select to authenticated
  using ((select private.aktif_uye_mi(id)));

revoke insert, update, delete on public.leagues from anon, authenticated;

-- ----------------------------------------------------------------------------
-- league_members
-- ----------------------------------------------------------------------------
-- Okuma: kendi satırın her zaman; ayrıca aktif üyesi olduğun ligin kadrosu.
create policy league_members_secim on public.league_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.aktif_uye_mi(league_id))
  );

-- Güncelleme: sadece ligin admini (üye çıkarma, admin atama).
-- USING satırı görmeyi, WITH CHECK yazdıktan sonraki hali denetler.
-- İkisi birden olmazsa admin, satırı başka bir lige taşıyabilir.
create policy league_members_admin_guncelleme on public.league_members
  for update to authenticated
  using ((select private.lig_admini_mi(league_id)))
  with check ((select private.lig_admini_mi(league_id)));

revoke insert, delete on public.league_members from anon, authenticated;

-- INSERT politikası yok: üyeliği yalnızca kayıt trigger'ı açar (davet kodu ile).

-- ----------------------------------------------------------------------------
-- invite_codes
-- ----------------------------------------------------------------------------
-- Kodları yalnızca admin görür ve üretir. Sıradan oyuncu kod listesini
-- göremez — görebilseydi herkesi davet edebilirdi.
create policy invite_codes_admin_secim on public.invite_codes
  for select to authenticated
  using ((select private.lig_admini_mi(league_id)));

create policy invite_codes_admin_ekleme on public.invite_codes
  for insert to authenticated
  with check (
    (select private.lig_admini_mi(league_id))
    and created_by = (select auth.uid())
  );

create policy invite_codes_admin_guncelleme on public.invite_codes
  for update to authenticated
  using ((select private.lig_admini_mi(league_id)))
  with check ((select private.lig_admini_mi(league_id)));

create policy invite_codes_admin_silme on public.invite_codes
  for delete to authenticated
  using ((select private.lig_admini_mi(league_id)));

-- used_count'u kullanıcı elle değiştirmesin: sayacı kayıt trigger'ı artırır.
revoke update on public.invite_codes from anon, authenticated;
grant update (max_uses, expires_at) on public.invite_codes to authenticated;

-- ----------------------------------------------------------------------------
-- matches / match_participants / match_sets
-- ----------------------------------------------------------------------------
-- Okuma: ligin aktif üyeleri.
-- Yazma: HİÇ KİMSE. Maç kaydı Adım 4'te gelecek record_match fonksiyonundan
-- geçecek; üç tabloya birden tek transaction'da yazılması gerekiyor.
create policy matches_secim on public.matches
  for select to authenticated
  using ((select private.aktif_uye_mi(league_id)));

create policy match_participants_secim on public.match_participants
  for select to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_participants.match_id
        and (select private.aktif_uye_mi(m.league_id))
    )
  );

create policy match_sets_secim on public.match_sets
  for select to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_sets.match_id
        and (select private.aktif_uye_mi(m.league_id))
    )
  );

revoke insert, update, delete on public.matches            from anon, authenticated;
revoke insert, update, delete on public.match_participants from anon, authenticated;
revoke insert, update, delete on public.match_sets         from anon, authenticated;

-- ----------------------------------------------------------------------------
-- ratings / rating_history
-- ----------------------------------------------------------------------------
-- "Pazarlık payı yok" maddesi: kullanıcı bu iki tabloya hiçbir koşulda
-- yazamaz. Yazma politikası yok ve yazma yetkisi de geri alındı —
-- ileride yanlışlıkla politika eklense bile GRANT seviyesinde kapalı.
create policy ratings_secim on public.ratings
  for select to authenticated
  using ((select private.aktif_uye_mi(league_id)));

create policy rating_history_secim on public.rating_history
  for select to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = rating_history.match_id
        and (select private.aktif_uye_mi(m.league_id))
    )
  );

revoke insert, update, delete on public.ratings        from anon, authenticated;
revoke insert, update, delete on public.rating_history from anon, authenticated;
