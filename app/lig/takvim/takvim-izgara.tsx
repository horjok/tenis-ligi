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
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {hata}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[var(--background)]" />
              {gunler.map((gun) => {
                const { gunAdi, tarih } = gunEtiketi(gun);
                return (
                  <th key={gun} className="px-1 pb-1 text-center">
                    <div className="text-xs font-medium">{gunAdi}</div>
                    <div className="text-[10px] font-normal text-zinc-500">
                      {tarih}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {SAATLER.map((saat) => (
              <tr key={saat}>
                <th className="sticky left-0 z-10 bg-[var(--background)] pr-2 text-right text-xs font-normal text-zinc-500">
                  {String(saat).padStart(2, "0")}:00
                </th>

                {gunler.map((gun) => {
                  const anahtar = slotAnahtari(gun, saat);
                  const gecmis = Date.parse(anahtar) <= simdi;
                  const benim = isaretliMi(anahtar);
                  const digerleri = digerSayilari[anahtar] ?? 0;
                  const mesgul = islemdeki.has(anahtar);

                  return (
                    <td key={gun} className="p-0">
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
                          "h-8 w-11 rounded text-[11px] tabular-nums transition-colors",
                          gecmis
                            ? "cursor-not-allowed bg-zinc-50 text-zinc-300 dark:bg-zinc-900/50 dark:text-zinc-700"
                            : benim
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700",
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

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-emerald-600" />
          Müsaitsin
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-zinc-100 dark:bg-zinc-800" />
          Boş
        </span>
        <span>Kutudaki sayı: o saatte müsait olan diğer oyuncu sayısı</span>
        {bekleyenGecis && <span>güncelleniyor...</span>}
      </div>
    </div>
  );
}
