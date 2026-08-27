"use client";

import { useActionState, useState } from "react";

import { macKaydet, type MacFormDurumu } from "@/app/actions/mac";

const BOS: MacFormDurumu = {};

const girdiSinifi =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none " +
  "focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100";

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
      <p className="text-sm text-zinc-500">
        Ligde başka oyuncu yok. Maç kaydedebilmek için en az bir kişinin daha
        katılması gerekiyor.
      </p>
    );
  }

  return (
    <form action={gonder} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Rakip
        <select
          name="rakip"
          required
          value={rakipId}
          onChange={(e) => setRakipId(e.target.value)}
          className={girdiSinifi}
        >
          <option value="">Seç...</option>
          {oyuncular.map((o) => (
            <option key={o.user_id} value={o.user_id}>
              {o.display_name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1">Kazanan</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="kazanan" value="ben" required />
          Ben
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="kazanan" value="rakip" />
          {rakipAdi}
        </label>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        Tarih
        <input
          type="date"
          name="tarih"
          required
          defaultValue={bugun}
          max={bugun}
          className={girdiSinifi}
        />
      </label>

      <div className="flex flex-col gap-2 text-sm">
        <span>
          Set skorları{" "}
          <span className="text-zinc-500">(opsiyonel)</span>
        </span>
        <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2">
          <span className="text-xs text-zinc-500">Set</span>
          <span className="text-xs text-zinc-500">Ben</span>
          <span />
          <span className="text-xs text-zinc-500">{rakipAdi}</span>

          {[1, 2, 3].map((n) => (
            <FragmentSet key={n} n={n} girdiSinifi={girdiSinifi} />
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Yer <span className="sr-only">(opsiyonel)</span>
        <input
          type="text"
          name="yer"
          maxLength={120}
          placeholder="Opsiyonel — örn. Belediye kortları"
          className={girdiSinifi}
        />
      </label>

      {durum.hata && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {durum.hata}
        </p>
      )}

      <button
        type="submit"
        disabled={bekliyor}
        className="mt-2 self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {bekliyor ? "Kaydediliyor..." : "Maçı kaydet"}
      </button>

      <p className="text-xs leading-5 text-zinc-500">
        Kazananı sen giriyorsun, rakibin onayı gerekmiyor. Yanlış girersen
        ligi yöneten kişi düzeltebilir.
      </p>
    </form>
  );
}

function FragmentSet({
  n,
  girdiSinifi,
}: {
  n: number;
  girdiSinifi: string;
}) {
  return (
    <>
      <span className="text-sm text-zinc-500">{n}.</span>
      <input
        type="number"
        name={`set${n}_ben`}
        min={0}
        max={99}
        className={girdiSinifi}
        aria-label={`${n}. set benim oyun sayım`}
      />
      <span className="text-center text-zinc-400">-</span>
      <input
        type="number"
        name={`set${n}_rakip`}
        min={0}
        max={99}
        className={girdiSinifi}
        aria-label={`${n}. set rakibin oyun sayısı`}
      />
    </>
  );
}
