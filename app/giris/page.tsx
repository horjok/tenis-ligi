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
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <GirisFormu />
    </main>
  );
}
