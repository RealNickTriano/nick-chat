import Image from "next/image";
import blackLogo from "@/assets/anthropic/Anthropic-Icon.svg";
import whiteLogo from "@/assets/anthropic/Anthropic-Icon.svg";

interface AnthropicIconLogoProps {
  className?: string;
  alt?: string;
}

export function AnthropicIconLogo({ className, alt = "Anthropic" }: AnthropicIconLogoProps) {
  return (
    <>
      <Image src={blackLogo} alt={alt} className={`dark:hidden ${className ?? ""}`.trim()} />
      <Image
        src={whiteLogo}
        alt={alt}
        className={`hidden dark:block ${className ?? ""} brightness-0 invert`.trim()}
      />
    </>
  );
}
