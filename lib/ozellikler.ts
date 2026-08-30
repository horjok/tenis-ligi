/**
 * Henüz açılmamış özellikler.
 *
 * Buradaki bayraklar kodu silmek yerine ekrandan gizlemek için. Altyapı
 * yazılmış ve sınanmış durumda; eksik olan tek şey dışarıdaki bir servis
 * ya da bir karar.
 */

/**
 * E-posta bildirimleri.
 *
 * KAPALI, çünkü bir mail gönderme servisi bağlanmadı. Sistem "kuru modda"
 * çalışıyor: kimin hangi maili alacağını hesaplıyor, gövdesini üretiyor,
 * notification_log'a yazıyor — ama göndermiyor.
 *
 * Kapalıyken form gösterilmemesinin sebebi dürüstlük: kullanıcı adresini
 * yazsa "doğrulama bağlantısı gönderildi" derdik ve hiçbir şey gitmezdi.
 *
 * AÇMAK İÇİN:
 *   1. Bir mail servisi hesabı aç (Resend ücretsiz katmanı yeterli:
 *      günde 100, ayda 3.000 mail).
 *   2. Kendi domain'ini doğrula. Domain olmadan Resend yalnızca kayıt
 *      olunan adrese gönderiyor, yani lig için işe yaramaz.
 *   3. Supabase'e iki secret ekle:
 *        supabase secrets set RESEND_API_KEY=...
 *        supabase secrets set SITE_URL=https://tenis-ligi.vercel.app
 *   4. Burayı true yap.
 *
 * Başka bir servise (ör. Brevo) geçilecekse değişmesi gereken tek yer
 * supabase/functions/eposta/index.ts içindeki `gonder()` fonksiyonu.
 */
export const BILDIRIM_ACIK = false;
