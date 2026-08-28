import Link from "next/link";

import { KapatFormu } from "./kapat-formu";

/**
 * Maildeki "bildirimleri kapatmak için tıkla" bağlantısının indiği sayfa.
 *
 * Giriş gerektirmez (bkz. proxy.ts'teki HERKESE_ACIK listesi).
 *
 * Bu sayfa açılır açılmaz HİÇBİR ŞEY YAPMAZ — sadece sorar. Sebebi
 * app/actions/bildirim.ts içinde yazılı: mail istemcileri bağlantıları
 * kullanıcı adına önden getirir, sayfa açılışında kapatsaydık insanların
 * bildirimleri hiç tıklamadan kapanabilirdi.
 */
export default async function BildirimKapat(
  props: PageProps<"/bildirim-kapat/[token]">,
) {
  const { token } = await props.params;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-16">
      <div className="border border-cizgi border-l-4 border-l-toprak bg-yuzey-panel px-6 py-7">
        <p className="font-veri text-[11px] uppercase tracking-wider text-murekkep-silik">
          Tenis Ligi
        </p>

        <h1 className="mt-2 text-[30px]">Bildirimleri kapat</h1>

        <p className="mt-4 text-sm leading-6 text-murekkep-sonuk">
          Onaylarsan sana artık öneri hatırlatma maili gönderilmez. Adresin
          kayıtlı kalır; istediğin an profil sayfandan tekrar açabilirsin.
          Lig üyeliğin ve maçların bundan etkilenmez.
        </p>

        <KapatFormu token={token} />

        <Link
          href="/lig/profil"
          className="mt-7 inline-block font-veri text-[11px] uppercase tracking-wide text-murekkep-silik underline underline-offset-2 transition-colors hover:text-murekkep"
        >
          Vazgeç, profilime git
        </Link>
      </div>
    </main>
  );
}
