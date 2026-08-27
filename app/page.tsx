import { redirect } from "next/navigation";

export default function AnaSayfa() {
  // Giriş yapmamış kullanıcıyı proxy.ts zaten /giris'e yolluyor.
  redirect("/lig");
}
