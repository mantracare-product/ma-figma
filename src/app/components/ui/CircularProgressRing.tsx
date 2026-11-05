import React from "react";

export interface CircularProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  indicatorColor?: string;
  className?: string;
}

/**
 * Reusable Circular Progress Ring indicator.
 * Displays completed progress ratio with smooth transitions.
 */
export function CircularProgressRing({
  value,
  max = 100,
  size = 20,
  strokeWidth = 2.5,
  trackColor = "#F1F5F9",
  indicatorColor = "#1E293B",
  className = "",
}: CircularProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = max > 0 ? Math.min(Math.max(value, 0), max) : 0;
  const progressRatio = max > 0 ? clampedValue / max : 0;
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`shrink-0 -rotate-90 ${className}`}
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={indicatorColor}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 200ms ease, stroke 200ms ease" }}
      />
    </svg>
  );
}

export default CircularProgressRing;

