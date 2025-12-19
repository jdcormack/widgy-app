import Logo from "@/components/logo";
import { AuthButtons } from "./auth-buttons";
import { CommandMenu } from "@/components/command-menu";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export async function PageHeader() {
  const { userId, orgId } = await auth();

  const isAuthenticated = !!userId && !!orgId;

  return (
    <header className="flex items-center justify-between max-w-7xl mx-auto pt-4 px-2">
      <Link href="/" className="flex items-center gap-4">
        <Logo />
      </Link>
      {isAuthenticated ? <CommandMenu /> : null}
      <AuthButtons />
    </header>
  );
}
