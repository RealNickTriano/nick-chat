interface IconProps {
  size?: number;
  className?: string;
  filled?: boolean;
}

export function StarIcon({ size = 14, className, filled = false }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M8 1.75l1.95 4.05 4.45.5-3.3 3 .9 4.4L8 11.55l-4 2.15.9-4.4-3.3-3 4.45-.5z" />
    </svg>
  );
}
