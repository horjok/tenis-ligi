"use server";

import { ligBilgisi } from "@/lib/lig";
import { createClient } from "@/lib/supabase/server";

export type DilimDurumu = {
  hata?: string;
};

export async function dilimAc(slotIso: string): Promise<DilimDurumu> {
  const lig = await ligBilgisi();
  if (!lig) return { hata: "Aktif lig üyeliğin bulunamadı." };

  const supabase = await createClient();
  const { error } = await supabase.from("availability_slots").insert({
    league_id: lig.ligId,
    user_id: lig.kullaniciId,
    slot_start: slotIso,
  });

  if (error) {
    // Politikanın WITH CHECK'i geçmiş / 14 gün ötesi / saat aralığı dışını
    // reddediyor. Kullanıcı arayüzde bunları zaten seçemiyor; buraya
    // düşüyorsa ya sayfa eskimiş ya da istek elle atılmış.
    if (error.code === "23505") return {}; // zaten işaretliymiş, sorun değil
    return { hata: "Bu dilim işaretlenemedi. Sayfayı yenileyip tekrar dene." };
  }

  return {};
}

export async function dilimKapat(slotIso: string): Promise<DilimDurumu> {
  const lig = await ligBilgisi();
  if (!lig) return { hata: "Aktif lig üyeliğin bulunamadı." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("availability_slots")
    .delete()
    .eq("user_id", lig.kullaniciId)
    .eq("slot_start", slotIso);

  if (error) {
    // Veritabanı tetikleyicisinin mesajı zaten Türkçe ve kullanıcıya uygun
    // ("Bu saatte kesinleşmiş bir maçın var...").
    if (error.code === "23514") return { hata: error.message };
    return { hata: "Bu dilim kaldırılamadı." };
  }

  return {};
}
