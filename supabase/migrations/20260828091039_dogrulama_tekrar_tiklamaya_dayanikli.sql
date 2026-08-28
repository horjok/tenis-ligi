-- ============================================================================
-- Faz 3 / Adım 2 — Doğrulama linki iki kez açılırsa
--
-- Sorun: link tek kullanımlık. Ama tek kullanımlık olması, kullanıcının
-- linke bir kez DOKUNACAĞI anlamına gelmiyor:
--   - tarayıcı sayfayı yeniler,
--   - kullanıcı geri gidip tekrar tıklar,
--   - mail istemcisi bağlantıları önden getirir (link tarama),
--   - Server Component beklenmedik biçimde iki kez render edilir.
-- Bunların hepsinde ikinci çağrı "kullanilmis" döner ve kullanıcı işlem
-- başarılıyken hata ekranı görür.
--
-- Çözüm: token kullanılmışsa, o adresin ŞU AN kullanıcının doğrulanmış
-- adresi olup olmadığına bak. Öyleyse iş zaten olmuştur, başarı dön.
-- Kullanıcı sonradan adresini değiştirdiyse eşleşme olmaz ve "kullanilmis"
-- doğru cevap olur.
-- ============================================================================

create or replace function public.eposta_dogrula(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kayit public.email_verifications%rowtype;
begin
  select * into v_kayit
  from public.email_verifications
  where token = p_token
  for update;

  if not found then
    return jsonb_build_object('durum', 'gecersiz');
  end if;

  if v_kayit.used_at is not null then
    if exists (
      select 1 from public.notification_settings s
      where s.user_id = v_kayit.user_id
        and s.email = v_kayit.email
    ) then
      return jsonb_build_object('durum', 'tamam', 'email', v_kayit.email);
    end if;
    return jsonb_build_object('durum', 'kullanilmis');
  end if;

  if v_kayit.expires_at <= now() then
    return jsonb_build_object('durum', 'suresi_gecti');
  end if;

  update public.notification_settings
  set email             = v_kayit.email,
      email_verified_at = now()
  where user_id = v_kayit.user_id;

  update public.email_verifications
  set used_at = now()
  where user_id = v_kayit.user_id and used_at is null;

  return jsonb_build_object('durum', 'tamam', 'email', v_kayit.email);
end;
$$;

revoke execute on function public.eposta_dogrula(uuid) from public;
grant  execute on function public.eposta_dogrula(uuid) to anon, authenticated;
