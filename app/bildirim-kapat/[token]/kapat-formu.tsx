"use client";

import { useActionState } from "react";

import {
  tokenIleBildirimKapat,
  type BildirimDurumu,
} from "@/app/actions/bildirim";

const BOS: BildirimDurumu = {};

export function KapatFormu({ token }: { token: string }) {
  const [durum, gonder, bekliyor] = useActionState<BildirimDurumu, FormData>(
    tokenIleBildirimKapat,
    BOS,
  );

  // İşlem bittiyse formu değil sonucu göster — kullanıcı aynı butona
  // ikinci kez basıp "acaba olmadı mı" diye düşünmesin.
  if (durum.bilgi) {
    return (
      <p className="mt-4 border-l-4 border-kazanan bg-yuzey-yukseltilmis px-3 py-2.5 text-sm leading-6">
        {durum.bilgi}
      </p>
    );
  }

  return (
    <form action={gonder} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <button
        type="submit"
        disabled={bekliyor}
        className="self-start border border-toprak bg-toprak px-6 py-3 font-govde text-[14px] font-bold uppercase tracking-wider text-tebesir transition-colors hover:opacity-85 disabled:opacity-50"
      >
        {bekliyor ? "…" : "Bildirimleri kapat"}
      </button>

      {durum.hata && (
        <p className="border-l-4 border-toprak bg-yuzey-yukseltilmis px-3 py-2.5 text-sm leading-6">
          {durum.hata}
        </p>
      )}
    </form>
  );
}
