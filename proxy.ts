import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/lib/supabase/config";

/**
 * Next.js 16'da bu dosyanın adı `middleware.ts` DEĞİL `proxy.ts`.
 * İşlevi aynı: her istek sayfaya ulaşmadan önce burası çalışır.
 *
 * Buradaki tek kritik iş: oturum jetonunun süresi dolmuşsa yenilemek ve
 * yeni çerezi hem gelen isteğe hem giden cevaba yazmak. Server Component'ler
 * çerez yazamadığı için bu adım olmazsa kullanıcılar rastgele oturum düşmesi
 * yaşar.
 */

/** Giriş yapmamış kullanıcının girebileceği yollar. */
const HERKESE_ACIK = ["/giris", "/auth"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(yazilacakCerezler, basliklar) {
        // 1) Gelen isteği güncelle ki aşağıdaki kodda taze jeton görünsün
        for (const { name, value } of yazilacakCerezler) {
          request.cookies.set(name, value);
        }

        // 2) Cevabı baştan üret ve çerezleri ona da yaz
        response = NextResponse.next({ request });
        for (const { name, value, options } of yazilacakCerezler) {
          response.cookies.set(name, value, options);
        }

        // 3) Kütüphanenin verdiği başlıkları da geçir.
        //    Bunlar "bu cevabı önbelleğe alma" diyen başlıklar. Atlanırsa bir
        //    CDN, bir kullanıcının oturum çerezini başkasına servis edebilir.
        for (const [ad, deger] of Object.entries(basliklar)) {
          response.headers.set(ad, deger);
        }
      },
    },
  });

  // getSession() sunucuda güvenilir DEĞİL — jetonu doğrulamadan çerezden okur.
  // getClaims() imzayı projenin açık anahtarıyla her seferinde doğrular.
  const { data } = await supabase.auth.getClaims();
  const girisYapilmis = Boolean(data?.claims);

  const yol = request.nextUrl.pathname;
  const acikYol = HERKESE_ACIK.some(
    (p) => yol === p || yol.startsWith(`${p}/`),
  );

  if (!girisYapilmis && !acikYol) {
    const url = request.nextUrl.clone();
    url.pathname = "/giris";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Statik dosyalar ve resim optimizasyonu dışındaki her yolu yakala.
     * Bunları dışarıda bırakmak gereksiz Supabase çağrısı yapılmasını önler.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
