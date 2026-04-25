interface IconProps {
  size?: number;
  className?: string;
}

export function LayersIcon({ size = 16, className }: IconProps) {
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
      <polygon points="8,1 15,5 8,9 1,5" />
      <polyline points="1,9 8,13 15,9" />
    </svg>
  );
}
