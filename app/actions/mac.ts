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

/** Form tarihini günün ortasına sabitler. */
function oynanmaZamani(tarih: string): Date | null {
  // Tarih girdisi sadece gün veriyor. Günün ortasını seçiyoruz ki saat dilimi
  // farkı yüzünden maç bir gün öncesine/sonrasına kaymasın.
  const t = new Date(`${tarih}T12:00:00`);
  return Number.isNaN(t.getTime()) ? null : t;
}

/**
 * Çiftler maçı.
 *
 * Çağıran her zaman 1. takımda — bu kural veritabanındaki
 * cift_mac_kaydet'in imzasından geliyor, buradaki bir kontrolden değil.
 * "Biz kazandık / onlar kazandı" seçimi de bu yüzden yeterli.
 */
async function ciftlerKaydet(
  lig: NonNullable<Awaited<ReturnType<typeof ligBilgisi>>>,
  formData: FormData,
): Promise<MacFormDurumu> {
  const partner = String(formData.get("partner") ?? "");
  const rakip1 = String(formData.get("rakip1") ?? "");
  const rakip2 = String(formData.get("rakip2") ?? "");
  const kazanan = String(formData.get("kazanan") ?? "");
  const tarih = String(formData.get("tarih") ?? "");
  const yer = String(formData.get("yer") ?? "").trim();

  if (!partner || !rakip1 || !rakip2) {
    return { hata: "Partnerini ve iki rakibi seçmelisin." };
  }

  // Veritabanı da reddediyor (match_participants'ın birincil anahtarı
  // aynı kişinin bir maçta iki kez yer almasını imkânsız kılıyor).
  // Buradaki kontrol sadece daha hızlı ve anlaşılır hata için.
  const secilenler = [lig.kullaniciId, partner, rakip1, rakip2];
  if (new Set(secilenler).size !== 4) {
    return { hata: "Dört farklı oyuncu seç; aynı kişi iki yerde olamaz." };
  }

  if (kazanan !== "biz" && kazanan !== "onlar") {
    return { hata: "Kazanan tarafı işaretlemelisin." };
  }
  if (!tarih) return { hata: "Maç tarihini gir." };

  const zaman = oynanmaZamani(tarih);
  if (!zaman) return { hata: "Tarih anlaşılamadı." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cift_mac_kaydet", {
    p_league_id: lig.ligId,
    p_partner_id: partner,
    p_rakip1_id: rakip1,
    p_rakip2_id: rakip2,
    p_kazanan_takim: kazanan === "biz" ? 1 : 2,
    p_played_at: zaman.toISOString(),
    p_location: yer === "" ? undefined : yer,
    p_sets: setleriTopla(formData),
  });

  if (error) return { hata: error.message };

  redirect("/lig");
}

export async function macKaydet(
  _oncekiDurum: MacFormDurumu,
  formData: FormData,
): Promise<MacFormDurumu> {
  const lig = await ligBilgisi();
  if (!lig) {
    return { hata: "Aktif lig üyeliğin bulunamadı." };
  }

  if (String(formData.get("tur") ?? "singles") === "doubles") {
    return await ciftlerKaydet(lig, formData);
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

  const zaman = oynanmaZamani(tarih);
  if (!zaman) return { hata: "Tarih anlaşılamadı." };

  const supabase = await createClient();

  // Tüm doğrulama ve yazma işi veritabanındaki record_match'te.
  // Burası sadece formu ona uygun biçime çeviriyor.
  const { error } = await supabase.rpc("record_match", {
    p_league_id: lig.ligId,
    p_opponent_id: rakipId,
    p_winner_id: kazanan === "ben" ? lig.kullaniciId : rakipId,
    p_played_at: zaman.toISOString(),
    p_location: yer === "" ? undefined : yer,
    p_sets: setleriTopla(formData),
  });

  if (error) {
    // record_match'in fırlattığı mesajlar zaten Türkçe ve kullanıcıya uygun.
    return { hata: error.message };
  }

  redirect("/lig");
}
