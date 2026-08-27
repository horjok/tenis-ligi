/**
 * Kullanıcı adı ↔ Supabase e-postası dönüşümü.
 *
 * Supabase her hesap için bir kimlik istiyor (e-posta, telefon veya anonim).
 * Biz kullanıcıdan e-posta istemiyoruz, o yüzden perde arkasında
 * `<kullaniciadi>@tenis-ligi.local` diye bir adres üretiyoruz.
 * Kullanıcı bu adresi hiç görmez, kimse buraya mail atmaz.
 *
 * Yan faydası: kullanıcı adı benzersizliğini ayrıca kontrol etmemize gerek yok.
 * Aynı kullanıcı adı = aynı e-posta olduğu için Supabase kendisi
 * "user_already_exists" der.
 *
 * NOT: İleride bildirim için gerçek e-posta eklenecekse, hesabın e-postasını
 * DEĞİŞTİRME — giriş kimliği bozulur. Gerçek adres `profiles` tablosuna ayrı
 * bir sütun olarak eklenmeli.
 */

export const SANAL_EPOSTA_ALAN_ADI = "tenis-ligi.local";

/** Veritabanındaki `profiles_username_format` kısıtının birebir aynısı. */
export const KULLANICI_ADI_DESENI = /^[a-z0-9_]{3,20}$/;

export function kullaniciAdiniNormalize(ham: string): string {
  return ham.trim().toLowerCase();
}

export function kullaniciAdindanEposta(kullaniciAdi: string): string {
  return `${kullaniciAdi}@${SANAL_EPOSTA_ALAN_ADI}`;
}
