import Link from "next/link";
import Logo from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { AlertTriangleIcon } from "lucide-react";

import { Footer } from "@/components/footer";

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="flex items-center py-4 px-6">
        <Link href="https://widgy.co">
          <Logo />
        </Link>
      </header>

      <div className="flex-1 relative flex items-center justify-center px-6 py-12">
        <div className="absolute inset-0 bg-linear-to-br from-blue-200 via-purple-200 to-transparent blur-3xl opacity-60"></div>
        <div className="relative z-10 w-full max-w-md space-y-8">
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="text-center space-y-4">
              <div className="flex flex-col items-center gap-2">
                <AlertTriangleIcon className="size-10 text-red-500" />
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  There’s been a mistake…
                </h1>
                <p className="text-lg text-gray-600">
                  We’re not quite sure what went wrong.
                </p>
              </div>
              <p className="text-gray-600">
                You can go back, or try looking on our Help Center if you need a
                hand.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
