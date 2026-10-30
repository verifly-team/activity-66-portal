import type { ReactElement } from "react";

type ArrowDirection = "up-right" | "up" | "down";

const paths: Record<ArrowDirection, ReactElement> = {
  "up-right": (
    <>
      <path d="M1.8 14.2 14.2 1.8" />
      <path d="M8.9 1.8h5.3v5.3" />
    </>
  ),
  up: (
    <>
      <path d="M8 14.2V1.6" />
      <path d="M4.9 4.9 8 1.8l3.1 3.1" />
    </>
  ),
  down: (
    <>
      <path d="M8 1.6v12.6" />
      <path d="M4.9 11.1 8 14.2l3.1-3.1" />
    </>
  ),
};

type ArrowIconProps = {
  direction?: ArrowDirection;
  className?: string;
};

/**
 * Inline arrow so phones never hand the glyph to an emoji font.
 * Size follows font-size, colour follows currentColor.
 */
export function ArrowIcon({ direction = "up-right", className }: ArrowIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`arrow-icon${className ? ` ${className}` : ""}`}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="butt"
      strokeLinejoin="miter"
      focusable="false"
    >
      {paths[direction]}
    </svg>
  );
}
