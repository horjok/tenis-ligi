"use server";

import { redirect } from "next/navigation";

import {
  KULLANICI_ADI_DESENI,
  kullaniciAdindanEposta,
  kullaniciAdiniNormalize,
} from "@/lib/auth/kullanici-adi";
import { createClient } from "@/lib/supabase/server";

/**
 * Formlardan dönen sonuç. `useActionState` bunu okuyup ekranda gösterir.
 */
export type FormDurumu = {
  hata?: string;
};

function metin(formData: FormData, alan: string): string {
  return String(formData.get(alan) ?? "").trim();
}

/**
 * Supabase'den gelen hatayı kullanıcıya gösterilebilir bir cümleye çevirir.
 *
 * Neden gerek var: veritabanı trigger'ımızın fırlattığı mesajlar zaten
 * Türkçe ve anlaşılır ("Davet kodu geçersiz."). Ama Postgres'in kendi
 * ürettiği kısıt hataları ("duplicate key value violates unique
 * constraint...") kullanıcıya gösterilecek şeyler değil.
 */
function hataMesaji(hata: { message: string; code?: string }): string {
  // Kendi trigger'ımızın check kuralları — mesajı doğrudan gösterilebilir.
  if (hata.code === "23514") {
    return hata.message;
  }
  if (hata.code === "user_already_exists") {
    return "Bu kullanıcı adı alınmış, başka bir tane dene.";
  }
  if (hata.code === "weak_password") {
    return "Şifre çok zayıf, daha uzun bir şifre seç.";
  }

  // Beklenmedik bir şey: sunucu günlüğüne düşsün, kullanıcıya ham hata gitmesin.
  console.error("Beklenmeyen auth hatası:", hata.code, hata.message);
  return "Bir şeyler ters gitti. Tekrar dener misin?";
}

export async function kayitOl(
  _oncekiDurum: FormDurumu,
  formData: FormData,
): Promise<FormDurumu> {
  const davetKodu = metin(formData, "davetKodu").toUpperCase();
  const kullaniciAdi = kullaniciAdiniNormalize(metin(formData, "kullaniciAdi"));
  const gorunenAd = metin(formData, "gorunenAd");
  const sifre = metin(formData, "sifre");

  if (!davetKodu) {
    return { hata: "Davet kodu zorunlu. Kodu ligi kuran kişiden alabilirsin." };
  }
  if (!KULLANICI_ADI_DESENI.test(kullaniciAdi)) {
    return {
      hata: "Kullanıcı adı 3-20 karakter olmalı; sadece küçük harf, rakam ve alt çizgi.",
    };
  }
  if (gorunenAd.length < 2 || gorunenAd.length > 40) {
    return { hata: "Görünen ad 2-40 karakter olmalı." };
  }
  if (sifre.length < 8) {
    return { hata: "Şifre en az 8 karakter olmalı." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: kullaniciAdindanEposta(kullaniciAdi),
    password: sifre,
    // Bu alanlar user_metadata'ya yazılır. Veritabanındaki
    // private.handle_new_user trigger'ı bunları okuyup davet kodunu
    // doğruluyor, profil satırını açıyor ve lige üye yapıyor.
    // Kod geçersizse trigger hata fırlatır ve hesap hiç oluşmaz.
    options: {
      data: {
        username: kullaniciAdi,
        display_name: gorunenAd,
        invite_code: davetKodu,
      },
    },
  });

  if (error) {
    return { hata: hataMesaji(error) };
  }

  // E-posta onayı kapalı olduğu için kayıt anında oturum açılır.
  redirect("/");
}

export async function girisYap(
  _oncekiDurum: FormDurumu,
  formData: FormData,
): Promise<FormDurumu> {
  const kullaniciAdi = kullaniciAdiniNormalize(metin(formData, "kullaniciAdi"));
  const sifre = metin(formData, "sifre");

  if (!kullaniciAdi || !sifre) {
    return { hata: "Kullanıcı adı ve şifre zorunlu." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: kullaniciAdindanEposta(kullaniciAdi),
    password: sifre,
  });

  if (error) {
    // Kullanıcı adı mı yanlış şifre mi, ayırt ETMİYORUZ. Ayırt edersek
    // "bu kullanıcı adı var mı" sorusunu dışarıya cevaplamış oluruz.
    //
    // AMA bu gizlilik kuralı yalnızca KİMLİK hatalarını kapsıyor. Eskiden
    // buradaki tek satır her hatayı aynı mesaja çeviriyordu: hız sınırını,
    // yanlış API anahtarını, ağ kopmasını da. Sonuç, yapılandırma bozukken
    // "şifren yanlış" yazan ve kimsenin sebebini bulamadığı bir ekrandı.
    if (error.code === "invalid_credentials" || error.status === 400) {
      return { hata: "Kullanıcı adı veya şifre hatalı." };
    }

    if (error.code === "over_request_rate_limit" || error.status === 429) {
      return {
        hata: "Çok fazla deneme yapıldı. Birkaç dakika bekleyip tekrar dene.",
      };
    }

    // Buraya düşen her şey kullanıcının hatası DEĞİL: 401 (anahtar geçersiz),
    // 5xx, ağ hatası. Ayrıntı sunucu günlüğüne gidiyor; ekranda yalnızca
    // "sende bir sorun yok, tekrar dene" mesajı var. Teşhis için gereken
    // durum kodu aşağıdaki console.error satırında.
    console.error("Giriş servisi hatası:", error.status, error.code, error.message);
    return {
      hata:
        "Şu an giriş yapılamıyor. Şifrenle ilgisi yok, sorun bizde. " +
        "Birkaç dakika sonra tekrar dene; sürerse ligi yöneten kişiye haber ver.",
    };
  }

  redirect("/");
}

export async function cikisYap() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/giris");
}
