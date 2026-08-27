"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { sonucGir, type SonucDurumu } from "@/app/actions/sonuc";

const BOS: SonucDurumu = {};

const girdiSinifi =
  "rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none " +
  "focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100";

export function SonucFormu({
  macId,
  benimId,
  rakipId,
  rakipAd,
}: {
  macId: string;
  benimId: string;
  rakipId: string;
  rakipAd: string;
}) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [durum, gonder, bekliyor] = useActionState<SonucDurumu, FormData>(
    sonucGir,
    BOS,
  );

  // Sunucu hatasız döndüyse maç işlenmiştir; listeyi tazele.
  useEffect(() => {
    if (!bekliyor && acik && durum && !durum.hata) {
      const zamanlayici = setTimeout(() => router.refresh(), 0);
      return () => clearTimeout(zamanlayici);
    }
  }, [durum, bekliyor, acik, router]);

  if (!acik) {
    return (
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Sonuç gir
      </button>
    );
  }

  return (
    <form action={gonder} className="mt-3 flex w-full flex-col gap-3">
      <input type="hidden" name="macId" value={macId} />

      <fieldset className="flex flex-wrap items-center gap-4 text-sm">
        <legend className="mb-1 text-xs text-zinc-500">Kazanan</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="kazanan" value={benimId} required />
          Ben
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="kazanan" value={rakipId} />
          {rakipAd}
        </label>
      </fieldset>

      <div>
        <p className="mb-1 text-xs text-zinc-500">
          Set skorları (opsiyonel) — ben / {rakipAd}
        </p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((n) => (
            <span key={n} className="flex items-center gap-1">
              <input
                type="number"
                name={`set${n}_ben`}
                min={0}
                max={99}
                className={`${girdiSinifi} w-14`}
                aria-label={`${n}. set benim oyun sayım`}
              />
              <span className="text-zinc-400">-</span>
              <input
                type="number"
                name={`set${n}_rakip`}
                min={0}
                max={99}
                className={`${girdiSinifi} w-14`}
                aria-label={`${n}. set ${rakipAd} oyun sayısı`}
              />
            </span>
          ))}
        </div>
      </div>

      <input
        type="text"
        name="yer"
        maxLength={120}
        placeholder="Yer (opsiyonel)"
        className={`${girdiSinifi} max-w-xs`}
      />

      {durum.hata && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {durum.hata}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={bekliyor}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {bekliyor ? "Kaydediliyor..." : "Kaydet"}
        </button>
        <button
          type="button"
          onClick={() => setAcik(false)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs dark:border-zinc-700"
        >
          Vazgeç
        </button>
      </div>
    </form>
  );
}
