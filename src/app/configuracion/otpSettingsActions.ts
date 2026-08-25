"use server";

import { redirect } from "next/navigation";
import { setOtpEmail, setOtpPhone } from "@/lib/auth";

export async function saveOtpDestinationsAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!email || !email.includes("@")) {
    redirect("/configuracion?otpError=1");
  }

  await setOtpEmail(email);
  await setOtpPhone(phone || null);
  redirect("/configuracion?otpChanged=1");
}
