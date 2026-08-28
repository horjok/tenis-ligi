"use client";

import { useActionState, useState } from "react";

import { macKaydet, type MacFormDurumu } from "@/app/actions/mac";

const BOS: MacFormDurumu = {};

const etiketSinifi =
  "font-baslik text-[16px] uppercase tracking-wide text-murekkep-sonuk";

const girdiSinifi =
  "w-full border border-cizgi bg-transparent px-3 py-2.5 text-[15px] " +
  "focus:border-kort focus:outline-none";

const skorGirdisi =
  "w-14 border border-cizgi bg-transparent px-1 py-2 text-center veri text-[16px] " +
  "focus:border-kort focus:outline-none";

export type Oyuncu = { user_id: string; display_name: string };

export function MacFormu({
  oyuncular,
  bugun,
}: {
  oyuncular: Oyuncu[];
  bugun: string;
}) {
  const [durum, gonder, bekliyor] = useActionState<MacFormDurumu, FormData>(
    macKaydet,
    BOS,
  );

  // Set başlıklarında rakibin adını göstermek için seçimi izliyoruz.
  const [rakipId, setRakipId] = useState("");
  const rakipAdi =
    oyuncular.find((o) => o.user_id === rakipId)?.display_name ?? "Rakip";

  if (oyuncular.length === 0) {
    return (
      <p className="border border-dashed border-cizgi px-4 py-12 text-center text-sm text-murekkep-silik">
        Ligde başka oyuncu yok. Maç kaydedebilmek için en az bir kişinin daha
        katılması gerekiyor.
      </p>
    );
  }

  return (
    <form
      action={gonder}
      className="flex max-w-lg flex-col gap-5 border border-cizgi bg-yuzey-panel p-5"
    >
      <label className="flex flex-col gap-1.5">
        <span className={etiketSinifi}>Rakip</span>
        <select
          name="rakip"
          required
          value={rakipId}
          onChange={(e) => setRakipId(e.target.value)}
          className={girdiSinifi}
        >
          <option value="">Seç…</option>
          {oyuncular.map((o) => (
            <option key={o.user_id} value={o.user_id}>
              {o.display_name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${etiketSinifi} mb-1`}>Kazanan</legend>
        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 font-baslik text-[18px] uppercase">
            <input type="radio" name="kazanan" value="ben" required />
            Ben
          </label>
          <label className="flex items-center gap-2 font-baslik text-[18px] uppercase">
            <input type="radio" name="kazanan" value="rakip" />
            {rakipAdi}
          </label>
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className={etiketSinifi}>Tarih</span>
        <input
          type="date"
          name="tarih"
          required
          defaultValue={bugun}
          max={bugun}
          className={`${girdiSinifi} veri`}
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className={etiketSinifi}>
          Set skorları{" "}
          <span className="font-govde text-[13px] normal-case text-murekkep-silik">
            (opsiyonel)
          </span>
        </span>
        <div className="flex items-center gap-4 font-veri text-[11px] uppercase tracking-wide text-murekkep-silik">
          <span className="w-6" />
          <span className="w-14 text-center">Ben</span>
          <span className="w-3" />
          <span className="w-14 text-center">{rakipAdi}</span>
        </div>
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-4">
            <span className="w-6 font-veri text-[13px] text-murekkep-silik">
              {n}.
            </span>
            <input
              type="number"
              name={`set${n}_ben`}
              min={0}
              max={99}
              className={skorGirdisi}
              aria-label={`${n}. set benim oyun sayım`}
            />
            <span className="w-3 text-center text-murekkep-silik">–</span>
            <input
              type="number"
              name={`set${n}_rakip`}
              min={0}
              max={99}
              className={skorGirdisi}
              aria-label={`${n}. set rakibin oyun sayısı`}
            />
          </div>
        ))}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={etiketSinifi}>Yer</span>
        <input
          type="text"
          name="yer"
          maxLength={120}
          placeholder="Opsiyonel — örn. Belediye kortları"
          className={girdiSinifi}
        />
      </label>

      {durum.hata && (
        <p className="border-l-4 border-toprak bg-yuzey-yukseltilmis px-3 py-2.5 text-sm">
          {durum.hata}
        </p>
      )}

      <button
        type="submit"
        disabled={bekliyor}
        className="mt-1 self-start border border-kort bg-kort px-6 py-3 font-govde text-[14px] font-bold uppercase tracking-wider text-tebesir transition-colors hover:bg-kazanan hover:text-kort disabled:opacity-50"
      >
        {bekliyor ? "Kaydediliyor…" : "Maçı kaydet"}
      </button>

      <p className="text-xs leading-5 text-murekkep-silik">
        Kazananı sen giriyorsun, rakibin onayı gerekmiyor. Yanlış girersen ligi
        yöneten kişi düzeltebilir.
      </p>
    </form>
  );
}
