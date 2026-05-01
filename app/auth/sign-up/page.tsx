import { redirect } from "next/navigation";

export default function Page() {
  // Self-serve: signups go through /onboard (form → Stripe → magic link).
  // The legacy /auth/sign-up password form bypassed business creation entirely
  // and stranded the user at /account-pending.
  redirect("/onboard");
}
