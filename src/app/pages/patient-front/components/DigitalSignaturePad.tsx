import React, { useRef, useState, useEffect } from "react";
import { Eraser, Check, PenLine } from "lucide-react";

interface DigitalSignaturePadProps {
  onSave: (signatureDataUrl: string) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
}

export default function DigitalSignaturePad({
  onSave,
  onCancel,
  title = "Digital Consent Signature",
  subtitle = "Please sign within the box below using your mouse, finger, or stylus.",
}: DigitalSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [strokeHistory, setStrokeHistory] = useState<ImageData[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set high DPI resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.strokeStyle = "#1456F0";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Save initial blank state
    const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokeHistory([initialData]);
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokeHistory((prev) => [...prev, currentData]);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    const blank = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokeHistory([blank]);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div className="bg-white dark:bg-[#181e25] rounded-2xl p-5 border border-[#e2e8f0] dark:border-slate-800 shadow-[0_8px_30px_rgba(24,30,37,0.08)] max-w-lg w-full">
      <div className="mb-3">
        <h3 className="font-display text-base font-bold text-[#222222] dark:text-white">{title}</h3>
        <p className="text-xs text-[#64748b] dark:text-slate-400 mt-0.5">{subtitle}</p>
      </div>

      <div className="relative border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-40 touch-none cursor-crosshair block"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-[#94a3b8] dark:text-slate-500 font-medium gap-1.5">
            <PenLine className="w-4 h-4 text-[#94a3b8]" />
            <span>Sign with stylus, mouse, or touch</span>
          </div>
        )}
        <div className="absolute bottom-2 right-2 text-[10px] font-mono text-[#94a3b8] select-none">
          Legal Electronic Signature
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <button
          type="button"
          onClick={clearCanvas}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#45515e] dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
        >
          <Eraser className="w-3.5 h-3.5" />
          Clear
        </button>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-medium text-[#64748b] hover:text-[#222222] dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            disabled={!hasDrawn}
            onClick={handleSave}
            className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-full text-white transition-all shadow-xs ${
              hasDrawn
                ? "bg-[#1456f0] hover:bg-[#1d4ed8] active:scale-95 cursor-pointer"
                : "bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60"
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            Accept & Sign
          </button>
        </div>
      </div>
    </div>
  );
}
