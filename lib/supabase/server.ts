import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/database.types";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

/**
 * Sunucu tarafında çalışan Supabase istemcisi
 * (Server Component, Server Action ve Route Handler için).
 *
 * Her istek için YENİ bir istemci üretilir — bunu bir modül değişkenine alıp
 * paylaşma. Paylaşılırsa bir kullanıcının oturumu başkasına sızabilir.
 *
 * Next.js 16'da `cookies()` asenkron, o yüzden fonksiyon `async`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(yazilacakCerezler) {
        try {
          for (const { name, value, options } of yazilacakCerezler) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component'ler çerez yazamaz, Next.js burada hata fırlatır.
          // Sorun değil: oturum tazelemesini proxy.ts zaten yapıyor.
        }
      },
    },
  });
}
