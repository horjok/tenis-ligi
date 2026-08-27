"use server";

import { randomBytes } from "node:crypto";

import { ligBilgisi } from "@/lib/lig";
import { createClient } from "@/lib/supabase/server";

export type YonetimDurumu = {
  hata?: string;
  bilgi?: string;
};

/**
 * Okunabilir davet kodu üretir: TL-XXXXXXXX
 *
 * Alfabede I, O, 0, 1 yok — telefonda okunurken karıştırılmasınlar diye.
 * 32 harflik alfabe 256'yı tam böldüğü için `% uzunluk` sapma yaratmıyor.
 */
function kodUret(): string {
  const alfabe = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let sonuc = "";
  for (const bayt of randomBytes(8)) {
    sonuc += alfabe[bayt % alfabe.length];
  }
  return `TL-${sonuc}`;
}

export async function davetKoduUret(
  _oncekiDurum: YonetimDurumu,
  formData: FormData,
): Promise<YonetimDurumu> {
  const lig = await ligBilgisi();
  if (!lig?.admin) {
    return { hata: "Bu işlem için lig yöneticisi olmalısın." };
  }

  const kullanimHakki = Number(formData.get("maxUses") ?? 1);
  if (!Number.isInteger(kullanimHakki) || kullanimHakki < 1 || kullanimHakki > 50) {
    return { hata: "Kullanım hakkı 1 ile 50 arasında olmalı." };
  }

  const supabase = await createClient();
  const kod = kodUret();

  // RLS burada da bekçi: admin olmayan biri bu isteği atsa politika reddeder.
  const { error } = await supabase.from("invite_codes").insert({
    league_id: lig.ligId,
    code: kod,
    max_uses: kullanimHakki,
    created_by: lig.kullaniciId,
  });

  if (error) {
    return { hata: "Kod üretilemedi. Tekrar dener misin?" };
  }

  return { bilgi: `Yeni kod: ${kod}` };
}

export async function koduIptalEt(
  _oncekiDurum: YonetimDurumu,
  formData: FormData,
): Promise<YonetimDurumu> {
  const lig = await ligBilgisi();
  if (!lig?.admin) {
    return { hata: "Bu işlem için lig yöneticisi olmalısın." };
  }

  const kodId = String(formData.get("kodId") ?? "");
  if (!kodId) return { hata: "Kod bulunamadı." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("invite_codes")
    .delete()
    .eq("id", kodId);

  if (error) return { hata: "Kod iptal edilemedi." };
  return { bilgi: "Kod iptal edildi." };
}

export async function puanlariYenidenHesapla(): Promise<void> {
  const lig = await ligBilgisi();
  if (!lig?.admin) return;

  const supabase = await createClient();
  // Yetki kontrolü fonksiyonun kendi içinde de var; buradaki sadece
  // gereksiz istek atmamak için.
  await supabase.rpc("recalculate_ratings", { p_league_id: lig.ligId });
}
