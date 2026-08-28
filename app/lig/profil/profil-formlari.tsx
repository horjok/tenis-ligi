"use client";

import { useActionState } from "react";

import {
  bildirimTercihiDegistir,
  epostaEkle,
  epostayiSil,
  type BildirimDurumu,
} from "@/app/actions/bildirim";

const BOS: BildirimDurumu = {};

function Bilgi({ durum }: { durum: BildirimDurumu }) {
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

export function EpostaFormu({ mevcutAdres }: { mevcutAdres: string | null }) {
  const [durum, gonder, bekliyor] = useActionState<BildirimDurumu, FormData>(
    epostaEkle,
    BOS,
  );

  return (
    <form action={gonder} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="font-baslik text-[16px] uppercase tracking-wide text-murekkep-sonuk">
          {mevcutAdres ? "Adresi değiştir" : "E-posta adresin"}
        </span>
        <input
          type="email"
          name="eposta"
          required
          maxLength={200}
          autoComplete="email"
          placeholder="ornek@eposta.com"
          className="max-w-md border border-cizgi bg-transparent px-3 py-2.5 text-[15px] placeholder:text-murekkep-silik focus:border-kort focus:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={bekliyor}
        className="self-start border border-kort bg-kort px-6 py-3 font-govde text-[14px] font-bold uppercase tracking-wider text-tebesir transition-colors hover:bg-kazanan hover:text-kort disabled:opacity-50"
      >
        {bekliyor ? "…" : mevcutAdres ? "Değiştir" : "Doğrulama bağlantısı gönder"}
      </button>

      <Bilgi durum={durum} />
    </form>
  );
}

export function EpostaSilButonu() {
  return (
    <form action={epostayiSil}>
      <button
        type="submit"
        className="font-veri text-[11px] uppercase tracking-wide text-murekkep-silik underline underline-offset-2 transition-colors hover:text-toprak"
      >
        Adresi kaldır
      </button>
    </form>
  );
}

export function TercihAnahtari({ acik }: { acik: boolean }) {
  const [durum, gonder, bekliyor] = useActionState<BildirimDurumu, FormData>(
    bildirimTercihiDegistir,
    BOS,
  );

  return (
    <div className="flex flex-col gap-3">
      <form action={gonder} className="flex flex-wrap items-center gap-4">
        {/* Tıklanınca mevcut durumun TERSİ gönderilir. */}
        <input type="hidden" name="acik" value={acik ? "0" : "1"} />

        <span
          className={[
            "border px-3 py-1.5 font-veri text-[11px] uppercase tracking-wide",
            acik
              ? "border-kazanan bg-kazanan text-kort"
              : "border-cizgi text-murekkep-silik",
          ].join(" ")}
        >
          {acik ? "Bildirimler açık" : "Bildirimler kapalı"}
        </span>

        <button
          type="submit"
          disabled={bekliyor}
          className="border border-cizgi px-4 py-2 font-govde text-[13px] font-bold uppercase tracking-wider text-murekkep-sonuk transition-colors hover:border-kort hover:text-murekkep disabled:opacity-50"
        >
          {bekliyor ? "…" : acik ? "Kapat" : "Aç"}
        </button>
      </form>

      <Bilgi durum={durum} />
    </div>
  );
}
