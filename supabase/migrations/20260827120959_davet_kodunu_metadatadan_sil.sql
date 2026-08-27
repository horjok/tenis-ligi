-- ============================================================================
-- Davet kodunu kullanıcı metadata'sından sil
--
-- Kayıt sırasında davet kodunu raw_user_meta_data üzerinden trigger'a
-- geçiriyoruz. Sorun: orada KALIYOR ve kullanıcının her access token'ının
-- içine gömülüyor. Kod, kullanıcının kendi bildiği bir şey olduğu için
-- doğrudan bir açık değil; ama token bir yere loglanırsa (tarayıcı eklentisi,
-- hata izleme servisi, sunucu günlüğü) çok kullanımlı davet kodu da onunla
-- birlikte sızar.
--
-- Çözüm: kod doğrulanıp sayacı artırıldıktan sonra metadata'dan silinir.
-- Tek işi vardı, bitti.
-- ============================================================================

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

  -- Kodu kilitleyerek oku: iki kişi aynı anda son hakkı kullanamasın.
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

  -- Kodun işi bitti, metadata'da bırakma.
  -- AFTER INSERT trigger'ında new'i değiştirmek satırı güncellemez,
  -- o yüzden auth.users'ı açıkça UPDATE ediyoruz. Bu trigger sadece
  -- INSERT'te çalıştığı için kendini tekrar tetiklemez.
  update auth.users
  set raw_user_meta_data = new.raw_user_meta_data - 'invite_code'
  where id = new.id;

  return new;
end;
$$;
