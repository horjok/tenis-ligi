"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { oneriyiKabulEt, oneriyiReddet } from "@/app/actions/oneri";
import type { Oneri } from "@/lib/oneri";

export function OneriKarti({
  baslik,
  oneriler,
}: {
  baslik: string;
  oneriler: Oneri[];
}) {
  const router = useRouter();
  const [islemdeki, setIslemdeki] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  async function calistir(macId: string, kabul: boolean) {
    setIslemdeki(macId);
    setHata(null);

    const sonuc = kabul
      ? await oneriyiKabulEt(macId)
      : await oneriyiReddet(macId);

    setIslemdeki(null);

    if (sonuc.hata) {
      setHata(sonuc.hata);
      return;
    }
    router.refresh();
  }

  return (
    <li className="border border-cizgi bg-yuzey-panel">
      {/* Dilim başlığı — bir saat, tek kart */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-cizgi bg-yuzey-yukseltilmis px-4 py-2.5">
        <h3 className="text-[20px] capitalize">{baslik}</h3>
        <span className="font-veri text-[11px] uppercase tracking-wide text-murekkep-silik">
          {oneriler.length} kişi müsait
        </span>
      </div>

      {hata && (
        <p className="border-b border-cizgi border-l-4 border-l-toprak px-4 py-2.5 text-sm">
          {hata}
        </p>
      )}

      <ul className="flex flex-col">
        {oneriler.map((oneri, i) => {
          const mesgul = islemdeki === oneri.macId;
          const sonSatir = i === oneriler.length - 1;

          return (
            <li
              key={oneri.macId}
              className={[
                "flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3",
                sonSatir ? "" : "border-b border-cizgi",
              ].join(" ")}
            >
              <div className="min-w-0">
                <p className="truncate font-baslik text-[22px] uppercase">
                  {oneri.rakipAd}
                </p>
                {oneri.benKabulEttim ? (
                  <p className="mt-0.5 font-veri text-[11px] uppercase tracking-wide text-murekkep-silik">
                    Kabul ettin · {oneri.rakipAd} bekleniyor
                  </p>
                ) : oneri.rakipKabulEtti ? (
                  <p className="mt-0.5 font-veri text-[11px] uppercase tracking-wide text-murekkep">
                    Kabul etti · seni bekliyor
                  </p>
                ) : null}
              </div>

              {oneri.benKabulEttim ? (
                <span className="border border-cizgi px-3 py-1.5 font-veri text-[11px] uppercase tracking-wide text-murekkep-silik">
                  Bekleniyor
                </span>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={mesgul}
                    onClick={() => calistir(oneri.macId, true)}
                    className="border border-kort bg-kort px-4 py-2 font-govde text-[13px] font-bold uppercase tracking-wider text-tebesir transition-colors hover:bg-kazanan hover:text-kort disabled:opacity-50"
                  >
                    {mesgul ? "…" : "Kabul et"}
                  </button>
                  <button
                    type="button"
                    disabled={mesgul}
                    onClick={() => calistir(oneri.macId, false)}
                    className="border border-cizgi px-4 py-2 font-govde text-[13px] font-bold uppercase tracking-wider text-murekkep-sonuk transition-colors hover:border-toprak hover:text-toprak disabled:opacity-50"
                  >
                    Reddet
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </li>
  );
}
