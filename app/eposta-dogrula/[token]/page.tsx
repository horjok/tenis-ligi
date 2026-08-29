import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

/**
 * Maildeki doğrulama bağlantısının indiği sayfa.
 *
 * Giriş GEREKTİRMEZ (bkz. proxy.ts'teki HERKESE_ACIK listesi): mail başka
 * bir cihazda, oturum açılmamış bir tarayıcıda açılabilir. Güvenliği
 * token sağlıyor — 122 bitlik rastgele uuid, tahmin edilemez.
 *
 * Doğrulama sayfa açılır açılmaz yapılıyor (tıklamayı ayrıca istemiyoruz):
 * kullanıcı zaten "doğrula" niyetiyle tıkladı, bir de buton koymak gereksiz
 * sürtünme olurdu. Bildirim kapatmada tam tersini yaptık — sebebi orada yazılı.
 */

const MESAJLAR: Record<string, { baslik: string; aciklama: string }> = {
  gecersiz: {
    baslik: "Bağlantı tanınmadı",
    aciklama:
      "Bu bağlantı çalışmıyor ya da çok eski. Profil sayfandan adresini tekrar ekleyerek yeni bir bağlantı isteyebilirsin.",
  },
  kullanilmis: {
    baslik: "Bağlantı zaten kullanılmış",
    aciklama:
      "Bu bağlantı daha önce kullanılmış ve o adres artık kayıtlı değil. Profil sayfandan yeni bir doğrulama isteyebilirsin.",
  },
  suresi_gecti: {
    baslik: "Bağlantının süresi geçmiş",
    aciklama:
      "Doğrulama bağlantıları 24 saat geçerli. Profil sayfandan adresini tekrar ekleyerek yeni bir bağlantı alabilirsin.",
  },
};

export default async function EpostaDogrula(
  props: PageProps<"/eposta-dogrula/[token]">,
) {
  const { token } = await props.params;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("eposta_dogrula", {
    p_token: token,
  });

  // Geçersiz uuid biçimi de dahil, her hata "tanınmadı" olarak gösterilir:
  // dışarıya "bu token vardı ama şu sebeple olmadı" bilgisini vermiyoruz.
  const sonuc = (error ? null : (data as { durum?: string; email?: string })) ?? {
    durum: "gecersiz",
  };

  const basarili = sonuc.durum === "tamam";
  const mesaj = MESAJLAR[sonuc.durum ?? "gecersiz"] ?? MESAJLAR.gecersiz;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-16">
      <div
        className={`border-l-4 ${basarili ? "border-kazanan" : "border-toprak"} border-y border-r border-y-cizgi border-r-cizgi bg-yuzey-panel px-6 py-7`}
      >
        <p className="font-veri text-[11px] uppercase tracking-wider text-murekkep-silik">
          Tenis Ligi
        </p>

        <h1 className="mt-2 text-[30px]">
          {basarili ? "Adresin doğrulandı" : mesaj.baslik}
        </h1>

        {basarili ? (
          <>
            <p className="mt-4 font-veri text-[15px]">{sonuc.email}</p>
            <p className="mt-3 text-sm leading-6 text-murekkep-sonuk">
              Bundan sonra cevabını bekleyen önerilerin varken günde bir kez
              hatırlatma maili alacaksın. İstediğin an profil sayfandan ya da
              maillerin altındaki bağlantıdan kapatabilirsin.
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm leading-6 text-murekkep-sonuk">
            {mesaj.aciklama}
          </p>
        )}

        <Link
          href="/lig/profil"
          className="mt-7 inline-block border border-kort bg-kort px-6 py-3 font-govde text-[14px] font-bold uppercase tracking-wider text-tebesir transition-colors hover:bg-kazanan hover:text-kort"
        >
          Profil sayfasına git
        </Link>
      </div>
    </main>
  );
}
