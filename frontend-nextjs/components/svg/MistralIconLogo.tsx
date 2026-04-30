import Image from "next/image";
import logo from "@/assets/mistral/Mistral-Logo.svg";

interface MistralIconLogoProps {
  className?: string;
  alt?: string;
}

export function MistralIconLogo({ className, alt = "Mistral" }: MistralIconLogoProps) {
  return (
    <>
      <Image src={logo} alt={alt} className={`${className ?? ""}`.trim()} />
    </>
  );
}
