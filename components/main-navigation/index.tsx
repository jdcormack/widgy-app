import Logo from "@/components/logo";
import Link from "next/link";
import { buttonVariants } from "../ui/button";

export function MainNavigation() {
  return (
    <header className="sticky top-0 flex items-center justify-between py-4 px-6 z-10 max-w-5xl w-full mx-auto bg-white">
      <Logo />

      <div className="flex items-center gap-2">
        <Link
          href="/sign-in"
          className={buttonVariants({ variant: "outline" })}
        >
          Sign in
        </Link>
        <Link href="/sign-up" className={buttonVariants()}>
          Get Started
        </Link>
      </div>
    </header>
  );
}
