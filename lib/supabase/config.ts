/**
 * .env.local'daki Supabase ayarlarını tek yerden okur.
 *
 * Neden ayrı dosya? Değişken eksikse hata "undefined is not a string" gibi
 * anlamsız bir yerde patlamasın, tam olarak neyin eksik olduğunu söylesin.
 *
 * NEXT_PUBLIC_ öneki olan değişkenleri Next.js derleme sırasında metin olarak
 * kodun içine gömer. Bu yüzden `process.env.NEXT_PUBLIC_...` şeklinde tam adıyla
 * yazılmak zorunda — değişkene atayıp döndürmek çalışmaz.
 */

function zorunlu(ad: string, deger: string | undefined): string {
  if (!deger) {
    throw new Error(
      `${ad} tanımlı değil. .env.local dosyasını kontrol et ve dev sunucusunu yeniden başlat.`,
    );
  }
  return deger;
}

export const SUPABASE_URL = zorunlu(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_PUBLISHABLE_KEY = zorunlu(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
