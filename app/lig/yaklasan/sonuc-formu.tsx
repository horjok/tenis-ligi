"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { sonucGir, type SonucDurumu } from "@/app/actions/sonuc";

const BOS: SonucDurumu = {};

const skorGirdisi =
  "w-12 border border-cizgi bg-transparent px-1 py-1.5 text-center veri text-[16px] " +
  "focus:border-kort focus:outline-none";

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
        className="border border-kort bg-kort px-4 py-2 font-govde text-[13px] font-bold uppercase tracking-wider text-tebesir transition-colors hover:bg-kazanan hover:text-kort"
      >
        Sonuç gir
      </button>
    );
  }

  return (
    <form action={gonder} className="mt-3 flex w-full flex-col gap-4">
      <input type="hidden" name="macId" value={macId} />

      <fieldset className="flex flex-wrap items-center gap-5">
        <legend className="mb-1 font-veri text-[11px] uppercase tracking-wide text-murekkep-silik">
          Kazanan
        </legend>
        <label className="flex items-center gap-2 font-baslik text-[18px] uppercase">
          <input type="radio" name="kazanan" value={benimId} required />
          Ben
        </label>
        <label className="flex items-center gap-2 font-baslik text-[18px] uppercase">
          <input type="radio" name="kazanan" value={rakipId} />
          {rakipAd}
        </label>
      </fieldset>

      <div>
        <p className="mb-2 font-veri text-[11px] uppercase tracking-wide text-murekkep-silik">
          Set skorları (opsiyonel) — ben / {rakipAd}
        </p>
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3].map((n) => (
            <span key={n} className="flex items-center gap-1.5">
              <input
                type="number"
                name={`set${n}_ben`}
                min={0}
                max={99}
                className={skorGirdisi}
                aria-label={`${n}. set benim oyun sayım`}
              />
              <span className="text-murekkep-silik">–</span>
              <input
                type="number"
                name={`set${n}_rakip`}
                min={0}
                max={99}
                className={skorGirdisi}
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
        className="max-w-xs border border-cizgi bg-transparent px-3 py-2 text-sm placeholder:text-murekkep-silik focus:border-kort focus:outline-none"
      />

      {durum.hata && (
        <p className="border-l-4 border-toprak bg-yuzey-yukseltilmis px-3 py-2.5 text-sm">
          {durum.hata}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={bekliyor}
          className="border border-kort bg-kort px-4 py-2 font-govde text-[13px] font-bold uppercase tracking-wider text-tebesir transition-colors hover:bg-kazanan hover:text-kort disabled:opacity-50"
        >
          {bekliyor ? "Kaydediliyor…" : "Kaydet"}
        </button>
        <button
          type="button"
          onClick={() => setAcik(false)}
          className="border border-cizgi px-4 py-2 font-govde text-[13px] font-bold uppercase tracking-wider text-murekkep-sonuk transition-colors hover:text-murekkep"
        >
          Vazgeç
        </button>
      </div>
    </form>
  );
}
