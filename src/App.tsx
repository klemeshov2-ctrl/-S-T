import { useState } from "react";
import { 
  Cpu, 
  Code2, 
  BookOpen, 
  Brain,
  Flame,
  Landmark,
  Sparkles,
  Smartphone,
  ScanLine,
  Bot,
  MessageSquareText,
  Server,
  Zap,
  Radio
} from "lucide-react";
import { IndicatorSettings } from "./types";
import PineScriptView from "./components/PineScriptView";
import { AiScreenshotInspector } from "./components/AiScreenshotInspector";
import ServerDeploymentHub from "./components/ServerDeploymentHub";
import { DeepSeekGoldScheduler } from "./components/DeepSeekGoldScheduler";
import { PasswordAuthModal } from "./components/PasswordAuthModal";
import { Lock, LogOut } from "lucide-react";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentAppTab, setCurrentAppTab] = useState<"generator" | "ai_inspector" | "server_deploy" | "gold_deepseek">("gold_deepseek");
  const [indicatorSettings, setIndicatorSettings] = useState<IndicatorSettings>({
    mlEnabled: true,
    featureCount: 3,
    neighborCount: 8,
    lorentzianThreshold: 60,
    useRSI: true,
    useCCI: true,
    useADX: false,
    useWaveTrend: true,
    deltaSmoothing: 14,
    deltaThreshold: 1.0,
    structureLookback: 5,
    showFVG: true,
    showOB: true,
    showBOS: true,
    showReversalZones: true,
    showPriceForecast: true,
    showProbabilities: true,
    showDashboardTable: true,
    forecastLookback: 30,
    forecastTargetMult: 1.0,
    forecastShowPostTarget: true,
    forecastModelAccuracy: 'SMC-Balanced',
    showSweepLabels: true,
    selectedPreset: "★ Универсальный (Все таймфреймы / Авто-Адаптивный)",
    mobileOptimized: false,
    moexTableMode: 'desktop',
    superTableMode: 'desktop',
    mobileShortText: true,
    moexOscillatorPane: true,
    moexOscMode: 'macd',
    superOscillatorPane: true,
  });

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 font-sans flex flex-col antialiased selection:bg-blue-500/30 selection:text-white">
      
      {/* 🚀 STUDIO HEADER */}
      <header className="bg-[#0b0e17] border-b border-gray-800 px-4 md:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-amber-500 via-purple-600 to-cyan-500 p-2.5 rounded-xl shadow-lg shadow-amber-500/20 border border-amber-400/30">
            <Cpu className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-lg tracking-tight text-white uppercase">
                S&T Indicator <span className="text-amber-400">Studio</span>
              </h1>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider font-bold">
                Pine Script v6
              </span>
            </div>
            <p className="text-xs text-gray-400 font-medium">
              Официальный генератор кодов и руководства: SuperFusion AI, NeuraLib Deep ML, Super Indicator и MOEX Edition
            </p>
          </div>
        </div>

        {/* Quick Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs text-amber-300 font-semibold shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span>SuperFusion AI</span>
          </div>
          <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg text-xs text-purple-300 font-semibold">
            <Brain className="h-3.5 w-3.5 text-purple-400" />
            <span>NeuraLib Deep ML</span>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg text-xs text-amber-300 font-semibold">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span>Super Indicator</span>
          </div>
          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg text-xs text-red-300 font-semibold">
            <Landmark className="h-3.5 w-3.5 text-red-400" />
            <span>MOEX Edition</span>
          </div>
        </div>
      </header>

      {/* 🧭 NAVIGATION TABS */}
      <div className="bg-[#090c14] border-b border-gray-800/80 px-4 md:px-6 py-2 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCurrentAppTab("gold_deepseek")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentAppTab === "gold_deepseek"
                ? "bg-gradient-to-r from-amber-500 via-orange-600 to-yellow-600 text-white shadow-md shadow-amber-500/30 ring-1 ring-amber-400/50"
                : "text-gray-400 hover:text-white hover:bg-gray-800/60"
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
            <span>🏆 Золото & DeepSeek AI (09:00 / 15:00)</span>
            <span className="text-[9px] bg-amber-400/20 text-amber-200 border border-amber-400/40 px-1 py-0.2 rounded font-mono font-bold uppercase">
              Авто-План
            </span>
          </button>

          <button
            onClick={() => setCurrentAppTab("server_deploy")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentAppTab === "server_deploy"
                ? "bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-md shadow-cyan-500/20"
                : "text-gray-400 hover:text-white hover:bg-gray-800/60"
            }`}
          >
            <Server className="h-4 w-4 text-cyan-300" />
            <span>🖥️ Сервер & Развертывание (VPS)</span>
            <span className="text-[9px] bg-cyan-400/20 text-cyan-200 border border-cyan-400/40 px-1 py-0.2 rounded font-mono font-bold uppercase">
              Docker / Webhook
            </span>
          </button>

          <button
            onClick={() => setCurrentAppTab("ai_inspector")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentAppTab === "ai_inspector"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                : "text-gray-400 hover:text-white hover:bg-gray-800/60"
            }`}
          >
            <Bot className="h-4 w-4 text-cyan-400" />
            <span>🤖 ИИ Анализатор Скриншотов</span>
            <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1 py-0.2 rounded font-mono font-bold uppercase">
              Интерактив
            </span>
          </button>

          <button
            onClick={() => setCurrentAppTab("generator")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentAppTab === "generator"
                ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-500/20"
                : "text-gray-400 hover:text-white hover:bg-gray-800/60"
            }`}
          >
            <Code2 className="h-4 w-4 text-amber-400" />
            <span>📜 Коды Индикаторов & Руководства</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] text-gray-400 hidden lg:flex items-center gap-1.5 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>DeepSeek 09:00 & 15:00 МСК • Мульти-ТФ (15m, 30m, 1h, 4h) • Telegram Алерты</span>
          </div>

          <button
            onClick={() => {
              sessionStorage.removeItem("st_server_auth_token");
              setIsAuthenticated(false);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs transition cursor-pointer border border-gray-700"
            title="Заблокировать панель управления / Выйти"
          >
            <Lock className="h-3 w-3 text-cyan-400" />
            <span className="hidden sm:inline">Блокировка</span>
          </button>
        </div>
      </div>

      {/* 🔐 PASSWORD PROTECTION MODAL (Direct access by IP) */}
      {!isAuthenticated && (
        <PasswordAuthModal onAuthenticated={() => setIsAuthenticated(true)} />
      )}

      {/* 🚀 MAIN CONTENT BODY */}
      <main className="flex-1 overflow-hidden min-h-0 bg-[#07090e]">
        {currentAppTab === "gold_deepseek" ? (
          <DeepSeekGoldScheduler />
        ) : currentAppTab === "server_deploy" ? (
          <ServerDeploymentHub />
        ) : currentAppTab === "ai_inspector" ? (
          <AiScreenshotInspector />
        ) : (
          <div className="h-full p-4 md:p-6 overflow-hidden">
            <PineScriptView
              settings={indicatorSettings}
              setSettings={setIndicatorSettings}
            />
          </div>
        )}
      </main>

      {/* 🛡️ FOOTER */}
      <footer className="bg-[#05070a] border-t border-gray-800/80 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>S&T TradingView Indicators Hub — Полная совместимость с Pine Script v6 (Desktop & Mobile)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] bg-gray-900 border border-gray-800 px-2 py-0.5 rounded text-gray-400">
            Pine Script v6 Ready
          </span>
        </div>
      </footer>
    </div>
  );
}
