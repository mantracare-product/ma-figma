import { useState } from "react";
import { Palette, ChevronDown } from "lucide-react";
import { useTheme, ThemePalette } from "../context/ThemeContext";

export default function ThemeSwitcher() {
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes: { value: ThemePalette; label: string; description: string }[] = [
    { value: "light", label: "Light", description: "Clean, professional default" },
    { value: "dark-core", label: "Dark Core", description: "Modern, reduced eye strain" },
    { value: "soft-pastel", label: "Soft Pastel", description: "Gentle, warm colors" },
    { value: "high-contrast", label: "High Contrast", description: "Maximum accessibility" },
    { value: "indigo-pulse", label: "Indigo Pulse", description: "Performance-focused B2B SaaS theme" },
    { value: "sales-ignite", label: "Sales Ignite", description: "High-energy inside sales theme" },
    { value: "growth-analytics", label: "Growth Analytics", description: "Green, yellow, and orange analytics theme" },
    { value: "enterprise-slate", label: "Enterprise Slate", description: "Serious corporate decision-maker theme" },
    { value: "realty-premium", label: "Realty Premium", description: "Deep green and gold real estate theme" },
    { value: "urban-blue", label: "Urban Blue", description: "Modern real estate and marketplace theme" },
    { value: "ai-neon", label: "AI Neon", description: "Futuristic AI-first dark theme" },
  ];

  const accentColors = [
    { value: "blue", label: "Blue", color: "#2563EB" },
    { value: "purple", label: "Purple", color: "#8B5CF6" },
    { value: "green", label: "Green", color: "#10B981" },
    { value: "orange", label: "Orange", color: "#F97316" },
    { value: "pink", label: "Pink", color: "#EC4899" },
    { value: "teal", label: "Teal", color: "#14B8A6" },
  ];

  const currentTheme = themes.find((t) => t.value === theme);

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {/* Theme Switcher */}
      <div className="relative">
        {/* Dropdown */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu - Opens Upward */}
            <div
              className="absolute right-0 bottom-full mb-2 w-72 rounded-xl shadow-2xl overflow-hidden max-h-[600px] flex flex-col"
              style={{
                backgroundColor: "var(--bg-dropdown)",
                border: "2px solid var(--border-default)",
              }}
            >
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-default)" }}>
                <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                  Select Theme Palette
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Preview different color schemes
                </p>
              </div>

              <div className="p-2 overflow-y-auto">
                {themes.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => {
                      setTheme(t.value);
                    }}
                    className="w-full text-left px-4 py-2.5 rounded-lg transition-all"
                    style={{
                      backgroundColor: theme === t.value ? "var(--accent-soft)" : "transparent",
                      color: "var(--text-primary)",
                      outline: theme === t.value ? "2px solid var(--accent-primary)" : "none",
                      outlineOffset: theme === t.value ? "-2px" : "0",
                    }}
                    onMouseEnter={(e) => {
                      if (theme !== t.value) {
                        e.currentTarget.style.backgroundColor = "var(--bg-surface-alt)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (theme !== t.value) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-sm block">{t.label}</span>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t.description}</p>
                      </div>
                      {theme === t.value && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: "var(--accent-primary)",
                            color: "var(--text-inverse)",
                          }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {!["high-contrast", "indigo-pulse", "sales-ignite", "growth-analytics", "enterprise-slate", "realty-premium", "urban-blue", "ai-neon"].includes(theme) && (
                <>
                  <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border-default)" }}>
                    <p className="font-semibold text-sm mb-2" style={{ color: "var(--text-primary)" }}>Accent Color</p>
                    <div className="grid grid-cols-6 gap-2">
                      {accentColors.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setAccentColor(color.value)}
                          className="w-8 h-8 rounded-lg transition-all"
                          style={{
                            backgroundColor: color.color,
                            outline: accentColor === color.value ? "2px solid var(--text-primary)" : "none",
                            outlineOffset: accentColor === color.value ? "2px" : "0",
                            transform: accentColor === color.value ? "scale(1)" : "scale(1)",
                          }}
                          onMouseEnter={(e) => {
                            if (accentColor !== color.value) {
                              e.currentTarget.style.transform = "scale(1.1)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (accentColor !== color.value) {
                              e.currentTarget.style.transform = "scale(1)";
                            }
                          }}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="px-4 py-2 text-center" style={{ borderTop: "1px solid var(--border-default)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Settings saved to session
                </p>
              </div>
            </div>
          </>
        )}

        {/* Theme Switcher Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 shadow-lg hover:shadow-xl transition-all"
          style={{
            backgroundColor: "var(--bg-surface)",
            color: "var(--text-primary)",
            border: "2px solid var(--border-default)",
          }}
        >
          <Palette className="w-4 h-4" />
          <div className="text-left">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Theme</p>
            <p className="font-semibold text-xs">{currentTheme?.label}</p>
          </div>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-0" : "rotate-180"}`}
          />
        </button>

        {/* Floating Badge */}
        <div className="absolute -top-8 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
          🎨 Theme Preview (Internal)
        </div>
      </div>
    </div>
  );
}
