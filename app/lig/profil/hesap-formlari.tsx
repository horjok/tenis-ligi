"use client";

import { useActionState } from "react";

import {
  adiDegistir,
  sifreDegistir,
  type HesapDurumu,
} from "@/app/actions/hesap";

const BOS: HesapDurumu = {};

const etiketSinifi =
  "font-baslik text-[15px] uppercase tracking-wide text-murekkep-sonuk";

const girdiSinifi =
  "w-full max-w-sm border border-cizgi bg-transparent px-3 py-2.5 text-[15px] " +
  "placeholder:text-murekkep-silik focus:border-kort focus:outline-none";

const dugmeSinifi =
  "self-start border border-kort bg-kort px-6 py-3 font-govde text-[14px] " +
  "font-bold uppercase tracking-wider text-tebesir transition-colors " +
  "hover:bg-kazanan hover:text-kort disabled:opacity-50";

function Bildirim({ durum }: { durum: HesapDurumu }) {
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

export function AdFormu({ mevcutAd }: { mevcutAd: string }) {
  const [durum, gonder, bekliyor] = useActionState<HesapDurumu, FormData>(
    adiDegistir,
    BOS,
  );

  return (
    <form action={gonder} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className={etiketSinifi}>Görünen ad</span>
        <input
          type="text"
          name="gorunenAd"
          required
          minLength={2}
          maxLength={40}
          defaultValue={mevcutAd}
          className={girdiSinifi}
        />
      </label>

      <button type="submit" disabled={bekliyor} className={dugmeSinifi}>
        {bekliyor ? "…" : "Adı kaydet"}
      </button>

      <Bildirim durum={durum} />
    </form>
  );
}

export function SifreFormu() {
  const [durum, gonder, bekliyor] = useActionState<HesapDurumu, FormData>(
    sifreDegistir,
    BOS,
  );

  return (
    <form action={gonder} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className={etiketSinifi}>Mevcut şifren</span>
        <input
          type="password"
          name="mevcutSifre"
          required
          autoComplete="current-password"
          className={girdiSinifi}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={etiketSinifi}>Yeni şifre</span>
        <input
          type="password"
          name="yeniSifre"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="En az 8 karakter"
          className={girdiSinifi}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={etiketSinifi}>Yeni şifre (tekrar)</span>
        <input
          type="password"
          name="yeniSifreTekrar"
          required
          minLength={8}
          autoComplete="new-password"
          className={girdiSinifi}
        />
      </label>

      <button type="submit" disabled={bekliyor} className={dugmeSinifi}>
        {bekliyor ? "…" : "Şifreyi değiştir"}
      </button>

      <Bildirim durum={durum} />
    </form>
  );
}
