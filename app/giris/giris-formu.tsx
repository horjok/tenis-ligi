"use client";

import { useActionState, useState } from "react";

import { girisYap, kayitOl, type FormDurumu } from "@/app/actions/auth";

const BOS: FormDurumu = {};

const etiketSinifi =
  "font-baslik text-[18px] uppercase tracking-wide text-murekkep";

const girdiSinifi =
  "w-full border border-kort bg-transparent px-3 py-3 font-govde text-[16px] " +
  "text-murekkep placeholder:text-murekkep-silik focus:border-kort focus:outline-none";

export function GirisFormu() {
  const [kayitModu, setKayitModu] = useState(false);

  /*
   * useActionState formu sunucudaki fonksiyona bağlar:
   *   durum    → fonksiyonun döndürdüğü değer (hata mesajı)
   *   gonder   → form'un action'ı
   *   bekliyor → istek sürerken true
   *
   * C#'tan bakarsan: server action, sunucudaki bir metoda doğrudan çağrı gibi.
   * Arada elle yazdığın bir API controller'ı yok.
   */
  const [durum, gonder, bekliyor] = useActionState<FormDurumu, FormData>(
    kayitModu ? kayitOl : girisYap,
    BOS,
  );

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 border-b border-cizgi pb-2">
        <h2 className="text-[26px]">{kayitModu ? "Kayıt Ol" : "Giriş Yap"}</h2>
      </div>

      {/* key: mod değişince React formu sıfırlasın, eski alanlar kalmasın */}
      <form
        key={kayitModu ? "kayit" : "giris"}
        action={gonder}
        className="flex flex-col gap-5"
      >
        {kayitModu && (
          <label className="flex flex-col gap-1.5">
            <span className={etiketSinifi}>Davet Kodu</span>
            <input
              name="davetKodu"
              type="text"
              required
              autoComplete="off"
              spellCheck={false}
              placeholder="Ligi kuran kişiden al"
              className={`${girdiSinifi} veri uppercase tracking-widest`}
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className={etiketSinifi}>Kullanıcı Adı</span>
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
          <label className="flex flex-col gap-1.5">
            <span className={etiketSinifi}>Görünen Ad</span>
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

        <label className="flex flex-col gap-1.5">
          <span className={etiketSinifi}>Şifre</span>
          <input
            name="sifre"
            type="password"
            required
            minLength={8}
            autoComplete={kayitModu ? "new-password" : "current-password"}
            placeholder="••••••••"
            className={`${girdiSinifi} veri tracking-[0.2em]`}
          />
        </label>

        {durum.hata && (
          <p className="border-l-4 border-toprak bg-yuzey-yukseltilmis px-3 py-2.5 text-sm text-murekkep">
            {durum.hata}
          </p>
        )}

        <button
          type="submit"
          disabled={bekliyor}
          className="mt-1 w-full border border-kort bg-kort py-4 font-govde text-[16px] font-bold uppercase tracking-wider text-tebesir transition-colors hover:bg-kazanan hover:text-kort disabled:opacity-50"
        >
          {bekliyor ? "..." : kayitModu ? "Kayıt Ol" : "Giriş Yap"}
        </button>

        <button
          type="button"
          onClick={() => setKayitModu((v) => !v)}
          className="self-start font-govde text-[14px] font-bold text-murekkep-sonuk underline underline-offset-4 hover:text-murekkep"
        >
          {kayitModu
            ? "Zaten hesabın var mı? Giriş yap"
            : "Davet kodun var mı? Kayıt ol"}
        </button>
      </form>

      {kayitModu && (
        <p className="mt-6 max-w-sm text-xs leading-5 text-murekkep-silik">
          E-posta istemiyoruz. Şifreni unutursan ligi yöneten kişi sıfırlar.
        </p>
      )}
    </div>
  );
}
