import Logo from "@/components/logo";
import { AuthButtons } from "@/app/s/[subdomain]/auth-buttons";
import { CommandMenu } from "@/components/command-menu";

export function PageHeader() {
  return (
    <header className="flex items-center justify-between max-w-7xl mx-auto pt-4 px-2">
      <div className="flex items-center gap-4">
        <Logo />
      </div>
      <CommandMenu />
      <AuthButtons />
    </header>
  );
}
