-- ============================================================================
-- Kayıt yüzeyini daralt
--
-- `supabase db advisors` iki fonksiyonu işaretledi: ikisi de giriş yapmamış
-- (`anon`) kullanıcı tarafından çağrılabiliyordu. Kayıt formu için gerekliydi
-- ama ikisinin riski aynı değil, o yüzden ikisine aynı şeyi yapmıyoruz.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) davet_kodu_gecerli_mi → tamamen kaldırıldı
-- ----------------------------------------------------------------------------
-- Bu fonksiyon "şu kod geçerli mi?" sorusuna kimlik sormadan cevap veriyordu.
-- Yani bir saldırgan için kod deneme makinesi: doğru kodu bulana kadar
-- sınırsız tahmin. Davet kodu bizim tek kapımız olduğu için bu kapıya
-- deneme yanılma imkânı vermek doğru değil.
--
-- Kural zaten private.handle_new_user trigger'ında ve orada kalıyor.
-- Forma anlaşılır hata mesajı vermeyi sunucu tarafında çözüyoruz:
-- kayıt başarısız olursa kullanıcı adı hâlâ boşta mı diye bakıp
-- hatanın hangisinden geldiğini oradan anlıyoruz.
drop function if exists public.davet_kodu_gecerli_mi(text);

-- ----------------------------------------------------------------------------
-- 2) kullanici_adi_musait_mi → kalıyor, ama sadece anon çağırabilir
-- ----------------------------------------------------------------------------
-- Bunun sızdırdığı bilgi "şu kullanıcı adı alınmış mı" — ve kullanıcı adları
-- zaten puan tablosunda herkese görünecek. Gizli bir veri değil.
--
-- Yine de giriş yapmış kullanıcının buna ihtiyacı yok: kayıt olan kişi
-- tanımı gereği henüz giriş yapmamıştır. En az yetki ilkesi.
revoke execute on function public.kullanici_adi_musait_mi(text) from authenticated;
