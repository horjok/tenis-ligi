"use server";

import { revalidatePath } from "next/cache";

import { ligBilgisi } from "@/lib/lig";
import { createClient } from "@/lib/supabase/server";

export type BildirimDurumu = {
  hata?: string;
  bilgi?: string;
};

function metin(formData: FormData, alan: string): string {
  return String(formData.get(alan) ?? "").trim();
}

/**
 * Veritabanından gelen hatayı kullanıcıya gösterilebilir bir cümleye çevirir.
 *
 * Fonksiyonlarımızın kendi fırlattığı mesajlar zaten Türkçe ve anlaşılır
 * ("Çok fazla deneme yaptın."). Postgres'in kendi ürettikleri değil.
 */
function hataMesaji(hata: { message: string; code?: string }): string {
  // 23514 check_violation, 42501 insufficient_privilege — ikisi de bizim
  // fonksiyonlarımızın bilerek fırlattığı, gösterilebilir hatalar.
  if (hata.code === "23514" || hata.code === "42501") {
    return hata.message;
  }
  console.error("Beklenmeyen bildirim hatası:", hata.code, hata.message);
  return "Bir şeyler ters gitti. Tekrar dener misin?";
}

/**
 * Adresi kaydeder ve doğrulama linki üretir.
 *
 * DİKKAT: adres burada kullanıcının hesabına YAZILMAZ. Yalnızca
 * `email_verifications` tablosuna bir bekleyen kayıt düşer. Adres ancak
 * maildeki linke tıklanınca `notification_settings.email`'e geçer.
 */
export async function epostaEkle(
  _oncekiDurum: BildirimDurumu,
  formData: FormData,
): Promise<BildirimDurumu> {
  const lig = await ligBilgisi();
  if (!lig) return { hata: "Lige üye değilsin." };

  const adres = metin(formData, "eposta");
  if (!adres) return { hata: "E-posta adresi yaz." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("eposta_ekle", { p_email: adres });

  if (error) return { hata: hataMesaji(error) };

  revalidatePath("/lig/profil");

  // Kayıt açıldı; şimdi maili Edge Function göndersin.
  //
  // Jetonu ELLE geçiriyoruz. `functions.invoke` normalde oturum jetonunu
  // kendisi ekler, ama bunu tarayıcıdaki auth olaylarını dinleyerek yapıyor —
  // sunucuda o olaylar hiç tetiklenmiyor ve istek anon anahtarıyla giderdi.
  // O da Edge Function tarafında "geçersiz oturum" demek olurdu.
  const { data: oturum } = await supabase.auth.getSession();
  const jeton = oturum.session?.access_token;

  if (!jeton) {
    return {
      hata: "Oturumun düşmüş görünüyor. Sayfayı yenileyip tekrar dener misin?",
    };
  }

  const { data: sonuc, error: gonderimHatasi } = await supabase.functions.invoke(
    "eposta",
    { body: { kind: "dogrulama" }, headers: { Authorization: `Bearer ${jeton}` } },
  );

  if (gonderimHatasi) {
    console.error("Doğrulama maili gönderilemedi:", gonderimHatasi);
    return {
      hata:
        "Adresin kaydedildi ama doğrulama maili gönderilemedi. " +
        "Biraz sonra adresi tekrar yazıp dene.",
    };
  }

  // Kuru mod: RESEND_API_KEY tanımlı değil, mail GERÇEKTEN gönderilmedi.
  // Kullanıcıya "gönderildi" demek yanlış olur.
  if ((sonuc as { durum?: string } | null)?.durum === "kuru") {
    return {
      bilgi:
        `${adres} kaydedildi, ama mail gönderimi henüz açık olmadığı için ` +
        "doğrulama bağlantısı gitmedi. Ligi yöneten kişiye söyle.",
    };
  }

  return {
    bilgi: `${adres} adresine bir doğrulama bağlantısı gönderildi. Bağlantıya tıklayana kadar bu adrese bildirim gitmez.`,
  };
}

/** Adresi tamamen kaldırır; bekleyen doğrulama linklerini de geçersiz kılar. */
export async function epostayiSil(): Promise<void> {
  const lig = await ligBilgisi();
  if (!lig) return;

  const supabase = await createClient();
  await supabase.rpc("epostami_sil");
  revalidatePath("/lig/profil");
}

/**
 * Bildirim tercihini açar/kapatır.
 *
 * Doğrudan tabloya yazıyoruz, fonksiyona gerek yok: `opt_in` kullanıcının
 * kendi satırında değiştirebileceği tek sütun (GRANT ile kısıtlı) ve RLS
 * başkasının satırına yazmasını engelliyor.
 */
export async function bildirimTercihiDegistir(
  _oncekiDurum: BildirimDurumu,
  formData: FormData,
): Promise<BildirimDurumu> {
  const lig = await ligBilgisi();
  if (!lig) return { hata: "Lige üye değilsin." };

  const acik = metin(formData, "acik") === "1";

  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_settings")
    .update({ opt_in: acik })
    .eq("user_id", lig.kullaniciId);

  if (error) return { hata: hataMesaji(error) };

  revalidatePath("/lig/profil");
  return { bilgi: acik ? "Bildirimler açıldı." : "Bildirimler kapatıldı." };
}

/**
 * Maildeki "bildirimleri kapat" bağlantısının çalıştırdığı eylem.
 *
 * Diğerlerinden iki farkı var:
 *
 * 1. GİRİŞ GEREKTİRMEZ. Mailin altındaki bağlantıya tıklayan kişinin o an
 *    siteye giriş yapmış olmasını bekleyemeyiz. Beklersek iptal etmek
 *    zorlaşır, insanlar da maili spam'e işaretler — bu gönderen itibarımıza
 *    zarar verir ve herkesin maili kutuya düşmemeye başlar.
 *
 * 2. Sayfa açılınca DEĞİL, butona basılınca çalışır. Mail istemcileri ve
 *    kurumsal güvenlik taracıları mesajdaki bağlantıları kullanıcı adına
 *    önceden açar. GET isteğiyle kapatsaydık, kullanıcı hiç tıklamadan
 *    bildirimleri kapanırdı.
 */
export async function tokenIleBildirimKapat(
  _oncekiDurum: BildirimDurumu,
  formData: FormData,
): Promise<BildirimDurumu> {
  const token = metin(formData, "token");
  if (!token) return { hata: "Bağlantı eksik." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bildirimden_cik", {
    p_token: token,
  });

  // Geçersiz uuid biçimi buraya hata olarak döner; kullanıcıya ayrı bir
  // mesaj göstermiyoruz — "bu token var mı yok mu" sorusunu cevaplamayalım.
  if (error || data !== true) {
    return {
      hata:
        "Bu bağlantı çalışmıyor. Bildirimleri profil sayfandan da kapatabilirsin.",
    };
  }

  return { bilgi: "Bildirimler kapatıldı. Artık sana mail gönderilmeyecek." };
}
