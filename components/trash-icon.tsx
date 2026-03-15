type TrashIconProps = {
  className?: string;
};

export function TrashIcon({ className }: TrashIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
    >
      <path
        d="M9 3.75h6M4.5 6.75h15M7.5 6.75v11.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V6.75M10 10.25v6M14 10.25v6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
