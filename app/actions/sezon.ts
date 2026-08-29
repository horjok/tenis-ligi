"use server";

import { revalidatePath } from "next/cache";

import { ligBilgisi } from "@/lib/lig";
import { createClient } from "@/lib/supabase/server";

export type SezonDurumu = {
  hata?: string;
  bilgi?: string;
};

function metin(formData: FormData, alan: string): string {
  return String(formData.get(alan) ?? "").trim();
}

/** "2026-06-01" biçiminde mi ve gerçek bir gün mü? */
function tarihGecerliMi(deger: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deger)) return false;
  const t = new Date(`${deger}T12:00:00`);
  return !Number.isNaN(t.getTime()) && deger === t.toISOString().slice(0, 10);
}

function hataMesaji(hata: { message: string; code?: string }): string {
  // 23P01 = exclusion_violation. Bizim tek dışlama kısıtımız sezon çakışması.
  //
  // Ham mesaj "conflicting key value violates exclusion constraint" diyor;
  // bunu kullanıcıya göstermek anlamsız. Üstelik en sık karşılaşılacak hali
  // sezonun çakışması değil, SÜREN sezonun ucunun açık olması: bitiş tarihi
  // boşken aralık sonsuza uzanıyor ve sonraki her tarih onunla çakışıyor.
  if (hata.code === "23P01") {
    return (
      "Bu tarihler mevcut bir sezonla çakışıyor. " +
      "Süren bir sezon varsa (bitişi boş) önce ona bitiş tarihi ver — " +
      "bitişi olmayan sezon sonsuza kadar sürüyor sayılır."
    );
  }
  if (hata.code === "23514") return hata.message;
  if (hata.code === "42501") return "Bu işlem için lig yöneticisi olmalısın.";

  console.error("Beklenmeyen sezon hatası:", hata.code, hata.message);
  return "Bir şeyler ters gitti. Tekrar dener misin?";
}

export async function sezonOlustur(
  _oncekiDurum: SezonDurumu,
  formData: FormData,
): Promise<SezonDurumu> {
  const lig = await ligBilgisi();
  if (!lig?.admin) return { hata: "Bu işlem için lig yöneticisi olmalısın." };

  const ad = metin(formData, "ad");
  const baslangic = metin(formData, "baslangic");
  const bitis = metin(formData, "bitis");

  if (ad.length < 2 || ad.length > 60) {
    return { hata: "Sezon adı 2-60 karakter olmalı." };
  }
  if (!tarihGecerliMi(baslangic)) {
    return { hata: "Başlangıç tarihi geçersiz." };
  }
  if (bitis && !tarihGecerliMi(bitis)) {
    return { hata: "Bitiş tarihi geçersiz." };
  }
  if (bitis && bitis < baslangic) {
    return { hata: "Bitiş tarihi başlangıçtan önce olamaz." };
  }

  const supabase = await createClient();
  // RLS burada da bekçi: admin olmayan biri bu isteği elle atsa politika reddeder.
  const { error } = await supabase.from("seasons").insert({
    league_id: lig.ligId,
    name: ad,
    starts_on: baslangic,
    // Boş bırakılırsa sezon "sürüyor" demek.
    ends_on: bitis || null,
  });

  if (error) return { hata: hataMesaji(error) };

  revalidatePath("/lig/yonetim");
  revalidatePath("/lig");
  return { bilgi: `"${ad}" sezonu oluşturuldu.` };
}

export async function sezonBitir(
  _oncekiDurum: SezonDurumu,
  formData: FormData,
): Promise<SezonDurumu> {
  const lig = await ligBilgisi();
  if (!lig?.admin) return { hata: "Bu işlem için lig yöneticisi olmalısın." };

  const sezonId = metin(formData, "sezonId");
  const bitis = metin(formData, "bitis");
  if (!sezonId) return { hata: "Sezon bulunamadı." };
  if (!tarihGecerliMi(bitis)) return { hata: "Bitiş tarihi geçersiz." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("seasons")
    .update({ ends_on: bitis })
    .eq("id", sezonId);

  if (error) return { hata: hataMesaji(error) };

  revalidatePath("/lig/yonetim");
  revalidatePath("/lig");
  return { bilgi: "Sezon bitiş tarihi kaydedildi." };
}

/**
 * Sezonu siler.
 *
 * Hiçbir maç kaydına dokunmaz — sezon zaten sadece bir tarih aralığı,
 * maçlarla arasında bağ yok. Silinen sezon yalnızca sıralama ekranından
 * kaybolur.
 */
export async function sezonSil(
  _oncekiDurum: SezonDurumu,
  formData: FormData,
): Promise<SezonDurumu> {
  const lig = await ligBilgisi();
  if (!lig?.admin) return { hata: "Bu işlem için lig yöneticisi olmalısın." };

  const sezonId = metin(formData, "sezonId");
  if (!sezonId) return { hata: "Sezon bulunamadı." };

  const supabase = await createClient();
  const { error } = await supabase.from("seasons").delete().eq("id", sezonId);

  if (error) return { hata: hataMesaji(error) };

  revalidatePath("/lig/yonetim");
  revalidatePath("/lig");
  return { bilgi: "Sezon silindi. Maç kayıtları etkilenmedi." };
}
