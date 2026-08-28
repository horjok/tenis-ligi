"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { dilimAc, dilimKapat } from "@/app/actions/musaitlik";
import { gunEtiketi, SAATLER, slotAnahtari } from "@/lib/takvim";

export function TakvimIzgara({
  gunler,
  benimSlotlar,
  digerSayilari,
  simdiIso,
}: {
  gunler: string[];
  benimSlotlar: string[];
  /** anahtar -> o dilimde müsait olan DİĞER oyuncu sayısı */
  digerSayilari: Record<string, number>;
  simdiIso: string;
}) {
  const router = useRouter();
  const [bekleyenGecis, gecisBaslat] = useTransition();
  const [hata, setHata] = useState<string | null>(null);

  // İyimser güncelleme: tıklayınca hücre hemen değişsin, sunucu cevabı
  // beklenmesin. Sunucu reddederse router.refresh() gerçeği geri getirir.
  const [iyimser, setIyimser] = useState<Record<string, boolean>>({});
  const [islemdeki, setIslemdeki] = useState<Set<string>>(new Set());

  const temelSlotlar = new Set(benimSlotlar);
  const simdi = Date.parse(simdiIso);

  function isaretliMi(anahtar: string): boolean {
    return iyimser[anahtar] ?? temelSlotlar.has(anahtar);
  }

  async function degistir(anahtar: string) {
    const yeniDurum = !isaretliMi(anahtar);
    setIyimser((o) => ({ ...o, [anahtar]: yeniDurum }));
    setIslemdeki((s) => new Set(s).add(anahtar));
    setHata(null);

    const sonuc = yeniDurum ? await dilimAc(anahtar) : await dilimKapat(anahtar);

    setIslemdeki((s) => {
      const y = new Set(s);
      y.delete(anahtar);
      return y;
    });

    if (sonuc.hata) {
      setHata(sonuc.hata);
      setIyimser((o) => ({ ...o, [anahtar]: !yeniDurum })); // geri al
      return;
    }

    // Sunucudan taze veri çek: başkalarının sayıları da değişmiş olabilir.
    gecisBaslat(() => {
      router.refresh();
      setIyimser({});
    });
  }

  return (
    <div>
      {hata && (
        <p className="mb-4 border-l-4 border-toprak bg-yuzey-yukseltilmis px-3 py-2.5 text-sm text-murekkep">
          {hata}
        </p>
      )}

      <div className="overflow-x-auto border border-cizgi bg-yuzey-panel">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-yuzey-yukseltilmis">
              <th className="sticky left-0 z-10 bg-yuzey-yukseltilmis" />
              {gunler.map((gun) => {
                const { gunAdi, tarih } = gunEtiketi(gun);
                return (
                  <th
                    key={gun}
                    className="border-l border-cizgi px-1 py-2 text-center"
                  >
                    <div className="font-baslik text-[14px] uppercase tracking-wide">
                      {gunAdi}
                    </div>
                    <div className="font-veri text-[10px] font-normal text-murekkep-silik">
                      {tarih}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {SAATLER.map((saat) => (
              <tr key={saat} className="border-t border-cizgi">
                <th className="sticky left-0 z-10 bg-yuzey-yukseltilmis px-2 text-right font-veri text-[12px] font-medium text-murekkep-silik">
                  {String(saat).padStart(2, "0")}
                </th>

                {gunler.map((gun) => {
                  const anahtar = slotAnahtari(gun, saat);
                  const gecmis = Date.parse(anahtar) <= simdi;
                  const benim = isaretliMi(anahtar);
                  const digerleri = digerSayilari[anahtar] ?? 0;
                  const mesgul = islemdeki.has(anahtar);

                  return (
                    <td key={gun} className="border-l border-cizgi p-0">
                      <button
                        type="button"
                        disabled={gecmis || mesgul}
                        onClick={() => degistir(anahtar)}
                        aria-pressed={benim}
                        aria-label={`${gun} ${saat}:00${benim ? " — müsaitsin" : ""}`}
                        title={
                          digerleri > 0
                            ? `${digerleri} kişi daha müsait`
                            : undefined
                        }
                        className={[
                          "flex h-9 w-full min-w-[42px] items-center justify-center",
                          "veri text-[12px] transition-colors",
                          gecmis
                            ? "cursor-not-allowed text-murekkep-silik/40"
                            : benim
                              ? "bg-kazanan text-kort"
                              : digerleri > 0
                                ? "bg-yuzey-yukseltilmis text-murekkep-sonuk hover:bg-kort hover:text-tebesir"
                                : "text-murekkep-silik hover:bg-yuzey-yukseltilmis",
                          mesgul ? "opacity-50" : "",
                        ].join(" ")}
                      >
                        {!gecmis && digerleri > 0 ? digerleri : ""}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-veri text-[11px] uppercase tracking-wide text-murekkep-silik">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 bg-kazanan" />
          Müsaitsin
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 border border-cizgi bg-yuzey-yukseltilmis" />
          Başkası müsait
        </span>
        <span className="normal-case tracking-normal">
          Kutudaki sayı: o saatte müsait olan diğer oyuncu sayısı
        </span>
        {bekleyenGecis && <span>güncelleniyor…</span>}
      </div>
    </div>
  );
}
