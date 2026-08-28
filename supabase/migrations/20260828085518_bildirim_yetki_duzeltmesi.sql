-- ============================================================================
-- Faz 3 / Adım 1 düzeltmesi — iki fonksiyon tarayıcıya açık kalmıştı
--
-- `revoke execute ... from public` YETMİYOR.
--
-- Supabase, public şemasında oluşturulan YENİ fonksiyonlara `anon`,
-- `authenticated` ve `service_role` rollerine DOĞRUDAN execute veren bir
-- "default privileges" kuralı işletiyor. PUBLIC sözde-rolünden geri almak
-- o doğrudan hibeleri kaldırmaz — ikisi ayrı şeydir.
--
-- Ölçülen sonuç (düzeltmeden önce, gerçekten üretildi):
--   * Giriş yapmış herhangi bir kullanıcı gunluk_bildirim_listesi() çağırıp
--     ligdeki herkesin e-posta adresini ve iptal token'ını okuyabiliyordu.
--   * dogrulama_maili_verisi(<baska_kullanici_id>) başkasının bekleyen
--     doğrulama token'ını döndürüyordu. Bu daha ağır: token'ı alan kişi
--     eposta_dogrula(token) çağırıp kendi seçtiği adresi o kişinin hesabına
--     onaylatabilir, sonra da lig bildirimlerini kendi adresinden okuyabilirdi.
--
-- Ders: public şemasında service_role'e özel bir fonksiyon yazarken
-- `from public` değil, `from anon, authenticated` yazılmalı.
-- ============================================================================

revoke execute on function public.gunluk_bildirim_listesi(boolean) from anon, authenticated;
revoke execute on function public.dogrulama_maili_verisi(uuid)     from anon, authenticated;
