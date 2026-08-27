"use server";

import { redirect } from "next/navigation";

import { ligBilgisi } from "@/lib/lig";
import { createClient } from "@/lib/supabase/server";

export type MacFormDurumu = {
  hata?: string;
};

/** Formdaki set satırlarını record_match'in beklediği JSON'a çevirir. */
function setleriTopla(formData: FormData): { team1: number; team2: number }[] {
  const setler: { team1: number; team2: number }[] = [];

  for (let i = 1; i <= 3; i++) {
    const ben = String(formData.get(`set${i}_ben`) ?? "").trim();
    const rakip = String(formData.get(`set${i}_rakip`) ?? "").trim();

    // İkisi de boşsa o set oynanmamış; biri boşsa eksik giriş, atlıyoruz.
    if (ben === "" || rakip === "") continue;

    setler.push({ team1: Number(ben), team2: Number(rakip) });
  }

  return setler;
}

export async function macKaydet(
  _oncekiDurum: MacFormDurumu,
  formData: FormData,
): Promise<MacFormDurumu> {
  const lig = await ligBilgisi();
  if (!lig) {
    return { hata: "Aktif lig üyeliğin bulunamadı." };
  }

  const rakipId = String(formData.get("rakip") ?? "");
  const kazanan = String(formData.get("kazanan") ?? "");
  const tarih = String(formData.get("tarih") ?? "");
  const yer = String(formData.get("yer") ?? "").trim();

  if (!rakipId) return { hata: "Rakip seçmelisin." };
  if (kazanan !== "ben" && kazanan !== "rakip") {
    return { hata: "Kazananı işaretlemelisin." };
  }
  if (!tarih) return { hata: "Maç tarihini gir." };

  // Tarih girdisi sadece gün veriyor. Günün ortasını seçiyoruz ki saat dilimi
  // farkı yüzünden maç bir gün öncesine/sonrasına kaymasın.
  const oynanmaZamani = new Date(`${tarih}T12:00:00`);
  if (Number.isNaN(oynanmaZamani.getTime())) {
    return { hata: "Tarih anlaşılamadı." };
  }

  const supabase = await createClient();

  // Tüm doğrulama ve yazma işi veritabanındaki record_match'te.
  // Burası sadece formu ona uygun biçime çeviriyor.
  const { error } = await supabase.rpc("record_match", {
    p_league_id: lig.ligId,
    p_opponent_id: rakipId,
    p_winner_id: kazanan === "ben" ? lig.kullaniciId : rakipId,
    p_played_at: oynanmaZamani.toISOString(),
    p_location: yer === "" ? undefined : yer,
    p_sets: setleriTopla(formData),
  });

  if (error) {
    // record_match'in fırlattığı mesajlar zaten Türkçe ve kullanıcıya uygun.
    return { hata: error.message };
  }

  redirect("/lig");
}
