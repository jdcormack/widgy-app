import Logo from "@/components/logo";
import Link from "next/link";
import { buttonVariants } from "../ui/button";

export function MainNavigation() {
  return (
    <header className="sticky top-0 z-10 bg-white">
      <div className="max-w-8xl w-full mx-auto flex items-center justify-between py-4 px-6">
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
      </div>
    </header>
  );
}
