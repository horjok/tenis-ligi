"use server";

import { createClient } from "@/lib/supabase/server";

export type SonucDurumu = {
  hata?: string;
};

export async function sonucGir(
  _oncekiDurum: SonucDurumu,
  formData: FormData,
): Promise<SonucDurumu> {
  const macId = String(formData.get("macId") ?? "");
  const kazananId = String(formData.get("kazanan") ?? "");
  const yer = String(formData.get("yer") ?? "").trim();

  if (!macId) return { hata: "Maç bulunamadı." };
  if (!kazananId) return { hata: "Kazananı işaretlemelisin." };

  // Set satırlarını topla: ikisi de doluysa geçerli sayılır.
  const setler: { team1: number; team2: number }[] = [];
  for (let i = 1; i <= 3; i++) {
    const ben = String(formData.get(`set${i}_ben`) ?? "").trim();
    const rakip = String(formData.get(`set${i}_rakip`) ?? "").trim();
    if (ben === "" || rakip === "") continue;
    setler.push({ team1: Number(ben), team2: Number(rakip) });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("sonuc_gir", {
    p_match_id: macId,
    p_winner_id: kazananId,
    p_sets: setler,
    p_location: yer === "" ? undefined : yer,
  });

  if (error) return { hata: error.message };
  return {};
}
