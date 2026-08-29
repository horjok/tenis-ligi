"use server";

import { revalidatePath } from "next/cache";

import { kullaniciAdindanEposta } from "@/lib/auth/kullanici-adi";
import { ligBilgisi } from "@/lib/lig";
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type HesapDurumu = {
  hata?: string;
  bilgi?: string;
};

function metin(formData: FormData, alan: string): string {
  return String(formData.get(alan) ?? "").trim();
}

/**
 * Görünen adı değiştirir.
 *
 * Doğrudan tabloya yazıyoruz: `display_name` kullanıcının kendi satırında
 * değiştirebileceği tek sütun (Faz 1'de GRANT ile kısıtlandı) ve RLS
 * başkasının satırına yazmasını engelliyor. `username` DEĞİŞMİYOR — giriş
 * kimliği (<kullaniciadi>@tenis-ligi.local) ona bağlı.
 */
export async function adiDegistir(
  _oncekiDurum: HesapDurumu,
  formData: FormData,
): Promise<HesapDurumu> {
  const lig = await ligBilgisi();
  if (!lig) return { hata: "Lige üye değilsin." };

  const ad = metin(formData, "gorunenAd");
  if (ad.length < 2 || ad.length > 40) {
    return { hata: "Görünen ad 2-40 karakter olmalı." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: ad })
    .eq("id", lig.kullaniciId);

  if (error) {
    console.error("Ad değiştirilemedi:", error.code, error.message);
    return { hata: "Adın kaydedilemedi. Tekrar dener misin?" };
  }

  revalidatePath("/lig/profil");
  revalidatePath("/lig");
  return { bilgi: `Görünen adın "${ad}" olarak kaydedildi.` };
}

/**
 * Mevcut şifreyi doğrular.
 *
 * NEDEN GEREKLİ: Supabase'in `updateUser` çağrısı yalnızca geçerli bir oturum
 * istiyor, mevcut şifreyi sormuyor. Yani açık unutulmuş bir tarayıcının
 * başına geçen biri şifreyi değiştirip hesabı tamamen ele geçirebilir —
 * gerçek sahibi bir daha giremez.
 *
 * Doğrulamayı sunucudaki Supabase istemcisiyle DEĞİL, düz `fetch` ile
 * yapıyoruz: istemciyi kullansaydık başarılı doğrulama oturum çerezlerini
 * yeniden yazardı. Buradaki tek soru "bu şifre doğru mu", oturuma
 * dokunmasına gerek yok.
 */
async function mevcutSifreDogruMu(
  kullaniciAdi: string,
  sifre: string,
): Promise<boolean> {
  try {
    const cevap = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: kullaniciAdindanEposta(kullaniciAdi),
          password: sifre,
        }),
      },
    );
    return cevap.ok;
  } catch {
    return false;
  }
}

export async function sifreDegistir(
  _oncekiDurum: HesapDurumu,
  formData: FormData,
): Promise<HesapDurumu> {
  const lig = await ligBilgisi();
  if (!lig) return { hata: "Lige üye değilsin." };

  const mevcut = metin(formData, "mevcutSifre");
  const yeni = metin(formData, "yeniSifre");
  const yeniTekrar = metin(formData, "yeniSifreTekrar");

  if (!mevcut) return { hata: "Mevcut şifreni gir." };
  if (yeni.length < 8) return { hata: "Yeni şifre en az 8 karakter olmalı." };
  if (yeni !== yeniTekrar) return { hata: "Yeni şifreler birbirini tutmuyor." };
  if (yeni === mevcut) return { hata: "Yeni şifre eskisiyle aynı olamaz." };

  const supabase = await createClient();

  // Kullanıcı adını profilden alıyoruz; giriş kimliği ondan türüyor.
  const { data: profil } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", lig.kullaniciId)
    .maybeSingle();

  if (!profil?.username) return { hata: "Hesabın bulunamadı." };

  if (!(await mevcutSifreDogruMu(profil.username, mevcut))) {
    return { hata: "Mevcut şifren yanlış." };
  }

  const { error } = await supabase.auth.updateUser({ password: yeni });
  if (error) {
    if (error.code === "weak_password") {
      return { hata: "Şifre çok zayıf, daha uzun bir tane seç." };
    }
    console.error("Şifre değiştirilemedi:", error.code, error.message);
    return { hata: "Şifre değiştirilemedi. Tekrar dener misin?" };
  }

  return {
    bilgi:
      "Şifren değişti. Burada açık kalıyorsun; başka cihazlarda yeni " +
      "şifrenle gireceksin.",
  };
}
