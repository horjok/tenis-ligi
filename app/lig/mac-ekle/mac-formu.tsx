"use client";

import { useActionState, useState } from "react";

import { macKaydet, type MacFormDurumu } from "@/app/actions/mac";

const BOS: MacFormDurumu = {};

const etiketSinifi =
  "font-baslik text-[16px] uppercase tracking-widest text-murekkep-sonuk";

const girdiSinifi =
  "w-full border border-cizgi bg-transparent px-3 py-2.5 text-[15px] " +
  "focus:border-kort focus:outline-none";

export type Oyuncu = { user_id: string; display_name: string };

type Tur = "singles" | "doubles";
type Kazanan = "biz" | "onlar";

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

/** Skor tablosunun bir satırı: isim hücresi + üç set kutusu. */
function SkorSatiri({
  ad,
  alanOneki,
  kazanan,
  sonSatir,
}: {
  ad: string;
  alanOneki: "ben" | "rakip";
  kazanan: boolean;
  sonSatir: boolean;
}) {
  return (
    <div
      className={`flex items-stretch ${sonSatir ? "" : "border-b border-cizgi"}`}
    >
      {/* Kazananın isim hücresi sarı. Skoru girerken "hangi satır kimin"
          sorusu sürekli çıkıyor; kazananı boyamak formu okunur tutuyor. */}
      <div
        className={`flex flex-1 items-center truncate border-r px-3 py-3 font-baslik text-[18px] uppercase ${
          kazanan
            ? "border-r-kort bg-kazanan text-kort"
            : "border-r-cizgi text-murekkep-sonuk"
        }`}
      >
        {ad}
      </div>
      {[1, 2, 3].map((n) => (
        <input
          key={n}
          type="number"
          name={`set${n}_${alanOneki}`}
          min={0}
          max={99}
          placeholder="–"
          aria-label={`${n}. set — ${ad}`}
          className={`w-12 border-cizgi bg-transparent text-center veri text-[16px] placeholder:text-murekkep-silik focus:bg-yuzey-yukseltilmis focus:outline-none ${
            n === 3 ? "" : "border-r"
          }`}
        />
      ))}
    </div>
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
  const [kazanan, setKazanan] = useState<Kazanan>("biz");

  const [rakipId, setRakipId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [rakip1Id, setRakip1Id] = useState("");
  const [rakip2Id, setRakip2Id] = useState("");

  const ciftler = tur === "doubles";
  const adiniBul = (id: string) =>
    oyuncular.find((o) => o.user_id === id)?.display_name ?? "";

  const benimTarafim = ciftler
    ? ["Ben", adiniBul(partnerId)].filter(Boolean).join(" & ")
    : "Ben";

  const karsiTaraf = ciftler
    ? [adiniBul(rakip1Id), adiniBul(rakip2Id)].filter(Boolean).join(" & ") ||
      "Rakipler"
    : adiniBul(rakipId) || "Rakip";

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
      className="flex max-w-lg flex-col gap-6 border border-cizgi bg-yuzey-panel p-5"
    >
      <input type="hidden" name="tur" value={tur} />
      {/* Eyleme giden değer: teklerde ben/rakip, çiftlerde biz/onlar. */}
      <input
        type="hidden"
        name="kazanan"
        value={ciftler ? kazanan : kazanan === "biz" ? "ben" : "rakip"}
      />

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

      {/* ---------- Kazanan: iki büyük panel ---------- */}
      {/* Formun asıl sorusu bu. Radyo düğmesi yerine tıklanabilir iki alan:
          ekranın en büyük öğesi, en önemli karar. */}
      <fieldset className="flex flex-col gap-2">
        <legend className={`${etiketSinifi} mb-2`}>Kazanan</legend>
        <div className="flex h-28 gap-3">
          {(
            [
              ["biz", benimTarafim],
              ["onlar", karsiTaraf],
            ] as const
          ).map(([deger, etiket]) => {
            const secili = kazanan === deger;
            return (
              <button
                key={deger}
                type="button"
                onClick={() => setKazanan(deger)}
                aria-pressed={secili}
                className={[
                  "flex flex-1 items-center justify-center break-words px-3 text-center",
                  "border font-baslik uppercase leading-none transition-colors",
                  ciftler ? "text-[20px]" : "text-[28px]",
                  secili
                    ? "border-kort bg-kazanan text-kort"
                    : "border-cizgi text-murekkep-sonuk hover:border-kort hover:text-murekkep",
                ].join(" ")}
              >
                {etiket}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* ---------- Skor tablosu ---------- */}
      <div className="flex flex-col gap-2">
        <span className={etiketSinifi}>
          Skor{" "}
          <span className="font-govde text-[13px] normal-case tracking-normal text-murekkep-silik">
            (opsiyonel)
          </span>
        </span>

        <div className="flex flex-col border border-cizgi bg-yuzey">
          <SkorSatiri
            ad={ciftler ? "Biz" : "Ben"}
            alanOneki="ben"
            kazanan={kazanan === "biz"}
            sonSatir={false}
          />
          <SkorSatiri
            ad={ciftler ? "Onlar" : karsiTaraf}
            alanOneki="rakip"
            kazanan={kazanan === "onlar"}
            sonSatir
          />
        </div>

        <div className="flex justify-end gap-0 pr-0">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className="w-12 text-center font-veri text-[11px] uppercase text-murekkep-silik"
            >
              S{n}
            </span>
          ))}
        </div>
      </div>

      {/* ---------- Tarih ve yer ---------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        <label className="flex flex-col gap-1.5">
          <span className={etiketSinifi}>Yer</span>
          <input
            type="text"
            name="yer"
            maxLength={120}
            placeholder="Kort adı (opsiyonel)"
            className={girdiSinifi}
          />
        </label>
      </div>

      {durum.hata && (
        <p className="border-l-4 border-toprak bg-yuzey-yukseltilmis px-3 py-2.5 text-sm">
          {durum.hata}
        </p>
      )}

      <button
        type="submit"
        disabled={bekliyor || !yeterliOyuncu}
        className="border border-kort bg-kort py-4 font-govde text-[15px] font-bold uppercase tracking-widest text-tebesir transition-colors hover:bg-kazanan hover:text-kort disabled:opacity-50"
      >
        {bekliyor ? "Kaydediliyor…" : "Kaydet"}
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
