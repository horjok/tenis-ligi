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
    <li className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <h2 className="text-sm font-semibold capitalize">{baslik}</h2>
      <p className="mt-0.5 text-xs text-zinc-500">
        {oneriler.length === 1
          ? "1 kişi bu saatte müsait"
          : `${oneriler.length} kişi bu saatte müsait`}
      </p>

      {hata && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {hata}
        </p>
      )}

      <ul className="mt-3 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-900">
        {oneriler.map((oneri) => {
          const mesgul = islemdeki === oneri.macId;

          return (
            <li
              key={oneri.macId}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5"
            >
              <div className="text-sm">
                <span className="font-medium">{oneri.rakipAd}</span>
                {oneri.benKabulEttim ? (
                  <span className="ml-2 text-xs text-emerald-700 dark:text-emerald-400">
                    kabul ettin, {oneri.rakipAd} bekleniyor
                  </span>
                ) : oneri.rakipKabulEtti ? (
                  <span className="ml-2 text-xs text-amber-700 dark:text-amber-400">
                    {oneri.rakipAd} kabul etti, seni bekliyor
                  </span>
                ) : null}
              </div>

              {!oneri.benKabulEttim && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={mesgul}
                    onClick={() => calistir(oneri.macId, true)}
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    {mesgul ? "..." : "Kabul et"}
                  </button>
                  <button
                    type="button"
                    disabled={mesgul}
                    onClick={() => calistir(oneri.macId, false)}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs disabled:opacity-50 dark:border-zinc-700"
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
