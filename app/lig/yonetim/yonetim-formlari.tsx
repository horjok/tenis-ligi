"use client";

import { useActionState } from "react";

import {
  davetKoduUret,
  koduIptalEt,
  type YonetimDurumu,
} from "@/app/actions/yonetim";

const BOS: YonetimDurumu = {};

export function KodUretFormu() {
  const [durum, gonder, bekliyor] = useActionState<YonetimDurumu, FormData>(
    davetKoduUret,
    BOS,
  );

  return (
    <form action={gonder} className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm">
        Kaç kişi kullanabilsin?
        <input
          type="number"
          name="maxUses"
          defaultValue={1}
          min={1}
          max={50}
          className="w-20 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <button
        type="submit"
        disabled={bekliyor}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {bekliyor ? "..." : "Kod üret"}
      </button>

      {durum.bilgi && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 font-mono text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          {durum.bilgi}
        </p>
      )}
      {durum.hata && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {durum.hata}
        </p>
      )}
    </form>
  );
}

export function KodIptalButonu({ kodId }: { kodId: string }) {
  const [durum, gonder, bekliyor] = useActionState<YonetimDurumu, FormData>(
    koduIptalEt,
    BOS,
  );

  return (
    <form action={gonder} className="inline">
      <input type="hidden" name="kodId" value={kodId} />
      <button
        type="submit"
        disabled={bekliyor}
        className="text-xs text-red-600 underline underline-offset-2 disabled:opacity-50 dark:text-red-400"
      >
        {bekliyor ? "..." : "iptal et"}
      </button>
      {durum.hata && (
        <span className="ml-2 text-xs text-red-600">{durum.hata}</span>
      )}
    </form>
  );
}
