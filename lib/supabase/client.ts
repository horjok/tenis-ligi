import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

/**
 * Tarayıcıda çalışan Supabase istemcisi ("use client" bileşenleri için).
 *
 * <Database> tipi `supabase gen types` ile şemadan üretiliyor. Sayesinde
 * yanlış tablo veya sütun adı yazarsan derleme sırasında yakalanır.
 */
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
