import Image from "next/image";
import blackLogo from "@/assets/openai/OpenAI-black-monoblossom.svg";
import whiteLogo from "@/assets/openai/OpenAI-white-monoblossom.svg";

interface OpenAIIconLogoProps {
  className?: string;
  alt?: string;
}

export function OpenAIIconLogo({ className, alt = "OpenAI" }: OpenAIIconLogoProps) {
  return (
    <>
      <Image src={blackLogo} alt={alt} className={`dark:hidden ${className ?? ""}`.trim()} />
      <Image src={whiteLogo} alt={alt} className={`hidden dark:block ${className ?? ""}`.trim()} />
    </>
  );
}
