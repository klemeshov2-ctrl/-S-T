import React, { useState, useEffect } from "react";
import {
  Clock,
  Sparkles,
  Send,
  Bell,
  RefreshCw,
  Play,
  Save,
  CheckCircle2,
  Calendar,
  Layers,
  Sliders,
  Flame,
  FileText,
  AlertTriangle,
  Globe,
  Coins,
  Bot,
  Copy,
  PlusCircle,
  Trash2,
  Terminal,
  Activity,
  ArrowRight,
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  UserPlus
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ScheduleCalendarSlot {
  id: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday ... 6=Saturday
  timeMsk: string;
  label: string;
  enabled: boolean;
}

interface GoldScheduleConfig {
  enabled: boolean;
  timesMsk: string[];
  timeframes: string[];
  deepSeekModel: "deepseek-chat" | "deepseek-reasoner";
  deepSeekApiKey: string;
  deepSeekApiKeyMasked?: string;
  telegramBotToken: string;
  telegramBotTokenMasked?: string;
  telegramChatId: string;
  telegramEnabled: boolean;
  tradingPair: string;
  promptTemplate: string;
  scheduleCalendar?: ScheduleCalendarSlot[];
  scheduleCalendarEnabled: boolean;
  chartSourceMode: "tradingview_link" | "standalone_engine" | "manual_paste";
  tradingViewChartUrl: string;
  tradingViewTimeframeMode: "single_layout" | "multi_window" | "auto_query_param" | "per_timeframe";
  tradingViewUrlsByTimeframe?: {
    "15m"?: string;
    "1h"?: string;
    "4h"?: string;
  };
  autoScreenshotsEnabled: boolean;
  telegramSendPhotos: boolean;
  dxyCorrelationFilter: boolean;
  newsFilter: {
    enabled: boolean;
    highImpactOnly: boolean;
    keywords: string[];
    autoTriggerAnalysisOnNews: boolean;
    autoPollCalendar?: boolean;
  };
}

interface ScheduledReport {
  id: string;
  timestamp: string;
  triggerType: "SCHEDULED_9MSK" | "SCHEDULED_15MSK" | "CALENDAR_SLOT" | "MACRO_EVENT" | "MANUAL" | "WEBHOOK";
  tradingPair: string;
  timeframes: string[];
  reportText: string;
  newsContext: string[];
  macroEvent?: string;
  telegramDelivered: boolean;
  modelUsed: string;
  chartSourceUsed?: "tradingview_link" | "standalone_engine" | "manual_paste";
  chartSnapshotSvg?: string;
}

interface MacroNewsItem {
  id: string;
  time: string;
  title: string;
  impact: "CRITICAL" | "HIGH" | "MEDIUM";
  category: "INFLATION" | "FED_RATES" | "LABOR" | "GEOPOLITICS" | "DXY";
  summary: string;
  goldEffect: string;
  publishedAt: string;
}

export const DeepSeekGoldScheduler: React.FC = () => {
  const [config, setConfig] = useState<GoldScheduleConfig | null>(null);
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [news, setNews] = useState<MacroNewsItem[]>([]);
  const [activeReport, setActiveReport] = useState<ScheduledReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isPublishingNews, setIsPublishingNews] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Editable config state
  const [enabled, setEnabled] = useState(true);
  const [timesMsk, setTimesMsk] = useState(["09:00", "15:00"]);
  const [timeframes, setTimeframes] = useState(["15m", "30m", "1h", "4h"]);
  const [deepSeekModel, setDeepSeekModel] = useState<"deepseek-chat" | "deepseek-reasoner">("deepseek-chat");
  const [deepSeekApiKey, setDeepSeekApiKey] = useState("");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [tradingPair, setTradingPair] = useState("XAUUSD (Золото / Доллар США)");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [autoTriggerOnNews, setAutoTriggerOnNews] = useState(true);
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  
  // Chart & Screenshot Source selection (Strictly mutually exclusive)
  const [chartSourceMode, setChartSourceMode] = useState<"tradingview_link" | "standalone_engine" | "manual_paste">("tradingview_link");
  const [tradingViewChartUrl, setTradingViewChartUrl] = useState("https://www.tradingview.com/chart/?symbol=OANDA:XAUUSD");
  const [tradingViewTimeframeMode, setTradingViewTimeframeMode] = useState<"single_layout" | "multi_window" | "auto_query_param" | "per_timeframe">("single_layout");
  const [tvUrl15m, setTvUrl15m] = useState("");
  const [tvUrl1h, setTvUrl1h] = useState("");
  const [tvUrl4h, setTvUrl4h] = useState("");

  // Independent feature toggles (Full on/off control)
  const [autoScreenshotsEnabled, setAutoScreenshotsEnabled] = useState(true);
  const [telegramSendPhotos, setTelegramSendPhotos] = useState(true);
  const [scheduleCalendarEnabled, setScheduleCalendarEnabled] = useState(true);
  const [dxyCorrelationFilter, setDxyCorrelationFilter] = useState(true);
  const [showStandaloneSvgPreview, setShowStandaloneSvgPreview] = useState(false);

  // News publishing modal / fields
  const [newNewsTitle, setNewNewsTitle] = useState("");
  const [newNewsImpact, setNewNewsImpact] = useState<"CRITICAL" | "HIGH" | "MEDIUM">("CRITICAL");
  const [newNewsCategory, setNewNewsCategory] = useState<"INFLATION" | "FED_RATES" | "LABOR" | "GEOPOLITICS" | "DXY">("INFLATION");
  const [newNewsSummary, setNewNewsSummary] = useState("");
  const [newNewsGoldEffect, setNewNewsGoldEffect] = useState("");

  // Interactive calendar slots
  const [calendarSlots, setCalendarSlots] = useState<ScheduleCalendarSlot[]>([]);
  const [newSlotDay, setNewSlotDay] = useState<number>(1);
  const [newSlotTime, setNewSlotTime] = useState<string>("09:00");
  const [newSlotLabel, setNewSlotLabel] = useState<string>("Торговый план");
  // Change master password
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [passMsg, setPassMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Telegram subscribers & White-List state
  interface TelegramSubscriberItem {
    chatId: string;
    username?: string;
    firstName?: string;
    status: "pending" | "approved" | "blocked";
    role: "admin" | "subscriber";
    requestedAt: string;
    approvedAt?: string;
    notes?: string;
  }
  const [subscribers, setSubscribers] = useState<TelegramSubscriberItem[]>([]);
  const [requireApproval, setRequireApproval] = useState(true);
  const [manualChatId, setManualChatId] = useState("");
  const [manualUsername, setManualUsername] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [subscriberFilter, setSubscriberFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "BLOCKED">("ALL");

  const fetchSubscribers = async () => {
    try {
      const res = await fetch("/api/telegram/subscribers");
      const data = await res.json();
      if (data.subscribers) {
        setSubscribers(data.subscribers);
        setRequireApproval(Boolean(data.requireApproval));
      }
    } catch {}
  };

  const handleSubscriberAction = async (chatId: string, action: "approve" | "block" | "delete") => {
    try {
      const res = await fetch("/api/telegram/subscribers/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, action })
      });
      const data = await res.json();
      if (data.subscribers) {
        setSubscribers(data.subscribers);
      }
    } catch (err: any) {
      alert("Ошибка: " + err.message);
    }
  };

  const handleAddManualSubscriber = async () => {
    if (!manualChatId.trim()) {
      alert("Укажите Telegram Chat ID");
      return;
    }
    try {
      const res = await fetch("/api/telegram/subscribers/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: manualChatId.trim(),
          username: manualUsername.trim(),
          firstName: manualName.trim(),
          notes: manualNotes.trim()
        })
      });
      const data = await res.json();
      if (data.subscribers) {
        setSubscribers(data.subscribers);
        setManualChatId("");
        setManualUsername("");
        setManualName("");
        setManualNotes("");
        setShowAddUserModal(false);
      }
    } catch (err: any) {
      alert("Ошибка: " + err.message);
    }
  };

  const handleToggleApprovalMode = async (enabled: boolean) => {
    setRequireApproval(enabled);
    try {
      await fetch("/api/telegram/subscribers/toggle-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requireApproval: enabled })
      });
    } catch {}
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      fetchSubscribers();
      const cfgRes = await fetch("/api/gold/schedule-config");
      const cfgData = await cfgRes.json();
      if (cfgData.config) {
        const c = cfgData.config;
        setConfig(c);
        setEnabled(c.enabled);
        setTimesMsk(c.timesMsk || ["09:00", "15:00"]);
        setTimeframes(c.timeframes || ["15m", "30m", "1h", "4h"]);
        setDeepSeekModel(c.deepSeekModel || "deepseek-chat");
        setTelegramChatId(c.telegramChatId || "");
        setTelegramEnabled(c.telegramEnabled !== undefined ? c.telegramEnabled : true);
        setTradingPair(c.tradingPair || "XAUUSD");
        setPromptTemplate(c.promptTemplate || "");
        setAutoTriggerOnNews(Boolean(c.newsFilter?.autoTriggerAnalysisOnNews));
        setKeywords(c.newsFilter?.keywords || []);
        if (Array.isArray(c.scheduleCalendar)) {
          setCalendarSlots(c.scheduleCalendar);
        }
        setScheduleCalendarEnabled(c.scheduleCalendarEnabled !== undefined ? c.scheduleCalendarEnabled : true);
        setChartSourceMode(c.chartSourceMode || "tradingview_link");
        setTradingViewChartUrl(c.tradingViewChartUrl || "https://www.tradingview.com/chart/?symbol=OANDA:XAUUSD");
        setTradingViewTimeframeMode(c.tradingViewTimeframeMode || "single_layout");
        if (c.tradingViewUrlsByTimeframe) {
          setTvUrl15m(c.tradingViewUrlsByTimeframe["15m"] || "");
          setTvUrl1h(c.tradingViewUrlsByTimeframe["1h"] || "");
          setTvUrl4h(c.tradingViewUrlsByTimeframe["4h"] || "");
        }
        setAutoScreenshotsEnabled(c.autoScreenshotsEnabled !== undefined ? c.autoScreenshotsEnabled : true);
        setTelegramSendPhotos(c.telegramSendPhotos !== undefined ? c.telegramSendPhotos : true);
        setDxyCorrelationFilter(c.dxyCorrelationFilter !== undefined ? c.dxyCorrelationFilter : true);
      }

      const repRes = await fetch("/api/gold/reports");
      const repData = await repRes.json();
      if (repData.reports) {
        setReports(repData.reports);
        if (repData.reports.length > 0) {
          setActiveReport(repData.reports[0]);
        }
      }

      const newsRes = await fetch("/api/gold/news");
      const newsData = await newsRes.json();
      if (newsData.news) {
        setNews(newsData.news);
      }
    } catch (e) {
      console.warn("Notice loading gold data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const payload: any = {
        enabled,
        timesMsk,
        timeframes,
        deepSeekModel,
        telegramChatId,
        telegramEnabled,
        tradingPair,
        promptTemplate,
        scheduleCalendar: calendarSlots,
        scheduleCalendarEnabled,
        chartSourceMode,
        tradingViewChartUrl,
        tradingViewTimeframeMode,
        tradingViewUrlsByTimeframe: {
          "15m": tvUrl15m.trim(),
          "1h": tvUrl1h.trim(),
          "4h": tvUrl4h.trim()
        },
        autoScreenshotsEnabled,
        telegramSendPhotos,
        dxyCorrelationFilter,
        newsFilter: {
          enabled: true,
          highImpactOnly: true,
          keywords,
          autoTriggerAnalysisOnNews: autoTriggerOnNews,
          autoPollCalendar: true
        }
      };

      if (deepSeekApiKey.trim().length > 0) {
        payload.deepSeekApiKey = deepSeekApiKey.trim();
      }
      if (telegramBotToken.trim().length > 0) {
        payload.telegramBotToken = telegramBotToken.trim();
      }

      const res = await fetch("/api/gold/schedule-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setDeepSeekApiKey("");
        setTelegramBotToken("");
        loadData();
      }
    } catch (e) {
      console.error("Save config error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerNow = async (macroEventNotice?: string) => {
    setIsTriggering(true);
    try {
      const res = await fetch("/api/gold/trigger-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggerType: macroEventNotice ? "MACRO_EVENT" : "MANUAL",
          macroEvent: macroEventNotice,
          tradingPair
        })
      });
      const data = await res.json();
      if (data.report) {
        setActiveReport(data.report);
        setReports(prev => [data.report, ...prev]);
      }
    } catch (e) {
      console.error("Trigger error:", e);
    } finally {
      setIsTriggering(false);
    }
  };

  const handlePublishNews = async () => {
    if (!newNewsTitle.trim()) return;
    setIsPublishingNews(true);
    try {
      const res = await fetch("/api/gold/publish-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newNewsTitle,
          impact: newNewsImpact,
          category: newNewsCategory,
          summary: newNewsSummary,
          goldEffect: newNewsGoldEffect,
          autoTrigger: autoTriggerOnNews
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewNewsTitle("");
        setNewNewsSummary("");
        setNewNewsGoldEffect("");
        loadData();
        if (data.generatedReport) {
          setActiveReport(data.generatedReport);
        }
      }
    } catch (e) {
      console.error("Publish news error:", e);
    } finally {
      setIsPublishingNews(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const addTimeframe = (tf: string) => {
    if (!timeframes.includes(tf)) {
      setTimeframes([...timeframes, tf]);
    }
  };

  const removeTimeframe = (tf: string) => {
    setTimeframes(timeframes.filter(t => t !== tf));
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter(k => k !== kw));
  };

  const handleToggleSlot = (slotId: string) => {
    setCalendarSlots(prev =>
      prev.map(s => (s.id === slotId ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleRemoveSlot = (slotId: string) => {
    setCalendarSlots(prev => prev.filter(s => s.id !== slotId));
  };

  const handleAddCalendarSlot = () => {
    if (!newSlotTime) return;
    const newSlot: ScheduleCalendarSlot = {
      id: "slot-" + Math.random().toString(36).substring(2, 8),
      dayOfWeek: newSlotDay,
      timeMsk: newSlotTime,
      label: newSlotLabel.trim() || `Анализ ${newSlotTime} МСК`,
      enabled: true
    };
    setCalendarSlots([...calendarSlots, newSlot]);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass || !newPass) return;
    setIsChangingPass(true);
    setPassMsg(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPassMsg({ text: "Мастер-пароль успешно обновлен!", isError: false });
        setCurrentPass("");
        setNewPass("");
      } else {
        setPassMsg({ text: data.error || "Ошибка смены пароля", isError: true });
      }
    } catch {
      setPassMsg({ text: "Сетевая ошибка при смене пароля", isError: true });
    } finally {
      setIsChangingPass(false);
    }
  };

  const dayNames = ["Воскресенье (ВС)", "Понедельник (ПН)", "Вторник (ВТ)", "Среда (СР)", "Четверг (ЧТ)", "Пятница (ПТ)", "Суббота (СБ)"];

  return (
    <div className="h-full flex flex-col bg-[#07090e] text-gray-100 overflow-hidden font-sans">
      {/* 🚀 HEADER BAR */}
      <div className="bg-[#0b0f19] border-b border-gray-800/80 px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-600 to-yellow-500 shadow-lg shadow-amber-500/20 border border-amber-400/30">
            <Coins className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-sm md:text-base text-white tracking-wide uppercase">
                Авто-Анализ Золота (XAUUSD) & DeepSeek AI
              </h2>
              <span className="flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                09:00 & 15:00 МСК + Новостные Триггеры
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Мульти-таймфреймы (15m, 30m, 1h, 4h) • Отправка в Telegram • Инфляция США, CPI, ФРС • Гибкие промты
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTriggerNow()}
            disabled={isTriggering}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isTriggering ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isTriggering ? "Генерация отчета..." : "Сгенерировать План Сейчас"}</span>
          </button>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition cursor-pointer"
            title="Обновить данные"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-amber-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* 🧭 MAIN SPLIT VIEW */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        
        {/* LEFT COLUMN: LIVE REPORT & HISTORY (60%) */}
        <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-800/80 overflow-hidden min-h-0">
          
          {/* Report header strip */}
          <div className="bg-[#0d111a] border-b border-gray-800/80 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {activeReport ? `Отчет: ${activeReport.tradingPair}` : "Текущий торговый план"}
              </span>
              {activeReport && (
                <span className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono">
                  {new Date(activeReport.timestamp).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} МСК
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activeReport && (
                <button
                  onClick={() => copyToClipboard(activeReport.reportText, "report")}
                  className="flex items-center gap-1 text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-2.5 py-1 rounded cursor-pointer transition"
                >
                  {copiedId === "report" ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedId === "report" ? "Скопировано!" : "Копировать текст"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Report Markdown Viewer */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#07090e]">
            {activeReport ? (
              <div className="space-y-4 max-w-4xl mx-auto">
                {/* Meta info tags */}
                <div className="flex flex-wrap items-center gap-2 text-xs pb-3 border-b border-gray-800">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 text-gray-300">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    <span>Триггер: <b>{activeReport.triggerType}</b></span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 text-gray-300">
                    <Layers className="h-3.5 w-3.5 text-cyan-400" />
                    <span>ТФ: <b>{activeReport.timeframes.join(" • ")}</b></span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 text-gray-300">
                    <Bot className="h-3.5 w-3.5 text-purple-400" />
                    <span>Модель: <b>{activeReport.modelUsed}</b></span>
                  </div>
                  {activeReport.chartSourceUsed && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-900 border border-amber-500/30 text-amber-300">
                      <Activity className="h-3.5 w-3.5 text-amber-400" />
                      <span>Источник: <b>{
                        activeReport.chartSourceUsed === "standalone_engine" 
                          ? "Встроенный S&T Движок (Вариант 2)" 
                          : activeReport.chartSourceUsed === "tradingview_link"
                          ? "TradingView Ссылка (Вариант 1)"
                          : "Ручной скриншот"
                      }</b></span>
                    </div>
                  )}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                    activeReport.telegramDelivered 
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" 
                      : "bg-gray-900 text-gray-500 border-gray-800"
                  }`}>
                    <Send className="h-3.5 w-3.5" />
                    <span>{activeReport.telegramDelivered ? "Доставлено в Telegram ✅" : "Только веб-панель"}</span>
                  </div>
                </div>

                {/* Standalone Chart Snapshot (Option 2) */}
                {activeReport.chartSnapshotSvg && (
                  <div className="rounded-xl overflow-hidden border border-cyan-500/30 bg-black/80 p-2.5 shadow-2xl">
                    <div className="flex items-center justify-between px-2 pb-1.5 mb-1.5 border-b border-gray-800 text-[11px]">
                      <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5" />
                        <span>Автономный снимок графика сервера (Встроенный движок S&amp;T SuperFusion)</span>
                      </span>
                      <span className="text-gray-400 font-mono text-[10px]">15m • 1H • 4H SMC Overlays</span>
                    </div>
                    <div 
                      className="w-full overflow-x-auto flex justify-center py-1"
                      dangerouslySetInnerHTML={{ __html: activeReport.chartSnapshotSvg }}
                    />
                  </div>
                )}

                {/* Markdown text */}
                <div className="prose prose-invert prose-sm max-w-none text-gray-200 leading-relaxed font-sans space-y-3">
                  <ReactMarkdown>{activeReport.reportText}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                <Coins className="h-12 w-12 text-gray-700 mb-3" />
                <p className="text-sm font-semibold text-gray-400">Отчет еще не сгенерирован</p>
                <p className="text-xs text-gray-600 mt-1 max-w-md">
                  Нажмите кнопку <b>«Сгенерировать План Сейчас»</b> или дождитесь автоматического расписания (09:00 и 15:00 МСК).
                </p>
              </div>
            )}
          </div>

          {/* Past reports archive bar */}
          {reports.length > 1 && (
            <div className="bg-[#0b0f19] border-t border-gray-800 px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0 text-xs">
              <span className="text-gray-400 font-semibold shrink-0">История:</span>
              {reports.map((rep) => (
                <button
                  key={rep.id}
                  onClick={() => setActiveReport(rep)}
                  className={`px-2.5 py-1 rounded-lg shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
                    activeReport?.id === rep.id
                      ? "bg-amber-600 text-white font-bold"
                      : "bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-800"
                  }`}
                >
                  <span>{new Date(rep.timestamp).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="text-[10px] opacity-75">({rep.triggerType.replace("SCHEDULED_", "")})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: SETTINGS, MACRO NEWS TRIGGER & PROMPT (40%) */}
        <div className="w-full lg:w-[480px] flex flex-col bg-[#090d16] overflow-y-auto p-4 md:p-5 space-y-5 shrink-0">
          
          {/* ⚡ SECTION 1: QUICK MACRO NEWS DISPATCH & TRIGGER */}
          <div className="p-4 bg-gradient-to-r from-red-950/30 via-amber-950/20 to-gray-900 border border-amber-500/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-orange-400" />
                <span>Опубликовать Важное Макро-Событие</span>
              </span>
              <span className="text-[10px] text-orange-300 bg-orange-500/10 px-2 py-0.5 rounded font-mono">
                Внеплановый анализ
              </span>
            </div>

            <p className="text-[11px] text-gray-400 leading-snug">
              При выходе данных по инфляции CPI/PPI, ставке ФРС или новостей система мгновенно пересчитает план и отправит в Telegram.
            </p>

            <div className="space-y-2">
              <input
                type="text"
                value={newNewsTitle}
                onChange={(e) => setNewNewsTitle(e.target.value)}
                placeholder="Например: Инфляция США (CPI) выше прогноза 3.2% против 2.9%"
                className="w-full bg-black/60 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-medium"
              />

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-gray-400 block mb-1 text-[11px]">Важность:</label>
                  <select
                    value={newNewsImpact}
                    onChange={(e) => setNewNewsImpact(e.target.value as any)}
                    className="w-full bg-black/60 border border-gray-700 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    <option value="CRITICAL">🔴 КРИТИЧЕСКАЯ</option>
                    <option value="HIGH">🟠 ВЫСОКАЯ</option>
                    <option value="MEDIUM">🟡 СРЕДНЯЯ</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 text-[11px]">Категория:</label>
                  <select
                    value={newNewsCategory}
                    onChange={(e) => setNewNewsCategory(e.target.value as any)}
                    className="w-full bg-black/60 border border-gray-700 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    <option value="INFLATION">Инфляция (CPI/PPI)</option>
                    <option value="FED_RATES">ФРС / Ставка</option>
                    <option value="LABOR">Рынок труда / NFP</option>
                    <option value="DXY">Индекс Доллара DXY</option>
                    <option value="GEOPOLITICS">Геополитика</option>
                  </select>
                </div>
              </div>

              <input
                type="text"
                value={newNewsGoldEffect}
                onChange={(e) => setNewNewsGoldEffect(e.target.value)}
                placeholder="Ожидаемое влияние: Давление на доллар -> импульсный лонг XAUUSD"
                className="w-full bg-black/60 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none"
              />

              <button
                type="button"
                onClick={handlePublishNews}
                disabled={isPublishingNews || !newNewsTitle.trim()}
                className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isPublishingNews ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Отправить в Telegram & Запустить ИИ-Аудит</span>
              </button>
            </div>
          </div>

          {/* ⚙️ SECTION 2: SCHEDULE & TIMEFRAME CONFIGURATION */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-cyan-400" />
                <span>Расписание & Таймфреймы</span>
              </span>
              
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <span className={enabled ? "text-emerald-400 font-bold" : "text-gray-500"}>
                  {enabled ? "Активно" : "Пауза"}
                </span>
              </label>
            </div>

            {/* Trading Pair */}
            <div>
              <label className="text-[11px] text-gray-400 block mb-1">Торговая пара / Актив:</label>
              <input
                type="text"
                value={tradingPair}
                onChange={(e) => setTradingPair(e.target.value)}
                className="w-full bg-black/60 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
              <p className="text-[10px] text-gray-500 mt-1">Можно указать любую пару: XAUUSD, BTCUSDT, EURUSD, USDRUB.</p>
            </div>

            {/* Schedule Times */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-gray-400">Время авто-запуска (по МСК):</label>
                <span className="text-[10px] text-cyan-400 font-mono">ПН-ПТ</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {timesMsk.map((t, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-black/70 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold">
                    <span>{t} МСК</span>
                    <button
                      type="button"
                      onClick={() => setTimesMsk(timesMsk.filter((_, i) => i !== idx))}
                      className="text-gray-400 hover:text-red-400 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              {/* Quick Add Times */}
              <div className="flex flex-wrap items-center gap-1.5">
                {["08:30", "09:00", "13:00", "15:00", "15:30", "17:00", "20:00", "21:00"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      if (!timesMsk.includes(t)) {
                        setTimesMsk([...timesMsk, t].sort());
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                      timesMsk.includes(t)
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "bg-gray-800 hover:bg-gray-700 text-gray-400"
                    }`}
                  >
                    +{t}
                  </button>
                ))}
              </div>
            </div>

            {/* Multi-Timeframes Selector */}
            <div>
              <label className="text-[11px] text-gray-400 block mb-1.5">Таймфреймы анализа скриншотов:</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {timeframes.map((tf) => (
                  <span key={tf} className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
                    <span>{tf}</span>
                    <button
                      type="button"
                      onClick={() => removeTimeframe(tf)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                {["5m", "15m", "30m", "1h", "4h", "1D"].map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => addTimeframe(tf)}
                    className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-mono transition"
                  >
                    +{tf}
                  </button>
                ))}
              </div>
            </div>

            {/* 📅 SECTION 2.2: INTERACTIVE CALENDAR SLOTS */}
            <div className="pt-2 border-t border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-amber-400" />
                  <span>Календарные сессии по дням недели:</span>
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {calendarSlots.filter(s => s.enabled).length} активных
                </span>
              </div>

              {/* Slots List */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 mb-2">
                {calendarSlots.map((slot) => {
                  const dayLabel = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"][slot.dayOfWeek] || "ДЕНЬ";
                  return (
                    <div
                      key={slot.id}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition ${
                        slot.enabled
                          ? "bg-black/60 border-amber-500/30 text-gray-200"
                          : "bg-black/30 border-gray-800 text-gray-500 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleSlot(slot.id)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            slot.enabled ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-gray-800 text-gray-500"
                          }`}
                        >
                          {dayLabel} {slot.timeMsk}
                        </button>
                        <span className="truncate text-[11px]">{slot.label}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(slot.id)}
                        className="text-gray-500 hover:text-red-400 ml-2 cursor-pointer p-0.5"
                        title="Удалить слот"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add New Slot form */}
              <div className="p-2 rounded-lg bg-black/40 border border-gray-800 space-y-2">
                <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">
                  + Добавить свое время отправки:
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <select
                    value={newSlotDay}
                    onChange={(e) => setNewSlotDay(parseInt(e.target.value, 10))}
                    className="bg-black/80 border border-gray-700 rounded px-2 py-1 text-white text-[11px]"
                  >
                    <option value={1}>ПН (Понедельник)</option>
                    <option value={2}>ВТ (Вторник)</option>
                    <option value={3}>СР (Среда)</option>
                    <option value={4}>ЧТ (Четверг)</option>
                    <option value={5}>ПТ (Пятница)</option>
                  </select>

                  <input
                    type="time"
                    value={newSlotTime}
                    onChange={(e) => setNewSlotTime(e.target.value)}
                    className="bg-black/80 border border-gray-700 rounded px-2 py-1 text-white font-mono text-[11px]"
                  />

                  <input
                    type="text"
                    value={newSlotLabel}
                    onChange={(e) => setNewSlotLabel(e.target.value)}
                    placeholder="Название сетапа"
                    className="bg-black/80 border border-gray-700 rounded px-2 py-1 text-white text-[11px]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCalendarSlot}
                  className="w-full py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-200 text-[11px] font-bold transition cursor-pointer"
                >
                  + Сохранить этот слот в расписание
                </button>
              </div>
            </div>

            {/* Model & Telegram Tokens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-gray-400 block mb-1 text-[11px]">Модель DeepSeek:</label>
                <select
                  value={deepSeekModel}
                  onChange={(e) => setDeepSeekModel(e.target.value as any)}
                  className="w-full bg-black/60 border border-gray-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                >
                  <option value="deepseek-chat">deepseek-chat (V3)</option>
                  <option value="deepseek-reasoner">deepseek-reasoner (R1)</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 text-[11px]">Telegram Chat ID:</label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="@канал или 12345678"
                  className="w-full bg-black/60 border border-gray-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                />
              </div>
            </div>

            {/* DeepSeek API Key update */}
            <div>
              <label className="text-[11px] text-gray-400 block mb-1">
                DeepSeek API Key (из platform.deepseek.com):
              </label>
              <input
                type="password"
                value={deepSeekApiKey}
                onChange={(e) => setDeepSeekApiKey(e.target.value)}
                placeholder={config?.deepSeekApiKeyMasked || "sk-..."}
                className="w-full bg-black/60 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* 📸 SECTION 2.5: STRICT CHART & INDICATOR SOURCE SELECTION */}
          <div className="bg-gradient-to-r from-blue-950/40 via-cyan-950/20 to-gray-900 border border-cyan-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="h-4 w-4 text-cyan-400" />
                <span>Источник Графика &amp; Индикаторов (Строго 1 на выбор):</span>
              </span>
            </div>

            {/* Three Mutually Exclusive Source Options */}
            <div className="space-y-2">
              {/* Option 1: TradingView Shared Link */}
              <div 
                onClick={() => setChartSourceMode("tradingview_link")}
                className={`p-3 rounded-lg border transition cursor-pointer ${
                  chartSourceMode === "tradingview_link"
                    ? "bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-950/50"
                    : "bg-black/50 border-gray-800 hover:border-gray-700 opacity-75"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="chartSourceMode"
                      checked={chartSourceMode === "tradingview_link"}
                      onChange={() => setChartSourceMode("tradingview_link")}
                      className="text-cyan-500 focus:ring-0"
                    />
                    <span className="text-xs font-bold text-cyan-300">
                      Вариант 1: Ссылка на сохраненный график TradingView (Sharing ON)
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                    Без подписки
                  </span>
                </div>

                <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">
                  TradingView бесплатно позволяет поделиться макетом графика с вашим наложенным индикатором. Сервер открывает эту прямую ссылку, делает снимок и считывает уровни.
                </p>

                {chartSourceMode === "tradingview_link" && (
                  <div className="space-y-2.5 pt-2 border-t border-cyan-500/20 text-xs">
                    <div>
                      <label className="text-[11px] text-gray-300 block mb-1 font-medium">
                        URL вашего макета TradingView (с включенным доступом по ссылке):
                      </label>
                      <input
                        type="text"
                        value={tradingViewChartUrl}
                        onChange={(e) => setTradingViewChartUrl(e.target.value)}
                        placeholder="https://ru.tradingview.com/chart/ВАШ_ХЭШ/"
                        className="w-full bg-black/80 border border-cyan-500/40 rounded px-2.5 py-1.5 text-white font-mono text-[11px]"
                      />
                    </div>

                    {/* Timeframe Mode Selector */}
                    <div>
                      <label className="text-[11px] text-gray-300 block mb-1 font-medium">
                        Режим отображения таймфреймов:
                      </label>
                      <select
                        value={tradingViewTimeframeMode}
                        onChange={(e) => setTradingViewTimeframeMode(e.target.value as any)}
                        className="w-full bg-black/80 border border-gray-700 rounded px-2 py-1 text-white text-[11px]"
                      >
                        <option value="single_layout">Единый макет (Как сохранен в TradingView)</option>
                        <option value="multi_window">Мульти-окна (Сплит 15m + 1h на одном экране TradingView)</option>
                        <option value="per_timeframe">Раздельные ссылки для каждого таймфрейма (15m, 1h, 4h)</option>
                        <option value="auto_query_param">Авто-подстановка интервала (?interval=15 / ?interval=60)</option>
                      </select>
                    </div>

                    {/* If per_timeframe chosen: extra inputs */}
                    {tradingViewTimeframeMode === "per_timeframe" && (
                      <div className="space-y-1.5 p-2 bg-black/70 rounded border border-gray-800">
                        <span className="text-[10px] text-gray-400 block font-medium">Ссылки по таймфреймам:</span>
                        <input
                          type="text"
                          value={tvUrl15m}
                          onChange={(e) => setTvUrl15m(e.target.value)}
                          placeholder="Ссылка для 15m (https://...)"
                          className="w-full bg-black border border-gray-700 rounded px-2 py-1 text-white font-mono text-[10px]"
                        />
                        <input
                          type="text"
                          value={tvUrl1h}
                          onChange={(e) => setTvUrl1h(e.target.value)}
                          placeholder="Ссылка для 1H (https://...)"
                          className="w-full bg-black border border-gray-700 rounded px-2 py-1 text-white font-mono text-[10px]"
                        />
                        <input
                          type="text"
                          value={tvUrl4h}
                          onChange={(e) => setTvUrl4h(e.target.value)}
                          placeholder="Ссылка для 4H (https://...)"
                          className="w-full bg-black border border-gray-700 rounded px-2 py-1 text-white font-mono text-[10px]"
                        />
                      </div>
                    )}

                    <div className="p-2 rounded bg-cyan-950/40 border border-cyan-800/40 text-[10px] text-cyan-200 leading-snug">
                      💡 <b>Ответ по таймфреймам:</b> TradingView по ссылке открывает именно те окна, которые сохранены в вашем макете. Если у вас открыт сплит из 2-х или 4-х окон (например 15m слева и 1h справа), то на скриншот попадут сразу <b>все таймфреймы одновременно</b>!
                    </div>
                  </div>
                )}
              </div>

              {/* Option 2: Standalone Engine */}
              <div 
                onClick={() => setChartSourceMode("standalone_engine")}
                className={`p-3 rounded-lg border transition cursor-pointer ${
                  chartSourceMode === "standalone_engine"
                    ? "bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-950/50"
                    : "bg-black/50 border-gray-800 hover:border-gray-700 opacity-75"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="chartSourceMode"
                      checked={chartSourceMode === "standalone_engine"}
                      onChange={() => setChartSourceMode("standalone_engine")}
                      className="text-amber-500 focus:ring-0"
                    />
                    <span className="text-xs font-bold text-amber-300">
                      Вариант 2: Встроенный автономный движок S&amp;T Indicator Studio на сервере
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                    100% Автономно
                  </span>
                </div>

                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Сервер <b>вообще не обращается к TradingView</b>. Вся математика индикатора S&amp;T v6 (Кумулятивная дельта CVD, Лоренцевский ML-сигнал, свипы Азиатской сессии, Order Blocks, FVG, а также <b>опционные уровни GEX: Call Wall, Put Wall, Zero-Gamma Flip, Max Pain</b>) рассчитывается непосредственно сервером, формируя точный отчет и SVG-график.
                </p>

                {chartSourceMode === "standalone_engine" && (
                  <div className="mt-2 pt-2 border-t border-amber-500/20 flex items-center justify-between">
                    <span className="text-[11px] text-amber-200">
                      ✓ Графический снимок и уровни генерируются локально
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowStandaloneSvgPreview(!showStandaloneSvgPreview);
                      }}
                      className="px-2.5 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-200 text-[10px] font-bold transition cursor-pointer"
                    >
                      {showStandaloneSvgPreview ? "Скрыть предпросмотр" : "Предпросмотр графика движка"}
                    </button>
                  </div>
                )}

                {/* Inline SVG Preview for Standalone engine */}
                {chartSourceMode === "standalone_engine" && showStandaloneSvgPreview && (
                  <div className="mt-2 p-2 bg-black rounded-lg border border-amber-500/30">
                    <img 
                      src={`/api/gold/standalone-chart-svg?pair=${encodeURIComponent(tradingPair)}&t=${Date.now()}`} 
                      alt="Standalone S&T Chart"
                      className="w-full rounded"
                    />
                  </div>
                )}
              </div>

              {/* Option 3: Manual Paste */}
              <div 
                onClick={() => setChartSourceMode("manual_paste")}
                className={`p-3 rounded-lg border transition cursor-pointer ${
                  chartSourceMode === "manual_paste"
                    ? "bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-950/50"
                    : "bg-black/50 border-gray-800 hover:border-gray-700 opacity-75"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="chartSourceMode"
                    checked={chartSourceMode === "manual_paste"}
                    onChange={() => setChartSourceMode("manual_paste")}
                    className="text-purple-500 focus:ring-0"
                  />
                  <span className="text-xs font-bold text-purple-300">
                    Вариант 3: Только ручной режим (Вставка по Ctrl+V)
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  Автоматические снимки отключены. Анализ выполняется только когда вы вставляете скриншот графика во вкладке «ИИ Скриншот-Аудит».
                </p>
              </div>
            </div>
          </div>

          {/* 🎛️ SECTION 2.6: INDEPENDENT TOGGLE SWITCHES (ALL FEATURES CAN BE DISABLED) */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-emerald-400" />
                <span>Управление функциями (Включение / Отключение):</span>
              </span>
              <span className="text-[10px] text-gray-400">Изолированное отключение</span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Toggle 1: Auto Screenshots */}
              <label className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-gray-800 hover:border-gray-700 cursor-pointer">
                <div>
                  <span className="font-semibold text-gray-200 block">Автоматические скриншоты графика</span>
                  <span className="text-[10px] text-gray-500">Снятие снимка в заданные часы по расписанию</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoScreenshotsEnabled}
                  onChange={(e) => setAutoScreenshotsEnabled(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-0 h-4 w-4"
                />
              </label>

              {/* Toggle 2: Telegram Dispatch */}
              <label className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-gray-800 hover:border-gray-700 cursor-pointer">
                <div>
                  <span className="font-semibold text-gray-200 block">Отправка отчетов в Telegram</span>
                  <span className="text-[10px] text-gray-500">Доставка готового торгового плана в ваш бот/канал</span>
                </div>
                <input
                  type="checkbox"
                  checked={telegramEnabled}
                  onChange={(e) => setTelegramEnabled(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-0 h-4 w-4"
                />
              </label>

              {/* Toggle 3: Telegram Photos */}
              <label className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-gray-800 hover:border-gray-700 cursor-pointer">
                <div>
                  <span className="font-semibold text-gray-200 block">Прикреплять изображение графика в Telegram</span>
                  <span className="text-[10px] text-gray-500">Отправка фото вместе с текстовым отчетом</span>
                </div>
                <input
                  type="checkbox"
                  checked={telegramSendPhotos}
                  onChange={(e) => setTelegramSendPhotos(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-0 h-4 w-4"
                />
              </label>

              {/* Toggle 4: Calendar Slots */}
              <label className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-gray-800 hover:border-gray-700 cursor-pointer">
                <div>
                  <span className="font-semibold text-gray-200 block">Календарные сессии (ПН-ПТ)</span>
                  <span className="text-[10px] text-gray-500">Запуск по дням недели и фиксированным часам</span>
                </div>
                <input
                  type="checkbox"
                  checked={scheduleCalendarEnabled}
                  onChange={(e) => setScheduleCalendarEnabled(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-0 h-4 w-4"
                />
              </label>

              {/* Toggle 5: Macro News Auto-Trigger */}
              <label className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-gray-800 hover:border-gray-700 cursor-pointer">
                <div>
                  <span className="font-semibold text-gray-200 block">Авто-аудит при выходе макро-новостей США</span>
                  <span className="text-[10px] text-gray-500">Внеплановый анализ при публикациях CPI, NFP, речей ФРС</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoTriggerOnNews}
                  onChange={(e) => setAutoTriggerOnNews(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-0 h-4 w-4"
                />
              </label>

              {/* Toggle 6: DXY Correlation */}
              <label className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-gray-800 hover:border-gray-700 cursor-pointer">
                <div>
                  <span className="font-semibold text-gray-200 block">Учет индекса доллара (DXY) и доходностей</span>
                  <span className="text-[10px] text-gray-500">Включение макроэкономического анализа DXY в торговый план</span>
                </div>
                <input
                  type="checkbox"
                  checked={dxyCorrelationFilter}
                  onChange={(e) => setDxyCorrelationFilter(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-0 h-4 w-4"
                />
              </label>
            </div>
          </div>

          {/* 👥 SECTION 2.7: MULTI-USER TELEGRAM SUBSCRIBERS & ADMIN APPROVAL */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/20 to-gray-900 border border-emerald-500/40 rounded-xl p-4 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2.5">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Многопользовательский бот &amp; Белый список (White-List)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  Всего: {subscribers.length}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(true)}
                  className="px-2 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <UserPlus className="h-3 w-3" />
                  <span>+ Добавить</span>
                </button>
              </div>
            </div>

            {/* Strict Approval Toggle */}
            <div className="p-2.5 bg-black/60 rounded-lg border border-emerald-500/20 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Только я подтверждаю доступ новым пользователям</span>
                </div>
                <p className="text-[10px] text-gray-400 leading-snug mt-0.5">
                  При включении: когда новый человек нажимает <code className="text-emerald-400">/start</code> в боте, бот не шлет ему отчеты, а отправляет заявку вам.
                </p>
              </div>
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => handleToggleApprovalMode(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-0 h-4 w-4"
              />
            </div>

            {/* How it works info banner */}
            <div className="p-3 bg-gray-950/80 rounded-lg border border-gray-800 space-y-2 text-[11px] text-gray-300">
              <span className="font-bold text-amber-300 flex items-center gap-1">
                💡 Как предоставить доступ другим людям (2 надежных пути):
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 rounded bg-black/40 border border-gray-800">
                  <span className="font-bold text-cyan-300 block mb-0.5">Способ 1: Прямо через этого бота (Личные сообщения)</span>
                  1. Отправьте ссылку на вашего бота человеку.<br />
                  2. Человек открывает бота и нажимает <code className="text-emerald-300">/start</code>.<br />
                  3. Ему пишется «Заявка ожидает подтверждения».<br />
                  4. Вам в Telegram приходит уведомление с командой <code className="text-emerald-300">/approve_ID</code>, либо вы нажимаете <b>«Одобрить»</b> в таблице ниже.
                </div>
                <div className="p-2 rounded bg-black/40 border border-gray-800">
                  <span className="font-bold text-purple-300 block mb-0.5">Способ 2: Закрытый Telegram-канал с одобрением</span>
                  1. Создайте приватный канал/группу в Telegram.<br />
                  2. Добавьте бота администратором.<br />
                  3. В настройках канала: «Ссылки» → «Включить заявки на вступление».<br />
                  4. В поле «Telegram Chat ID» укажите ID канала. Вы лично в приложении Telegram одобряете вступление!
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setSubscriberFilter("ALL")}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${subscriberFilter === "ALL" ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400"}`}
                >
                  Все ({subscribers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSubscriberFilter("PENDING")}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${subscriberFilter === "PENDING" ? "bg-amber-600 text-white" : "bg-gray-800 text-gray-400"}`}
                >
                  ⏳ Заявки ({subscribers.filter(s => s.status === "pending").length})
                </button>
                <button
                  type="button"
                  onClick={() => setSubscriberFilter("APPROVED")}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${subscriberFilter === "APPROVED" ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400"}`}
                >
                  🟢 Одобрены ({subscribers.filter(s => s.status === "approved").length})
                </button>
                <button
                  type="button"
                  onClick={() => setSubscriberFilter("BLOCKED")}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${subscriberFilter === "BLOCKED" ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400"}`}
                >
                  🔴 Заблокированы ({subscribers.filter(s => s.status === "blocked").length})
                </button>
              </div>
              <button
                type="button"
                onClick={fetchSubscribers}
                className="text-gray-400 hover:text-white text-[10px] flex items-center gap-1 transition cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Обновить</span>
              </button>
            </div>

            {/* Modal for manual adding */}
            {showAddUserModal && (
              <div className="p-3 bg-black/90 border border-emerald-500/40 rounded-lg space-y-2">
                <span className="text-xs font-bold text-emerald-300 block">Добавить пользователя вручную (Одобрен сразу):</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <input
                    type="text"
                    value={manualChatId}
                    onChange={(e) => setManualChatId(e.target.value)}
                    placeholder="Telegram Chat ID (число)*"
                    className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-[11px]"
                  />
                  <input
                    type="text"
                    value={manualUsername}
                    onChange={(e) => setManualUsername(e.target.value)}
                    placeholder="@username (опционально)"
                    className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-[11px]"
                  />
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Имя или заметка"
                    className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-[11px]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] transition cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleAddManualSubscriber}
                    className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition cursor-pointer"
                  >
                    Сохранить и выдать доступ
                  </button>
                </div>
              </div>
            )}

            {/* Subscribers List */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {subscribers
                .filter(s => subscriberFilter === "ALL" ? true : s.status === subscriberFilter.toLowerCase())
                .map(sub => (
                  <div key={sub.chatId} className="p-2.5 rounded-lg bg-black/60 border border-gray-800 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white truncate">
                          {sub.firstName || "Пользователь"}
                        </span>
                        {sub.username && (
                          <span className="text-[10px] text-cyan-400 font-mono">@{sub.username}</span>
                        )}
                        {sub.role === "admin" && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40">
                            Администратор
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono flex items-center gap-2">
                        <span>ID: {sub.chatId}</span>
                        <span>•</span>
                        <span className={
                          sub.status === "approved" ? "text-emerald-400 font-bold" :
                          sub.status === "pending" ? "text-amber-400 font-bold" : "text-red-400 font-bold"
                        }>
                          {sub.status === "approved" ? "🟢 Одобрен (Получает отчеты)" :
                           sub.status === "pending" ? "⏳ Ожидает подтверждения" : "🔴 Заблокирован"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {sub.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => handleSubscriberAction(sub.chatId, "approve")}
                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <UserCheck className="h-3 w-3" />
                          <span>Одобрить</span>
                        </button>
                      )}
                      {sub.status === "approved" && sub.role !== "admin" && (
                        <button
                          type="button"
                          onClick={() => handleSubscriberAction(sub.chatId, "block")}
                          className="px-2 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 text-[10px] transition flex items-center gap-1 cursor-pointer"
                        >
                          <UserX className="h-3 w-3" />
                          <span>Заблокировать</span>
                        </button>
                      )}
                      {sub.status === "blocked" && (
                        <button
                          type="button"
                          onClick={() => handleSubscriberAction(sub.chatId, "approve")}
                          className="px-2 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <UserCheck className="h-3 w-3" />
                          <span>Разблокировать</span>
                        </button>
                      )}
                      {sub.role !== "admin" && (
                        <button
                          type="button"
                          onClick={() => handleSubscriberAction(sub.chatId, "delete")}
                          className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition cursor-pointer"
                          title="Удалить из списка"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

              {subscribers.length === 0 && (
                <div className="p-4 text-center text-gray-500 text-xs">
                  Пока нет подписчиков. Пользователи появятся здесь сразу, как только напишут /start в вашего Telegram-бота.
                </div>
              )}
            </div>
          </div>

          {/* 📝 SECTION 3: PROMPT TEMPLATE EDITOR */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-purple-400" />
                <span>Шаблон Промта DeepSeek</span>
              </span>
              <span className="text-[10px] text-purple-300 font-mono">
                {`{trading_pair}, {timeframes}, {chart_data}, {news_events}`}
              </span>
            </div>

            {/* Prompt Presets for Intraday Traders */}
            <div>
              <label className="text-[11px] text-gray-400 block mb-1.5 font-medium">Готовые пресеты промта:</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setPromptTemplate(`Ты — ведущий quantitative-трейдер по золоту (XAUUSD), специализирующийся на сессионной ликвидности (London / NY Killzones), концепциях Smart Money (SMC / ICT), Volume Profile и поведении маркетмейкеров.

Проведи глубокий интрадей-анализ золота ({trading_pair}) на таймфреймах {timeframes} с учетом индикатора S&T SuperFusion / Super Indicator v6, текущей динамики индекса доллара (DXY) и макроэкономического календаря США.

Входные данные графика:
{chart_data}

Макро-события и новости дня:
{news_events}

Сформируй четкий, бескомпромиссный торговый план:
1. 🏛️ МАКРОЭКОНОМИКА И DXY: динамика доллара, ключевые окна выхода статистики (15:30 / 17:00 / 21:00 МСК), фундаментальный уклон (Bullish/Bearish).
2. 📊 СТРУКТУРА ЛИКВИДНОСТИ (SMC): свип азиатского диапазона (Asian High/Low), уровни PDH/PDL, зоны Order Block, FVG, статус индикатора S&T (CVD дельта + ML).
3. 🏛️ ОПЦИОННЫЙ ПРОФИЛЬ GEX (CME): режим (+GAMMA / -GAMMA), Call Wall (потолок дилеров), Put Wall (пол дилеров), Zero-Gamma Flip и Max Pain Strike.
4. 🎯 ИНТРАДЕЙ ТОРГОВЫЙ ПЛАН:
   - Сетап: LONG или SHORT
   - Точка входа (Entry Zone) с подтверждением закрытием свечи 15m
   - Защитный Stop Loss (SL) с запасом от рыночных шпилек и опорой на Put Wall
   - Цели: TP1 (50% объема + перевод в безубыток), TP2 (пул ликвидности / Call Wall), TP3 (HTF Runner)
   - Соотношение Risk/Reward (минимум 1:2.5)
5. 🛡️ УСЛОВИЯ ОТМЕНЫ (INVALIDATION) И ПЛАН Б: цена закрытия свечи, отменяющая сетап, и план разворота.
6. ⚡ РИСК-МЕНЕДЖМЕНТ: 1-1.5% риска, перевод в БУ за 5 минут до новостей США.`)}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 text-[11px] font-medium transition cursor-pointer"
                >
                  ⚡ Интрадей SMC + GEX
                </button>

                <button
                  type="button"
                  onClick={() => setPromptTemplate(`Ты — ведущий опционный стратег CME и аналитик дилерской гаммы (GEX).
Проведи глубокий аудит инструмента {trading_pair} на таймфреймах {timeframes} с фокусом на профиль Gamma Exposure.

Входные данные:
{chart_data}

Макро-события:
{news_events}

Дай детальный анализ распределения открытого интереса и гаммы маркетмейкеров:
1. 🏛️ ОПЦИОННЫЕ СТЕНЫ ДИЛЕРОВ:
   - Call Wall: точный ценовой потолок и готовность дилеров гасить лонги продажами фьючерсов
   - Put Wall: институциональный пол и уровень защиты от падения
   - Zero-Gamma Flip Level: граница перехода в режим взрывной волатильности
   - Max Pain Pinning Target: гравитационный уровень экспирации
2. ⚡ ОЦЕНКА РЕЖИМА ГАММЫ:
   - Рынок в +GAMMA (сжатие волатильности, отскоки от стен) или в -GAMMA (взрывной трендовый импульс, пробой уровней)
3. 🎯 СИНХРОНИЗАЦИЯ С SMC & ТОРГОВЫЙ ПЛАН:
   - Согласованность точек входа и стоп-лосса с опционными стенами
   - Цели Take Profit с учетом зон фиксации институциональных позиций.`)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 text-[11px] font-medium transition cursor-pointer font-bold"
                >
                  🏰 Опционные Стены GEX (CME)
                </button>

                <button
                  type="button"
                  onClick={() => setPromptTemplate(`Ты — агрессивный скальпер и специалист по волатильности золота (XAUUSD).
Проанализируй инструмент {trading_pair} на младших таймфреймах {timeframes}.

Входные данные графика:
{chart_data}

Новости дня:
{news_events}

Дай быстрый план скальпинга на текущие 2-4 часа:
1. Текущий импульс и кумулятивная дельта (CVD) индикатора S&T: доминируют ли рыночные покупки или продажи.
2. Ближайшие пулы ликвидности на снятие (Equal Highs / Equal Lows).
3. Точная точка входа на ретесте локального FVG (15m/5m).
4. Короткий стоп-лосс за экстремум импульсной свечи.
5. Быстрый тейк-профит (15-35 пунктов по золоту).`)}
                  className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/30 text-[11px] font-medium transition cursor-pointer"
                >
                  🎯 Скальп / Быстрый Импульс
                </button>

                <button
                  type="button"
                  onClick={() => setPromptTemplate(`Ты — макро-стратег сырьевого рынка. Проведи глубокий фундаментально-технический аудит золота {trading_pair} на таймфреймах {timeframes} в преддверии ключевых новостей США.

Входные данные:
{chart_data}

Новости дня:
{news_events}

Подготовь двухсторонний сценарий («Если данные лучше прогноза» / «Если данные хуже прогноза») с точными уровнями цен для выставления лимитных заявок или входа на тесте зон после первичной рыночной шпильки.`)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-[11px] font-medium transition cursor-pointer"
                >
                  📊 Макро Новости (CPI/NFP)
                </button>
              </div>
            </div>

            <textarea
              rows={9}
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              className="w-full bg-black/60 border border-gray-700 rounded-lg p-3 text-xs text-gray-200 font-mono leading-relaxed focus:outline-none focus:border-purple-500"
            />

            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{isSaving ? "Сохранение..." : "Сохранить Настройки & Промт"}</span>
            </button>
          </div>

          {/* 📢 SECTION 4: LIVE NEWS CALENDAR STREAM */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-emerald-400" />
              <span>Лента Макро-Факторов Золота</span>
            </span>

            <div className="space-y-2 text-xs">
              {news.map((item) => (
                <div key={item.id} className="p-2.5 rounded-lg bg-black/50 border border-gray-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{item.title}</span>
                    <span className="text-[10px] text-amber-300 font-mono">{item.time}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-snug">{item.summary}</p>
                  <div className="text-[10px] text-emerald-400 font-medium">
                    ⚡ {item.goldEffect}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
