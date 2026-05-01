import Image from "next/image";
import logo from "@/assets/google/google-gemini-icon-logo.svg";

interface GoogleIconLogoProps {
  className?: string;
  alt?: string;
}

export function GoogleIconLogo({ className, alt = "Google" }: GoogleIconLogoProps) {
  return (
    <>
      <Image src={logo} alt={alt} className={`${className ?? ""}`.trim()} />
    </>
  );
}
