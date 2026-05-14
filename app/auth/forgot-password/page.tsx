import Link from "next/link";
import { CopperLogo } from "@/components/copper-logo";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <Link href="/" className="block">
          <CopperLogo className="h-14 w-auto" priority />
        </Link>
        <div className="w-full">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
