interface IconProps {
  size?: number;
  className?: string;
}

export function UserIcon({ size = 16, className }: IconProps) {
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
      <circle cx="8" cy="5.5" r="3" />
      <path d="M2 14c0-3.31 2.69-5 6-5s6 1.69 6 5" />
    </svg>
  );
}
