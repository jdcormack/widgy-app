import Link from "next/link";

import Logo from "@/components/logo";
import { AuthedMenu } from "./authed-menu";

export async function PageHeader() {
  return (
    <header className="flex items-center justify-between max-w-7xl  w-full mx-auto pt-4 px-2">
      <Link href="/" className="flex items-center gap-4">
        <Logo />
      </Link>

      <AuthedMenu />
    </header>
  );
}
