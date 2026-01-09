import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-4 px-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-5xl w-full mx-auto py-1 px-6">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-black">
          <Link href="https://widgy.co" className="transition-colors">
            Home
          </Link>
          <Link href="https://widgy.co/privacy" className="transition-colors">
            Privacy
          </Link>
          <Link href="https://widgy.co/terms" className="transition-colors">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
