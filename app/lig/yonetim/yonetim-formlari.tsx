"use client";

import { useActionState } from "react";

import {
  sezonBitir,
  sezonOlustur,
  sezonSil,
  type SezonDurumu,
} from "@/app/actions/sezon";
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

// ---------------------------------------------------------------------------
// Sezonlar
// ---------------------------------------------------------------------------

const SEZON_BOS: SezonDurumu = {};

function SezonBildirimi({ durum }: { durum: SezonDurumu }) {
  if (durum.bilgi) {
    return (
      <p className="border-l-4 border-kazanan bg-yuzey-yukseltilmis px-3 py-2.5 text-sm leading-6">
        {durum.bilgi}
      </p>
    );
  }
  if (durum.hata) {
    return (
      <p className="border-l-4 border-toprak bg-yuzey-yukseltilmis px-3 py-2.5 text-sm leading-6">
        {durum.hata}
      </p>
    );
  }
  return null;
}

const tarihGirdisi =
  "border border-cizgi bg-transparent px-3 py-2 veri text-[15px] " +
  "focus:border-kort focus:outline-none";

export function SezonOlusturFormu() {
  const [durum, gonder, bekliyor] = useActionState<SezonDurumu, FormData>(
    sezonOlustur,
    SEZON_BOS,
  );

  return (
    <form action={gonder} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-baslik text-[15px] uppercase tracking-wide text-murekkep-sonuk">
            Sezon adı
          </span>
          <input
            type="text"
            name="ad"
            required
            minLength={2}
            maxLength={60}
            placeholder="2026 Sonbahar"
            className="w-56 border border-cizgi bg-transparent px-3 py-2 text-[15px] placeholder:text-murekkep-silik focus:border-kort focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-baslik text-[15px] uppercase tracking-wide text-murekkep-sonuk">
            Başlangıç
          </span>
          <input type="date" name="baslangic" required className={tarihGirdisi} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-baslik text-[15px] uppercase tracking-wide text-murekkep-sonuk">
            Bitiş
          </span>
          <input type="date" name="bitis" className={tarihGirdisi} />
        </label>
      </div>

      <p className="text-xs leading-5 text-murekkep-silik">
        Bitişi boş bırakırsan sezon &quot;sürüyor&quot; sayılır. Süren bir sezon
        varken yeni sezon açamazsın — önce ona bitiş tarihi ver.
      </p>

      <button
        type="submit"
        disabled={bekliyor}
        className="self-start border border-kort bg-kort px-6 py-3 font-govde text-[14px] font-bold uppercase tracking-wider text-tebesir transition-colors hover:bg-kazanan hover:text-kort disabled:opacity-50"
      >
        {bekliyor ? "…" : "Sezon oluştur"}
      </button>

      <SezonBildirimi durum={durum} />
    </form>
  );
}

export function SezonBitirFormu({ sezonId }: { sezonId: string }) {
  const [durum, gonder, bekliyor] = useActionState<SezonDurumu, FormData>(
    sezonBitir,
    SEZON_BOS,
  );

  return (
    <form action={gonder} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="sezonId" value={sezonId} />
      <input
        type="date"
        name="bitis"
        required
        aria-label="Bitiş tarihi"
        className="border border-cizgi bg-transparent px-2 py-1 veri text-[13px] focus:border-kort focus:outline-none"
      />
      <button
        type="submit"
        disabled={bekliyor}
        className="border border-cizgi px-3 py-1.5 font-govde text-[12px] font-bold uppercase tracking-wider text-murekkep-sonuk transition-colors hover:border-kort hover:text-murekkep disabled:opacity-50"
      >
        {bekliyor ? "…" : "Bitir"}
      </button>
      {durum.hata && (
        <span className="font-veri text-[11px] text-toprak">{durum.hata}</span>
      )}
    </form>
  );
}

export function SezonSilButonu({ sezonId }: { sezonId: string }) {
  const [durum, gonder, bekliyor] = useActionState<SezonDurumu, FormData>(
    sezonSil,
    SEZON_BOS,
  );

  return (
    <form action={gonder} className="inline">
      <input type="hidden" name="sezonId" value={sezonId} />
      <button
        type="submit"
        disabled={bekliyor}
        className="font-veri text-[11px] uppercase tracking-wide text-murekkep-silik underline underline-offset-2 transition-colors hover:text-toprak disabled:opacity-50"
      >
        {bekliyor ? "…" : "Sil"}
      </button>
      {durum.hata && (
        <span className="ml-2 font-veri text-[11px] text-toprak">
          {durum.hata}
        </span>
      )}
    </form>
  );
}
