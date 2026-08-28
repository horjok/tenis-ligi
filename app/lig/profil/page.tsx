import { eloGoster, ligBilgisi } from "@/lib/lig";
import { createClient } from "@/lib/supabase/server";

import {
  EpostaFormu,
  EpostaSilButonu,
  TercihAnahtari,
} from "./profil-formlari";

export default async function Profil() {
  const lig = await ligBilgisi();
  if (!lig) return null;

  const supabase = await createClient();

  const [{ data: durumSatirlari }, { data: oyuncu }] = await Promise.all([
    // Bekleyen doğrulamayı da getirir ama TOKEN'ı getirmez — token'ı
    // görebilen kişi maildeki linke tıklamadan kendini doğrulayabilirdi.
    supabase.rpc("bildirim_durumum"),
    supabase
      .from("puan_tablosu")
      .select("rating, matches_played")
      .eq("league_id", lig.ligId)
      .eq("user_id", lig.kullaniciId)
      .maybeSingle(),
  ]);

  const durum = durumSatirlari?.[0] ?? null;
  const dogrulanmisAdres = durum?.email ?? null;
  const bekleyenAdres = durum?.bekleyen_email ?? null;
  const bildirimAcik = durum?.opt_in ?? true;

  return (
    <div className="flex flex-col gap-10">
      <header className="border-b-4 border-kort pb-2">
        <p className="font-veri text-[11px] uppercase tracking-wider text-murekkep-silik">
          {lig.admin ? "Yönetici" : "Oyuncu"}
        </p>
        <h2 className="mt-1 text-[32px] md:text-[44px]">{lig.gorunenAd}</h2>
      </header>

      {/* ---------- Özet ---------- */}
      <section className="grid grid-cols-2 gap-px border border-cizgi bg-cizgi sm:max-w-md">
        <div className="bg-yuzey-panel px-4 py-3">
          <p className="font-veri text-[11px] uppercase tracking-wide text-murekkep-silik">
            Puan
          </p>
          <p className="veri mt-1 text-[28px]">{eloGoster(oyuncu?.rating ?? null)}</p>
        </div>
        <div className="bg-yuzey-panel px-4 py-3">
          <p className="font-veri text-[11px] uppercase tracking-wide text-murekkep-silik">
            Maç
          </p>
          <p className="veri mt-1 text-[28px]">{oyuncu?.matches_played ?? 0}</p>
        </div>
      </section>

      {/* ---------- E-posta ---------- */}
      <section className="flex flex-col gap-4">
        <h3 className="border-b border-cizgi pb-1.5 text-[22px]">E-posta</h3>
        <p className="max-w-xl text-sm leading-6 text-murekkep-sonuk">
          Zorunlu değil. Eklersen, cevabını bekleyen önerilerin varken günde{" "}
          <strong>bir kez</strong> hatırlatma maili alırsın — öneri başına
          ayrı mail gitmez. Adresin ligdeki kimseye görünmez.
        </p>

        {dogrulanmisAdres ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border border-cizgi bg-yuzey-panel px-4 py-3">
            <div className="min-w-0">
              <p className="font-veri text-[11px] uppercase tracking-wide text-murekkep-silik">
                Doğrulanmış adres
              </p>
              <p className="mt-0.5 truncate font-veri text-[15px]">
                {dogrulanmisAdres}
              </p>
            </div>
            <EpostaSilButonu />
          </div>
        ) : (
          <p className="border border-dashed border-cizgi px-4 py-3 text-sm text-murekkep-silik">
            Kayıtlı adresin yok, sana mail gitmiyor.
          </p>
        )}

        {bekleyenAdres && (
          <p className="border-l-4 border-kazanan bg-yuzey-yukseltilmis px-3 py-2.5 text-sm leading-6">
            <strong className="font-veri">{bekleyenAdres}</strong> adresine bir
            doğrulama bağlantısı gönderildi. Bağlantıya tıklanana kadar bu
            adres kullanılmaz — yanlış yazılmış bir adrese aylarca mail
            gitmesini böyle engelliyoruz.
          </p>
        )}

        <EpostaFormu mevcutAdres={dogrulanmisAdres} />
      </section>

      {/* ---------- Bildirim tercihi ---------- */}
      <section className="flex flex-col gap-4">
        <h3 className="border-b border-cizgi pb-1.5 text-[22px]">Bildirimler</h3>
        <p className="max-w-xl text-sm leading-6 text-murekkep-sonuk">
          Kapatırsan adresin kayıtlı kalır ama mail gönderilmez. Maillerin
          altındaki bağlantı da aynı işi yapar.
        </p>
        <TercihAnahtari acik={bildirimAcik} />
      </section>
    </div>
  );
}
