"use server";

import { createClient } from "@/lib/supabase/server";

export type OneriDurumu = {
  hata?: string;
  bilgi?: string;
};

export async function oneriyiKabulEt(macId: string): Promise<OneriDurumu> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("oneriyi_kabul_et", {
    p_match_id: macId,
  });

  if (error) {
    // Veritabanı fonksiyonunun mesajları zaten Türkçe ve kullanıcıya uygun.
    return { hata: error.message };
  }

  return {
    bilgi:
      data === "kesinlesti"
        ? "Maç kesinleşti. O saatteki diğer önerilerin iptal edildi."
        : "Kabul ettin. Rakibinin de kabul etmesi bekleniyor.",
  };
}

export async function oneriyiReddet(macId: string): Promise<OneriDurumu> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("oneriyi_reddet", {
    p_match_id: macId,
  });

  if (error) return { hata: error.message };
  return { bilgi: "Öneri reddedildi." };
}
