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

type Tur = "singles" | "doubles";

/**
 * Oyuncu seçici.
 *
 * `disabledIds`: başka bir alanda zaten seçilmiş oyuncular listeden düşer.
 * Aynı kişiyi iki yere koymayı veritabanı da reddediyor (match_participants'ın
 * birincil anahtarı buna izin vermiyor); buradaki filtre kullanıcıyı hataya
 * hiç götürmemek için.
 */
function OyuncuSecici({
  ad,
  etiket,
  oyuncular,
  deger,
  degisti,
  disabledIds,
}: {
  ad: string;
  etiket: string;
  oyuncular: Oyuncu[];
  deger: string;
  degisti: (v: string) => void;
  disabledIds: string[];
}) {
  const secilebilir = oyuncular.filter(
    (o) => o.user_id === deger || !disabledIds.includes(o.user_id),
  );

  return (
    <label className="flex flex-col gap-1.5">
      <span className={etiketSinifi}>{etiket}</span>
      <select
        name={ad}
        required
        value={deger}
        onChange={(e) => degisti(e.target.value)}
        className={girdiSinifi}
      >
        <option value="">Seç…</option>
        {secilebilir.map((o) => (
          <option key={o.user_id} value={o.user_id}>
            {o.display_name}
          </option>
        ))}
      </select>
    </label>
  );
}

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

  const [tur, setTur] = useState<Tur>("singles");

  // Set başlıklarında adları göstermek için seçimleri izliyoruz.
  const [rakipId, setRakipId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [rakip1Id, setRakip1Id] = useState("");
  const [rakip2Id, setRakip2Id] = useState("");

  const ciftler = tur === "doubles";
  const adiniBul = (id: string) =>
    oyuncular.find((o) => o.user_id === id)?.display_name ?? "";

  const rakipAdi = ciftler
    ? [adiniBul(rakip1Id), adiniBul(rakip2Id)].filter(Boolean).join(" & ") ||
      "Rakipler"
    : adiniBul(rakipId) || "Rakip";

  const benimTarafim = ciftler
    ? ["Ben", adiniBul(partnerId)].filter(Boolean).join(" & ")
    : "Ben";

  if (oyuncular.length === 0) {
    return (
      <p className="border border-dashed border-cizgi px-4 py-12 text-center text-sm text-murekkep-silik">
        Ligde başka oyuncu yok. Maç kaydedebilmek için en az bir kişinin daha
        katılması gerekiyor.
      </p>
    );
  }

  const yeterliOyuncu = !ciftler || oyuncular.length >= 3;

  return (
    <form
      action={gonder}
      className="flex max-w-lg flex-col gap-5 border border-cizgi bg-yuzey-panel p-5"
    >
      <input type="hidden" name="tur" value={tur} />

      {/* ---------- Maç türü ---------- */}
      <div className="flex flex-wrap items-center gap-px border border-cizgi bg-cizgi">
        {(
          [
            ["singles", "Tekler"],
            ["doubles", "Çiftler"],
          ] as const
        ).map(([deger, etiket]) => (
          <button
            key={deger}
            type="button"
            onClick={() => setTur(deger)}
            aria-pressed={tur === deger}
            className={[
              "flex-1 px-4 py-2.5 font-baslik text-[16px] uppercase tracking-wide transition-colors",
              tur === deger
                ? "bg-kort text-tebesir"
                : "bg-yuzey-panel text-murekkep-sonuk hover:bg-yuzey-yukseltilmis",
            ].join(" ")}
          >
            {etiket}
          </button>
        ))}
      </div>

      {!yeterliOyuncu && (
        <p className="border-l-4 border-toprak bg-yuzey-yukseltilmis px-3 py-2.5 text-sm leading-6">
          Çiftler için senden başka en az üç oyuncu gerekiyor; ligde{" "}
          {oyuncular.length} kişi var.
        </p>
      )}

      {/* ---------- Oyuncular ---------- */}
      {ciftler ? (
        <>
          <OyuncuSecici
            ad="partner"
            etiket="Partnerin"
            oyuncular={oyuncular}
            deger={partnerId}
            degisti={setPartnerId}
            disabledIds={[rakip1Id, rakip2Id]}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <OyuncuSecici
              ad="rakip1"
              etiket="1. rakip"
              oyuncular={oyuncular}
              deger={rakip1Id}
              degisti={setRakip1Id}
              disabledIds={[partnerId, rakip2Id]}
            />
            <OyuncuSecici
              ad="rakip2"
              etiket="2. rakip"
              oyuncular={oyuncular}
              deger={rakip2Id}
              degisti={setRakip2Id}
              disabledIds={[partnerId, rakip1Id]}
            />
          </div>
        </>
      ) : (
        <OyuncuSecici
          ad="rakip"
          etiket="Rakip"
          oyuncular={oyuncular}
          deger={rakipId}
          degisti={setRakipId}
          disabledIds={[]}
        />
      )}

      {/* ---------- Kazanan ---------- */}
      <fieldset className="flex flex-col gap-2">
        <legend className={`${etiketSinifi} mb-1`}>Kazanan</legend>
        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 font-baslik text-[18px] uppercase">
            <input
              type="radio"
              name="kazanan"
              value={ciftler ? "biz" : "ben"}
              required
            />
            {benimTarafim}
          </label>
          <label className="flex items-center gap-2 font-baslik text-[18px] uppercase">
            <input
              type="radio"
              name="kazanan"
              value={ciftler ? "onlar" : "rakip"}
            />
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

      {/* ---------- Set skorları ---------- */}
      <div className="flex flex-col gap-2">
        <span className={etiketSinifi}>
          Set skorları{" "}
          <span className="font-govde text-[13px] normal-case text-murekkep-silik">
            (opsiyonel)
          </span>
        </span>
        <div className="flex items-center gap-4 font-veri text-[11px] uppercase tracking-wide text-murekkep-silik">
          <span className="w-6" />
          <span className="w-14 truncate text-center">
            {ciftler ? "Biz" : "Ben"}
          </span>
          <span className="w-3" />
          <span className="w-14 truncate text-center">
            {ciftler ? "Onlar" : rakipAdi}
          </span>
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
              aria-label={`${n}. set bizim oyun sayımız`}
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
        disabled={bekliyor || !yeterliOyuncu}
        className="mt-1 self-start border border-kort bg-kort px-6 py-3 font-govde text-[14px] font-bold uppercase tracking-wider text-tebesir transition-colors hover:bg-kazanan hover:text-kort disabled:opacity-50"
      >
        {bekliyor ? "Kaydediliyor…" : "Maçı kaydet"}
      </button>

      <p className="text-xs leading-5 text-murekkep-silik">
        Kazananı sen giriyorsun, rakibin onayı gerekmiyor. Yanlış girersen ligi
        yöneten kişi düzeltebilir.
        {ciftler &&
          " Çiftler puanların teklerden tamamen ayrı tutulur; bu maç tekler sıralamanı etkilemez."}
      </p>
    </form>
  );
}
