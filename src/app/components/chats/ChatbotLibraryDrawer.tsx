import React, { useState, useMemo } from "react";
import { X, Search, Bot, Plus, ArrowRight, Sparkles, Layers, Globe, MessageSquare } from "lucide-react";
import { LIBRARY_BOTS, LibraryBot } from "../../../lib/chatbotLibrary";
import { Button } from "../ui/Button";

interface ChatbotLibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBot: (bot: LibraryBot) => void;
}

export default function ChatbotLibraryDrawer({
  isOpen,
  onClose,
  onSelectBot,
}: ChatbotLibraryDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBots = useMemo(() => {
    return LIBRARY_BOTS.filter((bot) => {
      return (
        bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bot.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Chatbot Flow Library
                </h2>
                <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Browse pre-configured automated bot flows and clone them into your canvas
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chatbot templates by name or description..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>
        </div>

        {/* Bot List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
          {filteredBots.length === 0 ? (
            <div className="py-16 text-center">
              <Bot className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">No matching chatbot flows found</p>
              <p className="text-xs text-gray-500 mt-1">Try adjusting your search query.</p>
            </div>
          ) : (
            filteredBots.map((bot) => {
              const nodeCount = bot.flow.nodes.length;
              return (
                <div
                  key={bot.id}
                  className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3
                            className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            {bot.name}
                          </h3>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold flex items-center gap-1">
                            <Layers className="w-3 h-3" /> {nodeCount} {nodeCount === 1 ? "step" : "steps"}
                          </span>
                        </div>
                        <p
                          className="text-xs text-gray-500 mt-1 leading-relaxed"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {bot.description}
                        </p>
                      </div>
                    </div>

                    {/* Channels */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-gray-400">Supported Channels:</span>
                      {bot.channels.map((ch) => (
                        <span
                          key={ch}
                          className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[10px] font-semibold uppercase tracking-wider border border-gray-200"
                        >
                          {ch}
                        </span>
                      ))}
                    </div>

                    {/* Flow Steps Preview */}
                    <div className="bg-gray-50 border border-gray-200/70 rounded-xl p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                        Flow Architecture Preview
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {bot.flow.nodes.map((n, idx) => (
                          <React.Fragment key={n.id}>
                            <div className="flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 shadow-2xs whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              {n.data.label || n.type}
                            </div>
                            {idx < bot.flow.nodes.length - 1 && (
                              <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-gray-100">
                    <Button
                      variant="primary"
                      onClick={() => onSelectBot(bot)}
                      className="px-4 py-2 text-xs font-semibold flex items-center gap-1.5 rounded-xl shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Use This Chatbot
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
