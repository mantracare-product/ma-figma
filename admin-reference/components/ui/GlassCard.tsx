import React from "react";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "toolbar" | "elevated" | "dark";
  hoverable?: boolean;
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  rounded?: "lg" | "xl" | "2xl" | "3xl" | "full";
  className?: string;
  children?: React.ReactNode;
}

const variantStyles = {
  default:
    "bg-white/60 backdrop-blur-md border border-white/60 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03),0_2px_6px_-1px_rgba(0,0,0,0.02)]",
  subtle: "bg-white/30 backdrop-blur-sm border border-white/40",
  toolbar: "bg-white/45 backdrop-blur-md border border-white/50 shadow-sm",
  elevated:
    "bg-white/75 backdrop-blur-xl border border-white/70 shadow-[0_10px_30px_-4px_rgba(0,0,0,0.05),0_4px_12px_-2px_rgba(0,0,0,0.03)]",
  dark: "bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white border border-white/10 shadow-lg",
};

const paddingStyles = {
  none: "p-0",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-6",
  lg: "p-6 sm:p-8",
  xl: "p-8 sm:p-10",
};

const roundedStyles = {
  lg: "rounded-xl",
  xl: "rounded-2xl",
  "2xl": "rounded-[22px]",
  "3xl": "rounded-[28px]",
  full: "rounded-full",
};

export const GlassCard: React.FC<GlassCardProps> = ({
  variant = "default",
  hoverable = false,
  padding = "md",
  rounded = "3xl",
  className = "",
  children,
  ...props
}) => {
  return (
    <div
      className={`
        relative transition-all duration-300
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${roundedStyles[rounded]}
        ${
          hoverable
            ? "hover:shadow-[0_12px_28px_-4px_rgba(0,0,0,0.06)] hover:border-white/80 hover:-translate-y-0.5"
            : ""
        }
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
