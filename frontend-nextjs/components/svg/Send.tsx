interface IconProps {
  size?: number;
  className?: string;
}

export function SendIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <line x1="14" y1="2" x2="1" y2="8" />
      <line x1="14" y1="2" x2="6" y2="14" />
      <line x1="6" y1="14" x2="1" y2="8" />
    </svg>
  );
}
