import Logo from "@/components/logo";
import { AuthButtons } from "@/app/s/[subdomain]/auth-buttons";
import { CommandMenu } from "@/components/command-menu";
import Link from "next/link";

export function PageHeader() {
  return (
    <header className="flex items-center justify-between max-w-7xl mx-auto pt-4 px-2">
      <Link href="/" className="flex items-center gap-4">
        <Logo />
      </Link>
      <CommandMenu />
      <AuthButtons />
    </header>
  );
}
