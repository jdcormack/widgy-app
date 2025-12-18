import Image from "next/image";
import IMG_SRC from "./widgy.svg";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "light" | "dark";
  className?: string;
}

export default function Logo({ variant = "dark", className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src={IMG_SRC}
        alt="Logo"
        width={25}
        height={25}
        className={variant === "light" ? "brightness-0 invert" : ""}
      />
      <span
        className={cn(
          "text-2xl font-black pb-1 ml-0.5",
          variant === "light" ? "text-white" : "text-black"
        )}
      >
        widgy
      </span>
    </div>
  );
}
