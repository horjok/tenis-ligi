-- ============================================================================
-- Davet kodu temizleyici (ikinci deneme)
--
-- Bir önceki migration kodu INSERT trigger'ı içinden silmeye çalıştı ve
-- çalışmadı: GoTrue, trigger'ımız bittikten SONRA raw_user_meta_data'yı
-- kendi alanlarıyla (sub, email_verified, phone_verified...) baştan yazıyor
-- ve bizim sildiğimiz alanı geri getiriyor.
--
-- Bu yüzden temizliği UPDATE'e bağlıyoruz: GoTrue yazdıktan sonra biz
-- siliyoruz.
--
-- Sonsuz döngü riski WHEN koşuluyla kapalı: trigger yalnızca metadata'da
-- 'invite_code' anahtarı VARSA çalışır. Sildikten sonraki UPDATE'te anahtar
-- yok, dolayısıyla trigger ikinci kez tetiklenmez.
-- ============================================================================

create or replace function private.davet_kodunu_temizle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update auth.users
  set raw_user_meta_data = raw_user_meta_data - 'invite_code'
  where id = new.id;

  return null; -- AFTER trigger; dönüş değeri kullanılmıyor
end;
$$;

revoke execute on function private.davet_kodunu_temizle() from public, anon, authenticated, service_role;

create trigger on_auth_user_invite_code_cleanup
  after update on auth.users
  for each row
  when (new.raw_user_meta_data ? 'invite_code')
  execute function private.davet_kodunu_temizle();

-- Bir önceki migration'daki INSERT içi silme denemesini geri al:
-- işe yaramıyor ve okuyanı yanıltıyor. Kural artık yukarıdaki trigger'da.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username     text;
  v_display_name text;
  v_code         text;
  v_invite       public.invite_codes%rowtype;
begin
  v_username     := lower(btrim(new.raw_user_meta_data ->> 'username'));
  v_display_name := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  v_code         := upper(btrim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));

  if v_username is null or v_username = '' then
    raise exception 'Kullanıcı adı zorunlu.' using errcode = 'check_violation';
  end if;

  if v_display_name = '' then
    v_display_name := v_username;
  end if;

  select * into v_invite
  from public.invite_codes
  where code = v_code
  for update;

  if not found then
    raise exception 'Davet kodu geçersiz.' using errcode = 'check_violation';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'Davet kodunun süresi dolmuş.' using errcode = 'check_violation';
  end if;

  if v_invite.used_count >= v_invite.max_uses then
    raise exception 'Davet kodunun kullanım hakkı dolmuş.' using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, v_display_name);

  insert into public.league_members (league_id, user_id, status, role, joined_at)
  values (v_invite.league_id, new.id, 'active', 'player', now());

  update public.invite_codes
  set used_count = used_count + 1
  where id = v_invite.id;

  return new;
end;
$$;

-- Mevcut kayıtları da temizle (test hesapları dahil).
update auth.users
set raw_user_meta_data = raw_user_meta_data - 'invite_code'
where raw_user_meta_data ? 'invite_code';
