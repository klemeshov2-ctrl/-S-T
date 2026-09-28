import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  Trash2, 
  RefreshCw, 
  Send, 
  HelpCircle, 
  TrendingUp, 
  AlertTriangle, 
  Zap, 
  Target, 
  ShieldCheck, 
  Maximize2, 
  X, 
  Layers,
  ArrowRight,
  FileText,
  Sliders,
  CheckCircle2,
  Clock,
  Compass,
  Globe,
  Calendar,
  Flame,
  ChevronDown,
  ChevronUp,
  Info,
  Scale
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  mode?: "detailed" | "audit" | "short";
  isSimulated?: boolean;
  notice?: string;
}

interface SavedScreenshot {
  id: string;
  name: string;
  dataUrl: string;
  mimeType: string;
  timestamp: string;
  messages: ChatMessage[];
}

export const AiScreenshotInspector: React.FC = () => {
  const [screenshots, setScreenshots] = useState<SavedScreenshot[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Step 1: Mode
  const [analysisMode, setAnalysisMode] = useState<"detailed" | "audit" | "short">("audit");
  // Step 2: Custom Question
  const [userQuestion, setUserQuestion] = useState("");
  // Macro events integration
  const [includeMacro, setIncludeMacro] = useState<boolean>(true);
  const [macroData, setMacroData] = useState<any>(null);
  const [showMacroInfo, setShowMacroInfo] = useState<boolean>(false);
  // Additional external market data from trader (optional)
  const [additionalData, setAdditionalData] = useState("");
  const [showAdditionalData, setShowAdditionalData] = useState(false);
  // Follow-up question in existing chat
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("ИИ изучает изображение графика...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultBottomRef = useRef<HTMLDivElement>(null);

  const currentScreenshot = screenshots.find((s) => s.id === activeId) || null;

  // Load live macro calendar context on component mount
  useEffect(() => {
    fetch("/api/macro-calendar")
      .then(async (res) => {
        const ct = res.headers.get("content-type") || "";
        if (res.ok && ct.includes("application/json")) {
          const data = await res.json();
          setMacroData(data);
        }
      })
      .catch((err) => console.warn("Notice loading macro calendar:", err));
  }, []);

  // Auto-scroll when new message appears
  useEffect(() => {
    if (currentScreenshot?.messages && currentScreenshot.messages.length > 0) {
      resultBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentScreenshot?.messages?.length, isLoading]);

  // Global paste handler (Ctrl+V) anywhere on the page
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file, `Скриншот (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [screenshots.length]);

  // Optimize and scale down ultra-large images to ensure instantaneous upload
  const resizeImageIfNeeded = (dataUrl: string, maxWidth = 2560): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.width <= maxWidth && img.height <= maxWidth) {
          resolve(dataUrl);
          return;
        }
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.92));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const processFile = (file: File, customName?: string) => {
    if (!file.type.startsWith("image/")) {
      alert("Пожалуйста, загрузите изображение (PNG, JPG, WEBP).");
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawDataUrl = e.target?.result as string;
      const optimizedDataUrl = await resizeImageIfNeeded(rawDataUrl);

      const newScreenshot: SavedScreenshot = {
        id: Date.now().toString(),
        name: customName || file.name || `График ${screenshots.length + 1}`,
        dataUrl: optimizedDataUrl,
        mimeType: file.type || "image/jpeg",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        messages: []
      };

      setScreenshots((prev) => [newScreenshot, ...prev]);
      setActiveId(newScreenshot.id);
      setUserQuestion("");
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  // Main Action: Trigger Analysis via the prominent button
  const handleRunAnalysis = async (overridePrompt?: string, forceFallback = false) => {
    if (!currentScreenshot || isLoading) return;

    setErrorMessage(null);
    setIsLoading(true);
    setLoadingStatus(
      forceFallback
        ? "Генерация автономного квант-разбора S&T..."
        : (includeMacro ? "Сбор макростатистики США и анализ графика через Gemini 3.8 Flash..." : "Отправка скриншота в Gemini 3.8 Flash...")
    );

    const promptText = (overridePrompt || userQuestion).trim();
    
    // Default prompt if user didn't write anything
    const defaultPrompt = analysisMode === "audit"
      ? (includeMacro
          ? "Проведи глубокий критический ИИ-аудит этого скриншота: индикатор может ошибаться в своих прогнозных линиях. Оцени по другим рыночным данным (старшие ТФ, DXY, объемы, ловушки ликвидности, макростатистика США), правильный ли прогноз рисует индикатор или высока вероятность ошибки? Дай строгую оценку вероятности ошибки в %, опиши возможные ловушки и дай безопасный план действий."
          : "Проведи критический ИИ-аудит этого скриншота: оцени, правильный ли прогноз рисует индикатор или высока вероятность ошибки? Разбери ловушки ликвидности, конфликт таймфреймов и дай оценку надежности.")
      : analysisMode === "short"
      ? (includeMacro 
          ? "Сделай краткий разбор графика с учетом сегодняшней статистики США и ключевых макро-событий: инструмент, ТФ, текущий сетап, уровни входа/стопа/целей, вероятность ошибки индикатора и что делать прямо сейчас."
          : "Сделай краткий и четкий разбор этого графика: инструмент, ТФ, текущий сетап, уровни входа/стопа/целей и что делать прямо сейчас.")
      : (includeMacro
          ? "Проведи подробный профессиональный анализ этого скриншота графика: детально разбери HUD-таблицу (Консенсус 5 ТФ, Тренд, Сетап, WR, Вход/Цели, SL, RSI, ATR), прогнозные линии, уровни ликвидности и SMC структуры. Обязательно дай разбор по сегодняшней статистике США и макро-событиям (CPI/PPI, занятость NFP/Claims, риторика ФРС, DXY), оцени их прямое влияние на актив и дай четкие рекомендации трейдеру по управлению сделкой."
          : "Проведи подробный профессиональный анализ этого скриншота графика: детально разбери HUD-таблицу (Консенсус 5 ТФ, Тренд, Сетап, WR, Вход/Цели, SL, RSI, ATR), прогнозные линии (включая Слом SL/План Б или Откат), уровни ликвидности и SMC структуры, и дай четкие рекомендации трейдеру.");

    const effectivePrompt = promptText.length > 0 ? promptText : defaultPrompt;

    // Add user question to messages list if it was a custom question
    let initialMessages = [...currentScreenshot.messages];
    if (promptText.length > 0) {
      initialMessages.push({
        id: Date.now().toString(),
        role: "user",
        content: promptText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setScreenshots((prev) =>
        prev.map((s) => (s.id === currentScreenshot.id ? { ...s, messages: initialMessages } : s))
      );
    }

    try {
      const statusTimer1 = setTimeout(() => {
        setLoadingStatus(analysisMode === "audit" 
          ? "ИИ перепроверяет прогноз по DXY, старшим ТФ и ликвидности..." 
          : (includeMacro ? "Сопоставление данных графика с календарем США и волатильностью..." : "Распознавание свечей, прогнозных линий и HUD-таблицы..."));
      }, 1500);

      const statusTimer2 = setTimeout(() => {
        setLoadingStatus("Генерация точных рекомендаций и уровней с учетом рисков...");
      }, 3500);

      const response = await fetch("/api/analyze-screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: currentScreenshot.dataUrl,
          mimeType: currentScreenshot.mimeType,
          question: effectivePrompt,
          mode: analysisMode,
          auditMode: analysisMode === "audit",
          additionalData: additionalData,
          includeMacro: includeMacro,
          forceFallback: forceFallback,
          history: initialMessages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      clearTimeout(statusTimer1);
      clearTimeout(statusTimer2);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ошибка запроса к ИИ серверу");
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.analysis || "Не удалось получить ответ.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: analysisMode,
        isSimulated: data.isSimulated,
        notice: data.notice
      };

      setScreenshots((prev) =>
        prev.map((s) =>
          s.id === currentScreenshot.id
            ? { ...s, messages: [...initialMessages, assistantMsg] }
            : s
        )
      );

      // Clear input after sending
      setUserQuestion("");
    } catch (err: any) {
      console.error("Analysis error:", err);
      setErrorMessage(err.message || "Не удалось получить ответ от нейросети");
    } finally {
      setIsLoading(false);
    }
  };

  // Follow-up question submission
  const handleFollowUpQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuestion.trim() || isLoading) return;
    const q = followUpQuestion.trim();
    setFollowUpQuestion("");
    handleRunAnalysis(q);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownloadChat = (screenshot: SavedScreenshot) => {
    const textContent = screenshot.messages
      .map((m) => `[${m.timestamp}] ${m.role === 'user' ? 'ВОПРОС ТРЕЙДЕРА' : 'ИИ АНАЛИЗАТОР S&T'}:\n${m.content}\n\n${'='.repeat(60)}\n`)
      .join('\n');
    
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Анализ_${screenshot.name.replace(/[^a-zA-Zа-яА-Я0-9]/g, "_")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteScreenshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setScreenshots((prev) => prev.filter((s) => s.id !== id));
    if (activeId === id) {
      const remaining = screenshots.filter((s) => s.id !== id);
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const quickPromptChips = [
    { label: "🔬 Ошибается ли индикатор в этом прогнозе?", text: "Индикатор может ошибаться в своих прогнозных линиях. Проведи независимый ИИ-аудит: оцени, правильный ли прогноз нарисован или высока вероятность ошибки? Сверь с DXY, старшими ТФ, ловушками ликвидности и дай вердикт." },
    { label: "⚠️ Риск ложного движения & ловушка", text: "Оцени риск того, что текущий прогноз индикатора является ловушкой маркетмейкера (inducement / сквиз перед новостями). Какова вероятность сноса стопов?" },
    { label: "📊 Оценка вероятности TP vs SL (%)", text: "Дай независимую процентную оценку: какова реальная вероятность достижения TP1/TP2 по сравнению с риском ошибки индикатора и слома SL?" },
    { label: "⚡ Конфликт со старшим ТФ и DXY", text: "Проверь, нет ли конфликта между локальной стрелкой индикатора и трендом старшего ТФ (1Ч/4Ч/1Д) либо поведением индекса доллара DXY." },
    { label: "🇺🇸 Разбор + статистика США", text: "Сделай разбор этого графика с детальным учетом сегодняшней макростатистики США и событий ФРС: какие данные выходят, как они повлияют на цену и сетап S&T." },
    { label: "🥇 Влияние данных США на Золото", text: "Как сегодняшняя статистика США (инфляция, рынок труда, DXY) повлияет на золото (XAUUSD) и текущие прогнозные линии на графике?" },
    { label: "⏰ Когда выходят новости и где стоп?", text: "В какие часы сегодня ожидаются основные всплески волатильности по статистике США (15:30 / 17:00 / 21:00 МСК) и как защитить позицию и стоп-лосс?" },
    { label: "⚡ Почему слом SL / План Б?", text: "Почему график рисует слом стоплоса (План Б), если физического касания уровня SL не было? Разбери причину (структура, CHoCH, свечи)." },
    { label: "🎯 Точка входа, цели и стоп?", text: "Назови точный уровень входа, стоп-лосс и цели (TP1, TP2) со скриншота, а также соотношение риск/прибыль (RR)." },
    { label: "🛡️ Что делать прямо сейчас?", text: "Дай конкретную тактическую рекомендацию для трейдера: безопасно ли входить прямо сейчас, или лучше ждать? Какое действие предпринять?" },
    { label: "📊 Разбор консенсуса 5 ТФ", text: "Детально проанализируй строку Консенсус 5 ТФ [15м, 1Ч, 4Ч, 1Д, 1W] и соотношение старших/младших таймфреймов на скриншоте." },
  ];

  return (
    <div className="h-full flex flex-col bg-[#07090e] text-gray-100 overflow-hidden font-sans">
      
      {/* 🚀 TOP BAR CONTROLS */}
      <div className="bg-[#0b0e17] border-b border-gray-800/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 shadow-md shadow-cyan-500/20 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-white tracking-wide">
                ИИ Анализатор Скриншотов Графика
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Gemini Multimodal Active
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Загрузите скриншот с индикатором S&T — выберите режим, задайте вопрос и нажмите кнопку для получения разбора
            </p>
          </div>
        </div>

        {/* Global Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#131722] hover:bg-gray-800 text-gray-200 hover:text-white text-xs font-semibold rounded-lg border border-gray-700/80 transition-all cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-blue-400" />
            <span>Загрузить новый скриншот</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processFile(file);
              e.target.value = "";
            }}
            accept="image/*"
            className="hidden"
          />
        </div>
      </div>

      {/* 🚀 MAIN SPLIT WORKSPACE */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        
        {/* LEFT COLUMN: SCREENSHOT CARD & GALLERY */}
        <div className="w-full md:w-[360px] lg:w-[400px] bg-[#090c13] border-b md:border-b-0 md:border-r border-gray-800/80 flex flex-col shrink-0 overflow-y-auto">
          
          {/* UPLOAD / DROPZONE */}
          <div className="p-3.5 border-b border-gray-800/60">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                dragOver
                  ? "border-blue-500 bg-blue-500/10 scale-[0.99]"
                  : "border-gray-700/80 hover:border-blue-500/60 bg-[#0d111a] hover:bg-[#111723]"
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Upload className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-200">
                  Перетащите скриншот сюда или кликните
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Вставка из буфера через <kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 font-mono text-[10px] text-amber-300">Ctrl + V</kbd>
                </p>
              </div>
            </div>
          </div>

          {/* ACTIVE SCREENSHOT PREVIEW */}
          {currentScreenshot ? (
            <div className="p-3.5 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-blue-400" />
                  Выбранный скриншот
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setZoomImage(currentScreenshot.dataUrl)}
                    className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition"
                    title="Увеличить скриншот на весь экран"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteScreenshot(currentScreenshot.id, e)}
                    className="p-1 text-gray-400 hover:text-red-400 rounded hover:bg-gray-800 transition"
                    title="Удалить скриншот"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Preview image */}
              <div 
                onClick={() => setZoomImage(currentScreenshot.dataUrl)}
                className="relative rounded-xl overflow-hidden border border-gray-800 group cursor-pointer bg-black/60 shadow-lg"
              >
                <img
                  src={currentScreenshot.dataUrl}
                  alt={currentScreenshot.name}
                  className="w-full max-h-[320px] object-contain mx-auto"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs text-white font-medium">
                  <Maximize2 className="h-4 w-4" />
                  <span>Полноэкранный просмотр</span>
                </div>
              </div>

              {/* Meta */}
              <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400 px-1 font-mono">
                <span className="truncate max-w-[200px]" title={currentScreenshot.name}>
                  {currentScreenshot.name}
                </span>
                <span>{currentScreenshot.timestamp}</span>
              </div>

              {/* GALLERY OF MULTIPLE SCREENSHOTS */}
              {screenshots.length > 1 && (
                <div className="mt-4 pt-3 border-t border-gray-800/60">
                  <p className="text-[11px] font-semibold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    Загруженные скриншоты ({screenshots.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {screenshots.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setActiveId(s.id)}
                        className={`relative rounded-lg overflow-hidden border cursor-pointer group transition-all aspect-video bg-black/50 ${
                          s.id === activeId
                            ? "border-blue-500 ring-2 ring-blue-500/30"
                            : "border-gray-800 hover:border-gray-600 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={s.dataUrl}
                          alt={s.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={(e) => handleDeleteScreenshot(s.id, e)}
                          className="absolute top-1 right-1 p-0.5 bg-black/80 text-gray-400 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center flex-1">
              <ImageIcon className="h-10 w-10 text-gray-700 mb-2.5" />
              <p className="text-xs font-semibold text-gray-400">Скриншот еще не выбран</p>
              <p className="text-[11px] text-gray-500 mt-1 max-w-[200px]">
                Вставьте скриншот из буфера (Ctrl+V) или перетащите файл
              </p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ACTION PANEL & ANALYSIS RESULTS */}
        <div className="flex-1 flex flex-col bg-[#07090e] overflow-hidden min-h-0">
          
          {/* 🎯 ACTION PANEL (steps requested by the user: mode selection + question input + GET ANALYSIS button) */}
          {currentScreenshot && (
            <div className="p-4 bg-[#0d111a] border-b border-gray-800/80 shadow-md shrink-0">
              
              {/* 🇺🇸 STEP 0: MACRO & US ECONOMIC STATS INTEGRATION */}
              <div className="mb-3 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/30 via-blue-950/20 to-[#0d111a] p-2.5 sm:p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white tracking-wide">
                          Ключевые события & Статистика США на сегодня
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                          {macroData?.date ? macroData.date.split(",")[0] : "Сегодня"}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-snug">
                        Инфляция CPI/PPI, безработица NFP/Claims, ставка ФРС, ISM PMI и прямое влияние DXY на сетап
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Toggle button */}
                    <button
                      type="button"
                      onClick={() => setIncludeMacro(!includeMacro)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                        includeMacro
                          ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/30 shadow-sm"
                          : "bg-gray-800/80 border-gray-700 text-gray-400 hover:text-gray-200"
                      }`}
                      title={includeMacro ? "Макро-статистика включена в разбор" : "Включить анализ макро-событий"}
                    >
                      <span className={`w-2 h-2 rounded-full ${includeMacro ? "bg-emerald-400 animate-pulse" : "bg-gray-500"}`}></span>
                      <span>{includeMacro ? "Макро-анализ ВКЛ ✅" : "Выключен ❌"}</span>
                    </button>

                    {/* Expand macro info drawer */}
                    <button
                      type="button"
                      onClick={() => setShowMacroInfo(!showMacroInfo)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#131722] hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700 transition flex items-center gap-1 cursor-pointer"
                      title="Посмотреть расписание выхода данных и тайминг волатильности"
                    >
                      <Calendar className="h-3.5 w-3.5 text-blue-400" />
                      <span className="hidden sm:inline">Календарь дня</span>
                      {showMacroInfo ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                {/* Expandable Macro Details */}
                {showMacroInfo && macroData && (
                  <div className="mt-3 pt-3 border-t border-indigo-500/20 text-xs text-gray-300 space-y-2.5">
                    <div className="p-2.5 rounded-lg bg-black/50 border border-gray-800 flex items-start gap-2">
                      <Flame className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-white">Фокус сегодняшнего дня: </span>
                        <span className="text-gray-300">{macroData.todayFocus}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {macroData.dangerWindows?.map((w: any, idx: number) => (
                        <div key={idx} className="p-2 rounded-lg bg-[#111622] border border-gray-800">
                          <span className="text-[10px] font-mono text-amber-400 block font-bold">{w.time}</span>
                          <span className="text-[11px] text-gray-300 block mt-0.5">{w.title}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[11px] text-gray-400 bg-blue-950/20 border border-blue-900/30 rounded-lg p-2 flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-400 shrink-0" />
                      <span>
                        <b>Влияние на Золото (XAUUSD):</b> Сильные данные США (высокая занятость, упорная инфляция) разгоняют DXY и давят на золото вниз. Слабые данные США (рост заявок безработицы, спад инфляции) запускают ралли золота к верхним целям TP1/TP2.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 1 & 2: MODE SELECTOR & QUESTION FIELD */}
              <div className="space-y-3">
                
                {/* STEP 1: Mode & Data Source selection */}
                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Sliders className="h-3.5 w-3.5 text-blue-400" />
                    <span>Шаг 1: Выберите режим анализа графика & данных</span>
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {/* BUTTON 1: CRITICAL AUDIT & VERIFICATION BY OTHER DATA */}
                    <button
                      type="button"
                      onClick={() => setAnalysisMode("audit")}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer relative ${
                        analysisMode === "audit"
                          ? "bg-purple-950/30 border-purple-500 text-white shadow-md ring-1 ring-purple-500/40"
                          : "bg-[#131722] border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        analysisMode === "audit" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400"
                      }`}>
                        <Scale className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>🔬 ИИ-Аудит (По другим данным)</span>
                          {analysisMode === "audit" && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                          Проверка ошибок индикатора, вероятность TP/SL (%), сверка с DXY, старшими ТФ, объемами и ловушками ликвидности.
                        </p>
                      </div>
                    </button>

                    {/* BUTTON 2: DETAILED TECHNICAL BREAKDOWN */}
                    <button
                      type="button"
                      onClick={() => setAnalysisMode("detailed")}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                        analysisMode === "detailed"
                          ? "bg-blue-600/15 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/30"
                          : "bg-[#131722] border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        analysisMode === "detailed" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"
                      }`}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>📑 Полный разбор графика</span>
                          {analysisMode === "detailed" && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                          Вся таблица HUD (Консенсус 5 ТФ, Тренд, Сетап, WR, Вход/Цели, SL, RSI), прогнозные линии и SMC структуры.
                        </p>
                      </div>
                    </button>

                    {/* BUTTON 3: SHORT & CONCISE */}
                    <button
                      type="button"
                      onClick={() => setAnalysisMode("short")}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                        analysisMode === "short"
                          ? "bg-amber-600/15 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/30"
                          : "bg-[#131722] border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        analysisMode === "short" ? "bg-amber-600 text-white" : "bg-gray-800 text-gray-400"
                      }`}>
                        <Zap className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>⚡ Коротко и по сути</span>
                          {analysisMode === "short" && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                          Краткие тезисы: актив, ТФ, текущий сетап, уровни входа/стопа/целей и конкретное действие прямо сейчас.
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* OPTIONAL STEP 1.5: ADDITIONAL EXTERNAL DATA INPUT */}
                  <div className="mt-2 rounded-xl border border-gray-800/90 bg-[#10141f] p-2 sm:p-2.5">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowAdditionalData(!showAdditionalData)}
                        className="text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                      >
                        <Layers className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Дополнительные данные рынка от трейдера (необязательно)</span>
                        {additionalData && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
                        {showAdditionalData ? <ChevronUp className="h-3.5 w-3.5 text-gray-500" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-500" />}
                      </button>
                      {additionalData && (
                        <button
                          type="button"
                          onClick={() => setAdditionalData("")}
                          className="text-[10px] text-gray-500 hover:text-gray-300 font-mono"
                        >
                          Очистить
                        </button>
                      )}
                    </div>

                    {showAdditionalData && (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-[11px] text-gray-400 leading-snug">
                          Укажите любые внешние данные для глубокой перепроверки индикатора (например: стакан ордеров, открытый интерес, динамику DXY, новости или старший тренд):
                        </p>
                        <input
                          type="text"
                          value={additionalData}
                          onChange={(e) => setAdditionalData(e.target.value)}
                          placeholder="Например: DXY резко пробивает хай 104.2, в стакане крупная лимитная плотность на 2940, открытый интерес падает..."
                          className="w-full bg-[#131722] border border-gray-700/80 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* STEP 2: Custom Question Input & Chips */}
                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
                    <span>Шаг 2: Напишите свой вопрос к графику (или оставьте пустым для общего анализа)</span>
                  </label>

                  <div className="relative">
                    <input
                      type="text"
                      value={userQuestion}
                      onChange={(e) => setUserQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !isLoading) {
                          e.preventDefault();
                          handleRunAnalysis();
                        }
                      }}
                      placeholder="Например: почему нарисован слом SL? где входить? стоит ли сейчас шортить?"
                      className="w-full bg-[#131722] border border-gray-700/80 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                    />
                    {userQuestion && (
                      <button
                        type="button"
                        onClick={() => setUserQuestion("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Preset prompt buttons */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {quickPromptChips.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setUserQuestion(chip.text)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-[#151a26] hover:bg-blue-600/20 hover:border-blue-500/40 border border-gray-800 text-gray-300 hover:text-white transition cursor-pointer font-medium"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* STEP 3: THE PROMINENT ACTION BUTTON */}
                <div className="pt-1 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleRunAnalysis()}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-white" />
                        <span>ИИ анализирует график...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-amber-300 group-hover:rotate-12 transition-transform" />
                        <span>🚀 ПОЛУЧИТЬ РАЗБОР ГРАФИКА</span>
                        <ArrowRight className="h-4 w-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>

                  <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-cyan-400" />
                    <span>Ответ генерируется за 2-4 секунды с распознаванием всех таблиц и свечей</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* 📜 ANALYSIS RESULTS / CHAT AREA */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            
            {/* Case 1: No Screenshot Uploaded Yet */}
            {!currentScreenshot && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 shadow-xl">
                  <Sparkles className="h-8 w-8 animate-pulse" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  ИИ Анализатор Графиков S&T
                </h3>
                <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                  Загрузите скриншот графика из TradingView слева (или нажмите <kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 font-mono text-xs text-amber-300">Ctrl + V</kbd>). После загрузки выберите полный или короткий формат и нажмите кнопку <b>«Получить разбор графика»</b>.
                </p>

                <div className="w-full bg-[#0d111a] border border-gray-800 rounded-xl p-4 text-left space-y-2">
                  <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">
                    ⚡ Что умеет распознавать ИИ:
                  </span>
                  <ul className="text-xs text-gray-400 space-y-1.5 pl-4 list-disc">
                    <li>Всю HUD-таблицу: Консенсус 5 ТФ, Тренд, DXY, Сетап, WR%, Вход, Цели, Стоп-лосс, RSI, ATR.</li>
                    <li>Прогнозные линии: почему включен лонг/шорт, есть ли «Слом SL» (План Б) или «Откат».</li>
                    <li>SMC концепции: Order Blocks (+OB, -OB), FVG, уровни ликвидности, BOS и CHoCH.</li>
                    <li>Ответы можно удобно копировать в буфер одной кнопкой!</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Case 2: Screenshot is loaded, but no analysis has been run yet */}
            {currentScreenshot && currentScreenshot.messages.length === 0 && !isLoading && !errorMessage && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
                  <Compass className="h-6 w-6" />
                </div>
                <h4 className="text-base font-bold text-white mb-1">
                  Скриншот готов к разбору!
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  Выберите формат (Полный или Короткий), при желании напишите свой вопрос в строке выше и нажмите кнопку <b>«Получить разбор графика»</b>.
                </p>
                <button
                  type="button"
                  onClick={() => handleRunAnalysis()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>Получить разбор графика прямо сейчас</span>
                </button>
              </div>
            )}

            {/* Case 3: Error Message Card */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
                  <div>
                    <p className="font-bold text-white">Временная задержка ответа нейросети</p>
                    <p className="text-red-300 mt-0.5">{errorMessage}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleRunAnalysis(undefined, true)}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-200" />
                    <span>⚡ Автономный квант-разбор</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunAnalysis()}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 font-semibold rounded-lg text-xs transition cursor-pointer"
                  >
                    Повторить онлайн
                  </button>
                </div>
              </div>
            )}

            {/* Case 4: Loading State Card */}
            {isLoading && (
              <div className="p-5 rounded-2xl bg-[#0d111a] border border-blue-500/40 shadow-xl flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                  <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Нейросеть Gemini 3.8 Flash работает
                    </span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono">
                      {analysisMode === "audit" ? "🔬 ИИ-Аудит & Верификация" : analysisMode === "detailed" ? "Полный разбор" : "Короткий разбор"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-1">
                    {loadingStatus}
                  </p>
                </div>
              </div>
            )}

            {/* Case 5: Render Chat & Responses */}
            {currentScreenshot && currentScreenshot.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                {/* Header above message bubble */}
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
                    {msg.role === "user" ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <span className="text-blue-300 font-bold">Ваш вопрос</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 text-amber-400" />
                        <span className="text-amber-300 font-bold">S&T AI Аналитик</span>
                        {msg.mode && (
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                            msg.mode === "audit" 
                              ? "bg-purple-900/40 text-purple-300 border-purple-600/50" 
                              : "bg-gray-800 text-gray-400 border-gray-700"
                          }`}>
                            {msg.mode === "audit" ? "🔬 ИИ-Аудит" : msg.mode === "detailed" ? "Полный" : "Короткий"}
                          </span>
                        )}
                      </>
                    )}
                    <span className="text-[10px] text-gray-500 font-mono">({msg.timestamp})</span>
                  </span>

                  {/* PROMINENT COPY BUTTON ON EVERY ASSISTANT MESSAGE */}
                  {msg.role === "assistant" && (
                    <button
                      type="button"
                      onClick={() => handleCopyText(msg.content, msg.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                        copiedId === msg.id
                          ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                          : "bg-gray-800/90 hover:bg-gray-700 text-gray-200 hover:text-white border-gray-700"
                      }`}
                      title="Скопировать весь текст ответа в буфер обмена"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-white" />
                          <span>Скопировано в буфер!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-blue-400" />
                          <span>Скопировать ответ</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`rounded-2xl p-4 md:p-6 max-w-4xl border shadow-md text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white border-blue-500/40 rounded-tr-none font-medium"
                      : "bg-[#0d111a] text-gray-200 border-gray-800/90 rounded-tl-none w-full"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="space-y-3 font-normal text-gray-200 [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-white [&_h1]:border-b [&_h1]:border-gray-800 [&_h1]:pb-1.5 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-white [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-amber-300 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1.5 [&_strong]:text-white [&_strong]:font-semibold [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-gray-700 [&_th]:bg-gray-900/80 [&_th]:p-2 [&_th]:text-xs [&_th]:font-bold [&_td]:border [&_td]:border-gray-800 [&_td]:p-2 [&_td]:text-xs [&_hr]:border-gray-800">
                      {msg.notice && (
                        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 not-prose">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                            <span className="leading-snug">{msg.notice}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRunAnalysis()}
                            disabled={isLoading}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-100 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Запросить через Gemini</span>
                          </button>
                        </div>
                      )}
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div ref={resultBottomRef} />
          </div>

          {/* 💬 BOTTOM FOLLOW-UP QUESTION BAR (When analysis exists) */}
          {currentScreenshot && currentScreenshot.messages.length > 0 && (
            <div className="p-3 bg-[#0b0e17] border-t border-gray-800 shrink-0">
              <form onSubmit={handleFollowUpQuestion} className="flex items-center gap-2">
                <input
                  type="text"
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  placeholder="Задать дополнительный вопрос по этому скриншоту (например: 'а если цена пробьет стоп?')..."
                  disabled={isLoading}
                  className="flex-1 bg-[#131722] border border-gray-700/80 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 transition"
                />
                
                <button
                  type="submit"
                  disabled={!followUpQuestion.trim() || isLoading}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Отправить</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadChat(currentScreenshot)}
                  className="p-2.5 bg-[#131722] border border-gray-700 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition shrink-0 cursor-pointer"
                  title="Скачать весь разбор в .txt"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          )}

        </div>
      </div>

      {/* 🚀 FULLSCREEN IMAGE ZOOM LIGHTBOX */}
      {zoomImage && (
        <div 
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-6xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setZoomImage(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300 bg-gray-800/80 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={zoomImage}
              alt="Увеличенный скриншот"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-gray-800"
            />
          </div>
        </div>
      )}
    </div>
  );
};
