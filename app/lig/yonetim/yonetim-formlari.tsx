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
    <form action={gonder} className="flex flex-col gap-4">
      <label className="flex flex-wrap items-center gap-3">
        <span className="font-baslik text-[16px] uppercase tracking-wide text-murekkep-sonuk">
          Kaç kişi kullanabilsin?
        </span>
        <input
          type="number"
          name="maxUses"
          defaultValue={1}
          min={1}
          max={50}
          className="w-20 border border-cizgi bg-transparent px-2 py-2 text-center veri text-[16px] focus:border-kort focus:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={bekliyor}
        className="self-start border border-kort bg-kort px-6 py-3 font-govde text-[14px] font-bold uppercase tracking-wider text-tebesir transition-colors hover:bg-kazanan hover:text-kort disabled:opacity-50"
      >
        {bekliyor ? "…" : "Kod üret"}
      </button>

      {durum.bilgi && (
        <p className="border-l-4 border-kazanan bg-yuzey-yukseltilmis px-3 py-2.5 font-veri text-[16px] tracking-wider">
          {durum.bilgi}
        </p>
      )}
      {durum.hata && (
        <p className="border-l-4 border-toprak bg-yuzey-yukseltilmis px-3 py-2.5 text-sm">
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
        className="font-veri text-[11px] uppercase tracking-wide text-murekkep-silik underline underline-offset-2 transition-colors hover:text-toprak disabled:opacity-50"
      >
        {bekliyor ? "…" : "İptal et"}
      </button>
      {durum.hata && (
        <span className="ml-2 font-veri text-[11px] text-toprak">
          {durum.hata}
        </span>
      )}
    </form>
  );
}
