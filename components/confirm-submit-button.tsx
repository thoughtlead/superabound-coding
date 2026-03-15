"use client";

import type { ReactNode, MouseEvent } from "react";

type ConfirmSubmitButtonProps = {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  confirmMessage: string;
  title?: string;
};

export function ConfirmSubmitButton({
  ariaLabel,
  children,
  className,
  confirmMessage,
  title,
}: ConfirmSubmitButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (!window.confirm(confirmMessage)) {
      event.preventDefault();
    }
  };

  return (
    <button
      aria-label={ariaLabel}
      className={className}
      onClick={handleClick}
      title={title}
      type="submit"
    >
      {children}
    </button>
  );
}
