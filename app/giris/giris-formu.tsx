"use client";

import { useActionState, useState } from "react";

import { girisYap, kayitOl, type FormDurumu } from "@/app/actions/auth";

const BOS: FormDurumu = {};

const girdiSinifi =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none " +
  "focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100";

export function GirisFormu() {
  const [kayitModu, setKayitModu] = useState(false);

  /*
   * useActionState formu sunucudaki fonksiyona bağlar:
   * - `durum`    → fonksiyonun döndürdüğü değer (hata mesajı)
   * - `gonder`   → form'un action'ı
   * - `bekliyor` → istek sürerken true
   *
   * C#'tan bakarsan: server action, sunucudaki bir metoda doğrudan çağrı gibi.
   * Arada elle yazdığın bir API controller'ı yok, Next.js aradaki HTTP
   * trafiğini kendisi üretiyor.
   */
  const [durum, gonder, bekliyor] = useActionState<FormDurumu, FormData>(
    kayitModu ? kayitOl : girisYap,
    BOS,
  );

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        {kayitModu ? "Kayıt ol" : "Giriş yap"}
      </h1>
      <p className="mb-6 text-sm text-zinc-500">Tenis Ligi</p>

      {/* key: mod değişince React formu sıfırlasın, eski alanlar kalmasın */}
      <form key={kayitModu ? "kayit" : "giris"} action={gonder} className="flex flex-col gap-3">
        {kayitModu && (
          <label className="flex flex-col gap-1 text-sm">
            Davet kodu
            <input
              name="davetKodu"
              type="text"
              required
              autoComplete="off"
              spellCheck={false}
              placeholder="Ligi kuran kişiden al"
              className={`${girdiSinifi} uppercase`}
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Kullanıcı adı
          <input
            name="kullaniciAdi"
            type="text"
            required
            autoComplete="username"
            spellCheck={false}
            pattern="[a-zA-Z0-9_]{3,20}"
            title="3-20 karakter; harf, rakam ve alt çizgi"
            className={`${girdiSinifi} lowercase`}
          />
        </label>

        {kayitModu && (
          <label className="flex flex-col gap-1 text-sm">
            Görünen ad
            <input
              name="gorunenAd"
              type="text"
              required
              minLength={2}
              maxLength={40}
              autoComplete="name"
              placeholder="Puan tablosunda görünecek isim"
              className={girdiSinifi}
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Şifre
          <input
            name="sifre"
            type="password"
            required
            minLength={8}
            autoComplete={kayitModu ? "new-password" : "current-password"}
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
          className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {bekliyor ? "..." : kayitModu ? "Kayıt ol" : "Giriş yap"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setKayitModu((v) => !v)}
        className="mt-4 text-sm text-zinc-500 underline underline-offset-4"
      >
        {kayitModu
          ? "Zaten hesabın var mı? Giriş yap"
          : "Davet kodun var mı? Kayıt ol"}
      </button>

      {kayitModu && (
        <p className="mt-4 text-xs leading-5 text-zinc-500">
          E-posta istemiyoruz. Şifreni unutursan ligi yöneten kişi sıfırlar.
        </p>
      )}
    </div>
  );
}
