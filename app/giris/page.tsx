import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { GirisFormu } from "./giris-formu";

export default async function GirisSayfasi() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 flex-col px-4 py-10 md:justify-center md:px-[12%] md:py-16">
      <header className="mb-8 md:mb-12">
        <h1 className="text-[32px] md:text-[44px]">Tenis Ligi</h1>
      </header>

      <GirisFormu />

      <div className="mt-auto w-full max-w-md border-t border-cizgi pt-8 md:mt-20">
        <p className="font-veri text-[11px] uppercase tracking-wider text-murekkep-silik">
          Kapalı lig · davet koduyla katılım
        </p>
      </div>
    </main>
  );
}
