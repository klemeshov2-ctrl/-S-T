import React, { useState } from "react";
import { Copy, Check, Download, Code, Sparkles, BookOpen, Smartphone, Shield, Flame, Landmark, FileText, Printer, Loader2, Brain, Zap, Activity, Coins } from "lucide-react";
import { IndicatorSettings } from "../types";
import { NeuralSuperFusionManual } from "./NeuralSuperFusionManual";
import { NeuraLibManual } from "./NeuraLibManual";
import { SuperIndicatorManual } from "./SuperIndicatorManual";
import { MoexIndicatorManual } from "./MoexIndicatorManual";
import { GoldTableGuide } from "./GoldTableGuide";
import {
  generateNeuralSuperFusionScript,
  generateSuperIndicatorScript,
  generateMoexStocksScript,
  generateNeuraLibAdaptiveScript,
  generateBinanceMacdScript,
  generateBinanceRsiScript
} from "../data/pineScriptGenerators";

interface PineScriptViewProps {
  settings: IndicatorSettings;
  setSettings: React.Dispatch<React.SetStateAction<IndicatorSettings>>;
}

export type SupportedIndicator = "superfusion_ai" | "neuralib_ai" | "super_indicator" | "moex_stocks" | "binance_macd" | "binance_rsi";

export default function PineScriptView({ settings, setSettings }: PineScriptViewProps) {
  const [selectedIndicator, setSelectedIndicator] = useState<SupportedIndicator>("superfusion_ai");
  const [activeTab, setActiveTab] = useState<"script" | "docs">("script");
  const [docsSubTab, setDocsSubTab] = useState<"standard" | "gold_table">("standard");
  const [copied, setCopied] = useState(false);
  const [copiedManual, setCopiedManual] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingGoldPDF, setIsGeneratingGoldPDF] = useState(false);

  const getActiveScript = () => {
    if (selectedIndicator === "superfusion_ai") {
      return generateNeuralSuperFusionScript(settings);
    }
    if (selectedIndicator === "neuralib_ai") {
      return generateNeuraLibAdaptiveScript(settings);
    }
    if (selectedIndicator === "moex_stocks") {
      return generateMoexStocksScript(settings);
    }
    if (selectedIndicator === "binance_macd") {
      return generateBinanceMacdScript(settings);
    }
    if (selectedIndicator === "binance_rsi") {
      return generateBinanceRsiScript(settings);
    }
    return generateSuperIndicatorScript(settings);
  };

  const getIndicatorFileName = () => {
    switch (selectedIndicator) {
      case "superfusion_ai":
        return "S_and_T_Neural_SuperFusion_AI_Engine_STv6.txt";
      case "neuralib_ai":
        return "S_and_T_Neural_AI_NeuraLib_STv6.txt";
      case "super_indicator":
        return "S_and_T_Ultimate_Super_Indicator_STv6.txt";
      case "moex_stocks":
        return "S_and_T_MOEX_Russia_Stocks_Indicator_v6.txt";
      case "binance_macd":
        return "Binance_MACD_SubPane_STv6.txt";
      case "binance_rsi":
        return "Binance_RSI_SubPane_STv6.txt";
    }
  };

  const getIndicatorTitle = () => {
    switch (selectedIndicator) {
      case "superfusion_ai":
        return "S&T Neural SuperFusion AI Engine (NeuraLib + Super Indicator)";
      case "neuralib_ai":
        return "S&T Neural AI: NeuraLib Deep Ensemble";
      case "super_indicator":
        return "S&T Ultimate Super Indicator v6";
      case "moex_stocks":
        return "S&T MOEX Russia Edition v6";
      case "binance_macd":
        return "Binance MACD Sub-Pane (DIF / DEA / Столбцы от 0)";
      case "binance_rsi":
        return "Binance RSI Sub-Pane (Кривые 6 и 14 + Уровни 80/50/20)";
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveScript());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([getActiveScript()], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = getIndicatorFileName();
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const url = `/api/download-manual-pdf?type=full&indicator=${selectedIndicator}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP error " + res.status);
      const rawBlob = await res.blob();
      const blob = new Blob([rawBlob], { type: "application/pdf" });
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${selectedIndicator}_manual.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);
    } catch (err) {
      console.warn("Direct PDF download fallback:", err);
      window.open(`/api/download-manual-pdf?type=full&indicator=${selectedIndicator}`, "_blank");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadGoldPDF = async () => {
    setIsGeneratingGoldPDF(true);
    try {
      const url = "/api/download-manual-pdf?type=gold";
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP error " + res.status);
      const rawBlob = await res.blob();
      const blob = new Blob([rawBlob], { type: "application/pdf" });
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "XAUUSD_Gold_Indicator_Table_Guide.pdf";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);
    } catch (err) {
      console.warn("Gold PDF export fallback:", err);
      window.open("/api/download-manual-pdf?type=gold", "_blank");
    } finally {
      setIsGeneratingGoldPDF(false);
    }
  };

  const handleDownloadHTML = (mode: "download" | "copy") => {
    const elementId =
      docsSubTab === "gold_table"
        ? "gold-table-manual-doc"
        : selectedIndicator === "superfusion_ai"
        ? "superfusion-manual-doc"
        : selectedIndicator === "neuralib_ai"
        ? "neuralib-manual-doc"
        : selectedIndicator === "super_indicator"
        ? "super-indicator-manual-doc"
        : "moex-manual-doc";

    const element = document.getElementById(elementId);
    if (!element) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>${docsSubTab === "gold_table" ? "Руководство по Таблице HUD (Золото XAUUSD)" : `${getIndicatorTitle()} - Инструкция`}</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; line-height: 1.6; }
      .container { max-width: 900px; margin: 0 auto; background: #1e293b; padding: 30px; border-radius: 16px; border: 1px solid #334155; }
      h1, h2, h3, h4, h5 { color: #f8fafc; }
      a { color: #38bdf8; }
      .no-print-btn { background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
      ${element.innerHTML}
    </div>
</body>
</html>`;

    if (mode === "copy") {
      navigator.clipboard.writeText(htmlContent);
      setCopiedManual(true);
      setTimeout(() => setCopiedManual(false), 2000);
      return;
    }

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = docsSubTab === "gold_table" ? "XAUUSD_Gold_Indicator_Table_Guide.html" : `${selectedIndicator}_manual.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0f14] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl" id="pinescript-view">
      {/* 🚀 Header controls */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#121620] gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-amber-500 via-purple-600 to-cyan-500 p-2.5 rounded-xl border border-amber-400/30 shadow-lg shadow-amber-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              S&T TradingView Indicators Hub
              <span className="bg-amber-500/10 text-amber-300 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 font-mono font-bold">
                Pine Script v6
              </span>
            </h3>
            <p className="text-xs text-gray-400">
              Выберите индикатор для получения валидированного кода TradingView или откройте практическое руководство
            </p>
          </div>
        </div>

        {/* Action Controls: 4 Indicators + View Mode + Mobile Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Indicators Selector */}
          <div className="flex items-center gap-1.5 bg-gray-950/60 p-1.5 rounded-xl border border-gray-800 flex-wrap">
            <button
              onClick={() => setSelectedIndicator("superfusion_ai")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                selectedIndicator === "superfusion_ai"
                  ? "bg-gradient-to-r from-amber-500 via-purple-600 to-cyan-500 text-white shadow-lg shadow-purple-500/25 border border-amber-300/40"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/40"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
              🌟 SuperFusion AI (Объединенный)
            </button>

            <button
              onClick={() => setSelectedIndicator("neuralib_ai")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                selectedIndicator === "neuralib_ai"
                  ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/25 border border-cyan-400/40"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/40"
              }`}
            >
              <Brain className="h-3.5 w-3.5 text-cyan-300" />
              🧠 NeuraLib AI
            </button>

            <button
              onClick={() => setSelectedIndicator("super_indicator")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                selectedIndicator === "super_indicator"
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md border border-amber-400/30"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/40"
              }`}
            >
              <Flame className="h-3.5 w-3.5 text-amber-300" />
              🔥 Super Indicator
            </button>

            <button
              onClick={() => setSelectedIndicator("moex_stocks")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                selectedIndicator === "moex_stocks"
                  ? "bg-gradient-to-r from-red-600 via-amber-600 to-yellow-500 text-white shadow-md border border-amber-400/30"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/40"
              }`}
            >
              <Landmark className="h-3.5 w-3.5 text-yellow-300" />
              🇷🇺 MOEX Edition
            </button>

            <button
              onClick={() => setSelectedIndicator("binance_macd")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                selectedIndicator === "binance_macd"
                  ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-rose-600 text-white shadow-md border border-emerald-400/30"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/40"
              }`}
              title="Отдельная нижняя строка MACD как на Binance: столбцы выше и ниже 0, линии DIF и DEA"
            >
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              📊 Binance MACD (Строка)
            </button>

            <button
              onClick={() => setSelectedIndicator("binance_rsi")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                selectedIndicator === "binance_rsi"
                  ? "bg-gradient-to-r from-purple-600 via-violet-600 to-amber-500 text-white shadow-md border border-purple-400/30"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/40"
              }`}
              title="Отдельная нижняя строка RSI как на Binance: кривые 6 и 14, уровни 80/50/20"
            >
              <Zap className="h-3.5 w-3.5 text-purple-300" />
              📈 Binance RSI (Строка)
            </button>
          </div>

          {/* View Mode Toggle: Code vs Dedicated Manual */}
          <div className="flex items-center gap-1 bg-gray-950/60 p-1.5 rounded-xl border border-gray-800">
            <button
              onClick={() => setActiveTab("script")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "script" ? "bg-[#1e2333] text-white shadow-md border border-gray-700" : "text-gray-400 hover:text-white"
              }`}
            >
              <Code className="h-3.5 w-3.5 text-blue-400" />
              Код Pine Script
            </button>
            <button
              onClick={() => setActiveTab("docs")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "docs" ? "bg-[#1e2333] text-white shadow-md border border-gray-700" : "text-gray-400 hover:text-white"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-amber-400" />
              Инструкция
            </button>
          </div>

          {/* Mobile Optimized Toggle */}
          <button
            onClick={() =>
              setSettings((prev) => ({
                ...prev,
                mobileOptimized: !prev.mobileOptimized
              }))
            }
            className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 border transition-all cursor-pointer ${
              settings.mobileOptimized
                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 border-blue-400/30"
                : "bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700"
            }`}
            title="Оптимизация параметров индикаторов для мобильного приложения TradingView (iOS / Android)"
          >
            <Smartphone className="h-3.5 w-3.5" />
            {settings.mobileOptimized ? "Mobile ON" : "Mobile OFF"}
          </button>
        </div>
      </div>

      {/* 🚀 Main Content Body */}
      {activeTab === "script" ? (
        <div className="flex-1 flex flex-col min-h-0 bg-[#07090e]">
          {/* Script Action Bar */}
          <div className="px-6 py-3 bg-[#121620]/80 border-b border-gray-800/80 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-gray-300 font-bold font-mono">
                {getIndicatorFileName()}
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                v6 Validated
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-md transition-all cursor-pointer active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-300" />
                    Скопировано!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Копировать Код
                  </>
                )}
              </button>

              <button
                onClick={handleDownload}
                className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg border border-gray-700 transition-all cursor-pointer"
                title="Скачать Pine Script (.txt)"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 💡 Binance Multi-Pane Architecture Guide Banner */}
          <div className="px-6 py-2.5 bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-gray-950/60 border-b border-blue-500/20 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-300 shrink-0 mt-0.5">
                <Zap className="h-4 w-4 text-amber-300" />
              </div>
              <div>
                <div className="font-bold text-gray-100 flex items-center gap-2">
                  <span>⚡ Как получить 2 отдельные строки (MACD и RSI) в TradingView как на Binance:</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Без наложений</span>
                </div>
                <p className="text-gray-400 text-[11px] mt-0.5">
                  В TradingView один скрипт не может создать две строки под графиком. Чтобы получить раздельные строки без наложений, добавьте 3 скрипта:
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                onClick={() => {
                  setSelectedIndicator("moex_stocks");
                  navigator.clipboard.writeText(generateMoexStocksScript(settings));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 border border-red-700/50 text-[11px] font-bold text-red-200 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Скопировать основной скрипт для свечного графика"
              >
                <Landmark className="h-3.5 w-3.5 text-yellow-300" />
                1. График: MOEX
              </button>
              <button
                onClick={() => {
                  setSelectedIndicator("binance_macd");
                  navigator.clipboard.writeText(generateBinanceMacdScript(settings));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/50 text-[11px] font-bold text-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Скопировать выделенный скрипт MACD для 1-й строки"
              >
                <Activity className="h-3.5 w-3.5 text-emerald-300" />
                2. Строка 1: MACD
              </button>
              <button
                onClick={() => {
                  setSelectedIndicator("binance_rsi");
                  navigator.clipboard.writeText(generateBinanceRsiScript(settings));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/50 text-[11px] font-bold text-purple-200 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Скопировать выделенный скрипт RSI для 2-й строки"
              >
                <Zap className="h-3.5 w-3.5 text-purple-300" />
                3. Строка 2: RSI
              </button>
            </div>
          </div>

          {/* 🇷🇺 MOEX Quick Settings Strip */}
          {selectedIndicator === "moex_stocks" && (
            <div className="px-6 py-2.5 bg-[#0d111d] border-b border-gray-800/90 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              {/* Table Mode Selector (with RSI returned to table) */}
              <div className="flex items-center gap-2">
                <span className="text-gray-400 font-medium">Таблица MOEX (с RSI):</span>
                <div className="flex items-center gap-1 bg-gray-950 p-1 rounded-lg border border-gray-800">
                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, moexTableMode: "desktop" }))}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                      (settings.moexTableMode ?? "desktop") === "desktop"
                        ? "bg-blue-600 text-white font-bold shadow"
                        : "text-gray-400 hover:text-white"
                    }`}
                    title="Полная таблица (10 строк: включает RSI 6 и RSI 14) для мониторов ПК"
                  >
                    💻 ПК (10 строк с RSI)
                  </button>
                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, moexTableMode: "mobile_compact" }))}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                      settings.moexTableMode === "mobile_compact"
                        ? "bg-blue-600 text-white font-bold shadow"
                        : "text-gray-400 hover:text-white"
                    }`}
                    title="Оптимальная мобильная таблица со строкой RSI"
                  >
                    📱 Мобильный + RSI
                  </button>
                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, moexTableMode: "mobile_mini" }))}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                      settings.moexTableMode === "mobile_mini"
                        ? "bg-amber-600 text-white font-bold shadow"
                        : "text-gray-400 hover:text-white"
                    }`}
                    title="Мини-смартфон (Сетап, Зона, TP/SL, RSI 6/14)"
                  >
                    ⚡ Мини + RSI
                  </button>
                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, moexTableMode: "mobile_ultra" }))}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                      settings.moexTableMode === "mobile_ultra"
                        ? "bg-indigo-600 text-white font-bold shadow"
                        : "text-gray-400 hover:text-white"
                    }`}
                    title="1 колонка для узкого экрана с RSI"
                  >
                    🔹 1 колонка + RSI
                  </button>
                </div>
              </div>

              {/* Bottom Pane Toggle: ONLY MACD (as requested) */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-800/40 px-2 py-1 rounded-lg text-[10px] text-emerald-300 font-medium">
                  <span>📊 Внизу в графе: <strong>Только MACD (Binance)</strong></span>
                </div>
                <button
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      moexOscillatorPane: !(prev.moexOscillatorPane ?? false),
                      moexOscMode: "macd"
                    }))
                  }
                  className={`px-3 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    (settings.moexOscillatorPane ?? false)
                      ? "bg-emerald-600/25 text-emerald-300 border-emerald-500/50 hover:bg-emerald-600/35"
                      : "bg-gray-800/80 text-gray-400 border-gray-700 hover:text-white"
                  }`}
                  title="Отдельная нижняя строка только для MACD (столбцы от 0, DIF и DEA в стиле Binance)"
                >
                  <Activity className="h-3.5 w-3.5" />
                  {(settings.moexOscillatorPane ?? false) ? "Строка MACD: Вкл" : "Строка MACD: Выкл"}
                </button>
              </div>
            </div>
          )}

          {/* ⭐ Super Indicator Quick Settings Strip */}
          {selectedIndicator === "super_indicator" && (
            <div className="px-6 py-2.5 bg-[#0d111d] border-b border-gray-800/90 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* 📱 Mobile Table Mode Selector */}
                <div className="flex items-center gap-1 bg-black/40 border border-gray-800 rounded-lg p-0.5">
                  <span className="text-[10px] text-gray-400 px-2 font-medium">Таблица:</span>
                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, superTableMode: "desktop" }))}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                      (settings.superTableMode ?? "desktop") === "desktop"
                        ? "bg-blue-600 text-white font-bold shadow"
                        : "text-gray-400 hover:text-white"
                    }`}
                    title="Полная таблица со всеми метриками и консенсусом (для ПК)"
                  >
                    💻 ПК
                  </button>
                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, superTableMode: "mobile_compact" }))}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                      settings.superTableMode === "mobile_compact"
                        ? "bg-emerald-600 text-white font-bold shadow"
                        : "text-gray-400 hover:text-white"
                    }`}
                    title="Полная информация как на ПК, сжатая по ширине для экранов смартфонов"
                  >
                    📱 Мобильный
                  </button>
                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, superTableMode: "mobile_mini" }))}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                      settings.superTableMode === "mobile_mini"
                        ? "bg-amber-600 text-white font-bold shadow"
                        : "text-gray-400 hover:text-white"
                    }`}
                    title="Мини-смартфон (3 объединенные строки: Сетап, Цели, Зона)"
                  >
                    ⚡ Мини
                  </button>
                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, superTableMode: "mobile_ultra" }))}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                      settings.superTableMode === "mobile_ultra"
                        ? "bg-indigo-600 text-white font-bold shadow"
                        : "text-gray-400 hover:text-white"
                    }`}
                    title="Ультра-микро (1 колонка для узкого экрана)"
                  >
                    🔹 1 колонка
                  </button>
                </div>

                {/* Mobile Text Shortening Toggle */}
                <button
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      mobileShortText: !(prev.mobileShortText ?? true)
                    }))
                  }
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    (settings.mobileShortText ?? true)
                      ? "bg-purple-600/25 text-purple-300 border-purple-500/50 hover:bg-purple-600/35"
                      : "bg-gray-800/80 text-gray-400 border-gray-700 hover:text-white"
                  }`}
                  title="Сокращать длинные слова (LONG, SHORT, SL, TP, R:R) для экономии места на мобильных"
                >
                  <span>Сокращения: {(settings.mobileShortText ?? true) ? "Вкл" : "Выкл"}</span>
                </button>

                {/* Preset Selector */}
                <div className="flex items-center gap-1.5 bg-cyan-950/30 border border-cyan-800/40 px-2.5 py-1 rounded-lg text-[10px] text-cyan-300">
                  <Sparkles className="h-3 w-3 text-cyan-400 animate-pulse" />
                  <span className="font-semibold">Пресет:</span>
                  <select
                    value={settings.selectedPreset ?? "★ Универсальный (Все таймфреймы / Авто-Адаптивный)"}
                    onChange={(e) => setSettings((prev) => ({ ...prev, selectedPreset: e.target.value }))}
                    className="bg-black/60 border border-cyan-500/40 rounded px-1.5 py-0.5 text-[11px] text-cyan-200 font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="★ Универсальный (Все таймфреймы / Авто-Адаптивный)">★ Универсальный (Все ТФ / Авто)</option>
                    <option value="Золото (XAUUSD) - 15 мин Оптимальный">Золото (XAUUSD) - 15 мин</option>
                    <option value="Золото (XAUUSD) - 5 мин Скальпинг">Золото (XAUUSD) - 5 мин</option>
                    <option value="Золото (XAUUSD) - 1 час Интрадей/Тренд">Золото (XAUUSD) - 1 час</option>
                    <option value="Биткоин (BTCUSD) - 15 мин Оптимальный">Биткоин (BTCUSD) - 15 мин</option>
                    <option value="Общий (Все активы) - 15 мин Оптимальный">Общий (Все активы) - 15 мин</option>
                    <option value="По умолчанию (Ручные настройки)">Ручные настройки</option>
                  </select>
                </div>
              </div>

              {/* Bottom Pane Toggle: ONLY MACD (as in MOEX) */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-lg text-[10px] text-emerald-300 font-medium">
                  <span>📊 Внизу: <strong>Только MACD (Binance)</strong></span>
                </div>
                <button
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      superOscillatorPane: !(prev.superOscillatorPane ?? true)
                    }))
                  }
                  className={`px-3 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    (settings.superOscillatorPane ?? true)
                      ? "bg-emerald-600/25 text-emerald-300 border-emerald-500/50 hover:bg-emerald-600/35"
                      : "bg-gray-800/80 text-gray-400 border-gray-700 hover:text-white"
                  }`}
                  title="Отдельная нижняя строка только для MACD (столбцы от 0, DIF и DEA в стиле Binance)"
                >
                  <Activity className="h-3.5 w-3.5" />
                  {(settings.superOscillatorPane ?? true) ? "Строка MACD: Вкл" : "Строка MACD: Выкл"}
                </button>
              </div>
            </div>
          )}

          {/* Code Syntax Highlight Window */}
          <div className="flex-1 overflow-auto p-6 font-mono text-[11px] leading-relaxed text-gray-300 select-all whitespace-pre bg-[#080a10]">
            {getActiveScript()
              .split("\n")
              .map((line, idx) => {
                let colorClass = "text-gray-300";
                if (line.trim().startsWith("//")) {
                  colorClass = "text-gray-500 italic";
                } else if (line.includes("input") || line.includes("indicator")) {
                  colorClass = "text-amber-300 font-semibold";
                } else if (
                  line.trim().startsWith("plotshape") ||
                  line.trim().startsWith("barcolor") ||
                  line.trim().startsWith("plot") ||
                  line.trim().startsWith("fill")
                ) {
                  colorClass = "text-indigo-300 font-semibold";
                } else if (
                  line.includes("if") ||
                  line.includes("for") ||
                  line.includes("while") ||
                  line.includes("else")
                ) {
                  colorClass = "text-blue-400 font-bold";
                } else if (
                  line.includes("ta.ema") ||
                  line.includes("ta.stdev") ||
                  line.includes("request.security")
                ) {
                  colorClass = "text-pink-400";
                }
                return (
                  <div key={idx} className="hover:bg-gray-800/30 px-2 rounded -mx-2 flex">
                    <span className="w-10 text-gray-600 text-right pr-4 select-none user-select-none text-[10px]">
                      {idx + 1}
                    </span>
                    <span className={colorClass}>{line || " "}</span>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 bg-[#07090e]">
          {/* Docs Header Bar */}
          <div className="no-print border-b border-gray-800 px-6 py-4 bg-[#121620]/80 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-amber-400" />
                  Инструкция: {getIndicatorTitle()}
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Руководство по сигналам, правилам входа, установке в TradingView и настройке алертов
                </p>
              </div>

              {/* Sub-tab view toggle: Full Manual vs Gold HUD Table */}
              <div className="flex items-center gap-1 bg-gray-950/80 p-1 rounded-xl border border-gray-800 shrink-0">
                <button
                  onClick={() => setDocsSubTab("standard")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    docsSubTab === "standard"
                      ? "bg-gray-800 text-white shadow-sm border border-gray-700"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                  Полное руководство
                </button>
                <button
                  onClick={() => setDocsSubTab("gold_table")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    docsSubTab === "gold_table"
                      ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-950 shadow-md font-bold"
                      : "text-amber-400 hover:text-amber-300"
                  }`}
                  title="Открыть практическую инструкцию по таблице HUD на примере Золота (XAUUSD 15m)"
                >
                  <Coins className="h-3.5 w-3.5" />
                  🏆 Таблица HUD (Золото XAUUSD)
                </button>
              </div>
            </div>

            {/* Export Actions for Manual */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <button
                onClick={handleDownloadGoldPDF}
                disabled={isGeneratingGoldPDF}
                className="no-print px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-gray-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer border border-amber-300/40 disabled:opacity-50"
                title="Скачать PDF с инструкцией по таблице на примере Золота (XAUUSD)"
              >
                {isGeneratingGoldPDF ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-gray-950" />
                    PDF Золото...
                  </>
                ) : (
                  <>
                    <Coins className="h-4 w-4 text-gray-950" />
                    PDF: Таблица (Золото XAUUSD)
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="no-print px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 active:scale-[0.98] transition-all cursor-pointer border border-rose-400/30 disabled:opacity-50"
                title="Скачать полное руководство по индикатору в PDF"
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    Формирование PDF...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 text-rose-100" />
                    Скачать PDF (Полное)
                  </>
                )}
              </button>

              <button
                onClick={() => window.print()}
                className="no-print px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all cursor-pointer border border-blue-400/20"
                title="Печать / Сохранить в PDF через браузер"
              >
                <Printer className="h-4 w-4 text-blue-100" />
                Печать
              </button>

              <button
                onClick={() => handleDownloadHTML("download")}
                className="no-print px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-gray-700 active:scale-[0.98] transition-all cursor-pointer"
                title="Скачать автономный HTML файл"
              >
                <Download className="h-4 w-4 text-gray-400" />
                HTML
              </button>

              <button
                onClick={() => handleDownloadHTML("copy")}
                className={`no-print px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer border ${
                  copiedManual ? "bg-emerald-600 border-emerald-500 text-white" : "bg-gray-800 hover:bg-gray-750 border-gray-700 text-gray-300"
                }`}
                title="Скопировать HTML код руководства"
              >
                {copiedManual ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-100" />
                    Скопировано
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-gray-400" />
                    Копия HTML
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Render dedicated manual component or Gold Table Guide */}
          {docsSubTab === "gold_table" ? (
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <GoldTableGuide onDirectPdfDownload={handleDownloadGoldPDF} isPdfLoading={isGeneratingGoldPDF} />
            </div>
          ) : (
            <>
              {selectedIndicator === "superfusion_ai" && <NeuralSuperFusionManual />}
              {selectedIndicator === "neuralib_ai" && <NeuraLibManual />}
              {selectedIndicator === "super_indicator" && <SuperIndicatorManual />}
              {selectedIndicator === "moex_stocks" && <MoexIndicatorManual />}
              {(selectedIndicator === "binance_macd" || selectedIndicator === "binance_rsi") && <SuperIndicatorManual />}
            </>
          )}
        </div>
      )}
    </div>
  );
}
