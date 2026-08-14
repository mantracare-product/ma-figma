import React from "react";
import { motion, HTMLMotionProps } from "motion/react";

export interface PillButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "navy" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
}

export const PillButton: React.FC<PillButtonProps> = ({
  variant = "navy",
  size = "md",
  icon,
  iconPosition = "left",
  children,
  className = "",
  loading = false,
  disabled,
  ...props
}) => {
  const variantStyles = {
    navy: "bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white shadow-sm hover:shadow-md hover:from-[#222a35] hover:to-[#384c60]",
    primary: "bg-gradient-to-r from-[#1456f0] to-[#3b82f6] text-white shadow-sm hover:shadow-md hover:from-[#1147cc] hover:to-[#2563eb]",
    secondary: "bg-white/80 hover:bg-white text-[#222222] border border-slate-200 shadow-2xs",
    outline: "bg-transparent hover:bg-slate-100 text-[#45515e] hover:text-[#222222] border border-slate-200",
    ghost: "bg-transparent hover:bg-slate-100/70 text-[#45515e] hover:text-[#222222]",
    danger: "bg-gradient-to-r from-[#ef4444] to-[#dc2626] text-white shadow-sm hover:shadow-md",
  };

  const sizeStyles = {
    sm: "px-3.5 py-1.5 text-xs gap-1.5",
    md: "px-5 py-2 text-xs font-semibold gap-2",
    lg: "px-6 py-2.5 text-sm font-semibold gap-2.5",
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        variantStyles[variant]
      } ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon && iconPosition === "left" && <span className="flex-shrink-0">{icon}</span>}
          <span>{children}</span>
          {icon && iconPosition === "right" && <span className="flex-shrink-0">{icon}</span>}
        </>
      )}
    </motion.button>
  );
};

export default PillButton;
