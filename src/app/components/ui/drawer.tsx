"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "./utils";

interface CustomDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  maxWidth?: string;
  zIndex?: number; // add this
}

type DrawerProps = CustomDrawerProps & React.ComponentProps<typeof DrawerPrimitive.Root>;

function CustomSideDrawer({
  isOpen,
  onClose,
  title,
  footer,
  children,
  maxWidth = "sm:max-w-[70vw]",
  zIndex = 9999, // add this
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  maxWidth?: string;
  zIndex?: number; // add this
}) {
  const [shouldRender, setShouldRender] = React.useState(isOpen);
  const [animate, setAnimate] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => setAnimate(true), 10);
      if (typeof document !== "undefined") {
        document.body.style.overflow = "hidden";
      }
      return () => clearTimeout(timer);
    } else {
      setAnimate(false);
      const timer = setTimeout(() => setShouldRender(false), 300);
      if (typeof document !== "undefined") {
        document.body.style.overflow = "unset";
      }
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      if (typeof document !== "undefined") {
        document.addEventListener("keydown", handleEscape);
      }
    }
    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("keydown", handleEscape);
      }
    };
  }, [isOpen, onClose]);

  // Clean up overflow on unmount
  React.useEffect(() => {
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "unset";
      }
    };
  }, []);

  if (!shouldRender) return null;

  return createPortal(
    <div className="fixed inset-0 flex justify-end overflow-hidden"
      style={{ zIndex: zIndex }}
    >
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 ease-out ${
          animate ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Side Panel Drawer */}
      <div
        className={`relative w-full ${maxWidth} bg-white shadow-2xl h-full flex flex-col z-50 transform transition-transform duration-300 ease-out border-l border-gray-100 ${
          animate ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex-1 min-w-0">
            {typeof title === "string" ? (
              <h2 className="text-xl font-bold text-gray-900 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                {title}
              </h2>
            ) : (
              title
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors ml-4 flex-shrink-0 shadow-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-white">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function Drawer({
  isOpen,
  onClose,
  title,
  footer,
  children,
  maxWidth,
  zIndex, // add this
  ...props
}: DrawerProps) {
  if (isOpen !== undefined) {
    return (
      <CustomSideDrawer
        isOpen={isOpen}
        onClose={onClose || (() => {})}
        title={title}
        footer={footer}
        maxWidth={maxWidth}
        zIndex={zIndex} // add this
      >
        {children}
      </CustomSideDrawer>
    );
  }

  return <DrawerPrimitive.Root data-slot="drawer" {...props}>{children}</DrawerPrimitive.Root>;
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className,
      )}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content bg-background fixed z-50 flex h-auto flex-col",
          "data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b",
          "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t",
          "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:sm:max-w-sm",
          "data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm",
          className,
        )}
        {...props}
      >
        <div className="bg-muted mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  CustomSideDrawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
