import React from "react";

export interface PillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  as?: "button" | "span" | "div";
  variant?: "brand" | "navy" | "success" | "warning" | "danger" | "neutral" | "ghost" | "glass";
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles = {
  brand: "bg-[#1456f0] text-white hover:bg-[#2563eb] shadow-sm shadow-blue-500/20",
  navy: "bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white shadow-md shadow-slate-900/10 hover:from-[#1e252e] hover:to-[#34495e]",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/30",
  warning: "bg-amber-50 text-amber-700 border border-amber-200/60",
  danger: "bg-rose-50 text-rose-700 border border-rose-200/60",
  neutral: "bg-slate-100 text-slate-700 border border-slate-200/70",
  ghost: "bg-transparent text-[#45515e] hover:bg-white/60 border border-transparent hover:border-white/60",
  glass: "bg-white/60 backdrop-blur-md text-[#222222] border border-white/70 hover:bg-white/80 shadow-sm",
};

const sizeStyles = {
  xs: "text-xs px-2.5 py-1 gap-1",
  sm: "text-xs font-medium px-3 py-1.5 gap-1.5",
  md: "text-sm font-medium px-4 py-2 gap-2",
  lg: "text-base font-medium px-5 py-2.5 gap-2.5",
};

export const Pill: React.FC<PillProps> = ({
  as = "button",
  variant = "brand",
  size = "md",
  className = "",
  icon,
  children,
  ...props
}) => {
  const Component = as as any;

  return (
    <Component
      className={`
        inline-flex items-center justify-center rounded-full font-medium transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-[#1456f0]/40 focus:ring-offset-1 select-none
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </Component>
  );
};
