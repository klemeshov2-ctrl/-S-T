import { IndicatorSettings } from "../types";

export const generateMoexStocksScript = (s: IndicatorSettings) => {
  const isMobileOptimized = s.mobileOptimized;
  const safeLbSt = Math.max(2, Math.min(10, Math.round(s.orderBlockPeriod ?? s.structureLookback ?? 4)));
  const safeFcTargetMult = Math.max(0.5, Math.min(2.5, Number(s.forecastTargetMult) || 1.15));
  const tableModeDefault =
    s.moexTableMode === 'mobile_ultra'
      ? "🔹 Ультра-Микро (1 колонка)"
      : s.moexTableMode === 'mobile_mini'
      ? "⚡ Мини-Смартфон (3 строки: Сетап / Зона / Цели)"
      : s.moexTableMode === 'mobile_compact' || isMobileOptimized
      ? "📱 Мобильный (Полный HUD / Компакт по ширине)"
      : "💻 Стандартный (ПК / 10 строк)";

  return `//@version=6
indicator("S&T MOEX Russia Super Indicator [S&T Premium v6]", "S&T MOEX", overlay=${s.moexOscillatorPane === false ? "true" : "false"}, max_boxes_count=500, max_lines_count=500, max_labels_count=500, max_bars_back=500)

// ==========================================================
// 🇷🇺 ГРУППА 0: ОПТИМАЛЬНЫЕ ПРЕСЕТЫ РОССИЙСКОГО РЫНКА (MOEX)
// ==========================================================
gp_presets   = "🇷🇺 Оптимальные Пресеты MOEX (Super Logic)"
preset_sel   = input.string("🇷🇺 MOEX - ★ Универсальный (Все таймфреймы / Авто-Адаптивный)", "Выбрать Пресет MOEX", options=[
     "🇷🇺 MOEX - ★ Универсальный (Все таймфреймы / Авто-Адаптивный)",
     "🇷🇺 MOEX - 5 мин Скальпинг (Фьючерсы Si, RI, Акции)",
     "🇷🇺 MOEX - 15 мин Оптимальный (Сбербанк, Газпром, Лукойл)",
     "🇷🇺 MOEX - 30 мин Интрадей-Свинг",
     "🇷🇺 MOEX - 1 час Часовой тренд (IMOEX / Акции)",
     "🇷🇺 MOEX - 4 часа Свинг-Трейдинг",
     "🇷🇺 MOEX - 1 день Инвестиционный (IMOEX, Дивидендные акции)",
     "По умолчанию (Ручные настройки)"
     ], group=gp_presets, tooltip="★ Универсальный пресет MOEX динамически адаптирует структуру, свинги и цели под любой открытый таймфрейм.")

// ==========================================================
// 📱 ГРУППА 1: НАСТРОЙКИ ИНТЕРФЕЙСА И ТАБЛИЦЫ (МОБИЛЬНЫЙ ЭКРАН)
// ==========================================================
gp_ui             = "📱 Интерфейс & Таблица (Мобильный Экран)"
show_tables       = input.bool(${s.showDashboard ?? s.showDashboardTable !== false}, "Показывать инфо-панель MOEX", group=gp_ui)
tbl_view_mode     = input.string("${tableModeDefault}", "📱 Режим отображения таблицы", options=[
     "💻 Стандартный (ПК / 10 строк)",
     "📱 Мобильный (Полный HUD / Компакт по ширине)",
     "📱 Мобильный (Компакт / 5 строк)",
     "⚡ Мини-Смартфон (3 строки: Сетап / Зона / Цели)",
     "🔹 Ультра-Микро (1 колонка)"
     ], group=gp_ui, tooltip="Специальная настройка под экраны смартфонов и планшетов. Отображает полную информацию как на ПК, но в сверхкомпактном по ширине виде без обрезания строк.")
table_pos         = input.string("${isMobileOptimized ? "Нижний левый" : "Нижний правый"}", "Позиция инфо-панели", options=[
     "Верхний левый", "Верхний правый", "Нижний левый", "Нижний правый", "Вверху по центру", "Внизу по центру"
     ], group=gp_ui)
table_text_sz     = input.string("${isMobileOptimized ? "Микро (size.tiny)" : "Маленький (size.small)"}", "Размер шрифта таблицы", options=[
     "Авто (size.auto)", "Микро (size.tiny)", "Маленький (size.small)", "Обычный (size.normal)"
     ], group=gp_ui, tooltip="Для смартфонов рекомендуется 'Микро (size.tiny)' или 'Авто'")
mobile_short_text = input.bool(${isMobileOptimized ? "true" : "false"}, "Сокращать текст для смартфона (LONG, SHORT, SL, TP, R:R)", group=gp_ui, tooltip="Заменяет длинные фразы краткими трейдерскими обозначениями для экономии места.")
text_sz_opt       = input.string("${isMobileOptimized ? "Микро" : "Маленький"}", "Размер шрифта меток на графике", options=["Микро", "Маленький", "Обычный", "Крупный"], group=gp_ui)
label_offset      = input.int(${isMobileOptimized ? "15" : "10"}, "Смещение меток вправо (бары)", minval=2, maxval=50, group=gp_ui)
line_len          = input.int(${isMobileOptimized ? "25" : "35"}, "Длина уровней Фибоначчи (бары)", minval=5, maxval=100, group=gp_ui)
clean_ob          = input.bool(true, "Скрывать протестированные (mitigated) OB/FVG", group=gp_ui)
show_sweeps       = input.bool(true, "Показывать надписи SWEEP (Снятие ликвидности)", group=gp_ui)

// ==========================================================
// 📊 ГРУППА 2: АНАЛИЗ ДЕЛЬТЫ ОБЪЕМА (Volume Delta MOEX)
// ==========================================================
gp_delta     = "📊 Volume Delta & Моментум MOEX"
use_mtf      = input.bool(true, "Включить MTF Анализ дельты", group=gp_delta)
mtf_tf       = input.timeframe("60", "Таймфрейм для MTF Дельты", group=gp_delta)
vd_smoothing = input.int(14, "Сглаживание дельты (EMA)", minval=1, group=gp_delta)
extreme_th   = input.float(1.2, "Порог аномальной дельты (STD)", minval=0.5, step=0.1, group=gp_delta)
check_sess   = input.bool(true, "Фильтр основной сессии MOEX (10:00 - 18:50 MSK)", group=gp_delta)

// ==========================================================
// 🏛️ ГРУППА 3: СТРУКТУРА РЫНКА (SMC, Order Blocks, FVG)
// ==========================================================
gp_smc       = "🏛️ SMC Структура, Order Blocks и Уровни"
lb_st        = input.int(${safeLbSt}, "Период Pivot ST (Краткосрочный)", minval=2, maxval=10, group=gp_smc)
lb_it        = input.int(10, "Период Pivot IT (Среднесрочный)", minval=5, maxval=20, group=gp_smc)
lb_lt        = input.int(24, "Период Pivot LT (Долгосрочный)", minval=15, maxval=50, group=gp_smc)
show_bos     = input.bool(true, "Показывать сломы структуры BOS / CHoCH", group=gp_smc)
show_ob      = input.bool(${s.showOB !== false}, "Показывать Блоки Ордеров (+OB / -OB)", group=gp_smc)
show_fvg     = input.bool(${s.showFVG !== false}, "Показывать Имбалансы (+FVG / -FVG)", group=gp_smc)
ob_limit     = input.int(5, "Макс. активных блоков OB", minval=1, maxval=20, group=gp_smc)
show_sr_zones= input.bool(true, "Показывать зоны ликвидности Поддержка/Сопротивление", group=gp_smc)
max_sr_boxes = input.int(4, "Макс. активных зон на горизонт", minval=1, maxval=10, group=gp_smc)
merge_sr     = input.bool(true, "Объединять близкие зоны S&R", group=gp_smc)

// ==========================================================
// 🎯 ГРУППА 4: ФИБОНАЧЧИ, OTE И ВОЛНОВОЙ ПРОГНОЗ MOEX
// ==========================================================
gp_fib       = "🎯 Fibonacci, OTE & Super Волновой Прогноз"
fib_period   = input.int(20, "Период свингов для Фибоначчи", minval=5, group=gp_fib)
show_probs   = input.bool(true, "Показывать вероятности и Winrate (%)", group=gp_fib)
show_forecast= input.bool(${s.showPriceForecast !== false}, "Показывать волновой прогноз цены (Super Logic)", group=gp_fib)
show_alt_wave= input.bool(true, "Показывать альтернативный сценарий при сломе SL", group=gp_fib)
fc_lookback  = input.int(30, "Lookback волнового прогноза (бары)", minval=10, maxval=60, group=gp_fib)
fc_target_mult = input.float(${safeFcTargetMult}, "Множитель TP волнового прогноза", minval=0.5, maxval=2.5, step=0.05, group=gp_fib)
fc_post_target = input.bool(true, "Показывать зеркальный ретест после TP2 (Leg 4)", group=gp_fib)
sl_atr_mult  = input.float(0.6, "Буфер ATR для Stop-Loss", minval=0.1, maxval=2.0, step=0.1, group=gp_fib)
fc_use_mtf   = input.bool(true, "Учитывать тренд старшего ТФ в прогнозе", group=gp_fib)
fc_mtf_mode  = input.string("Авто-Адаптивный (Рекомендуется)", "Режим MTF согласования", options=["Авто-Адаптивный (Рекомендуется)", "Фиксированный ТФ"], group=gp_fib)
fc_mtf_tf    = input.timeframe("60", "Старший ТФ (при фиксированном режиме)", group=gp_fib)

// ==========================================================
// 🛡️ ГРУППА 4.1: АДАПТИВНЫЙ ТРЕЙЛИНГ-СТОП (ANTI-WHIPSAW ENGINE)
// ==========================================================
gp_trail      = "🛡️ Адаптивный Трейлинг-Стоп (Anti-Whipsaw)"
use_trailing  = input.bool(true, "Включить умный трейлинг-стоп для прогноза", group=gp_trail)
trail_mode    = input.string("⚡ Гибридный (Chandelier + Smart Money)", "Стратегия трейлинга", options=["🔒 Только Безубыток (BE при взятии TP1)", "🏛️ Smart Money (Строго по Свингам структуры BOS)", "🌊 Широкий Волновой Chandelier (Anti-Whipsaw)", "⚡ Гибридный (Chandelier + Smart Money)"], group=gp_trail)
trail_be_trigger = input.string("При взятии TP1 (100%)", "Условие перевода в Безубыток (BE)", options=["При 65% пути к TP1", "При 85% пути к TP1", "При взятии TP1 (100%)"], group=gp_trail)
trail_be_buff = input.float(0.15, "Защитный буфер безубытка (в ATR)", minval=0.0, maxval=1.0, step=0.05, group=gp_trail)
trail_atr_dist= input.float(1.8, "Дистанция Chandelier трейлинга (в ATR)", minval=0.8, maxval=4.0, step=0.1, group=gp_trail)
trail_resets_wave = input.bool(false, "Сброс/инвалидация волны при срабатывании трейлинга", group=gp_trail)

// ==========================================================
// ⚡ ГРУППА 5: ТОРГОВЫЕ СИГНАЛЫ MOEX
// ==========================================================
gp_sig       = "⚡ Торговые Сигналы MOEX"
show_signals = input.bool(${s.mlEnabled !== false}, "Отображать сигналы Long/Short", group=gp_sig)
signal_mode  = input.string("Консервативный", "Режим сигналов", options=["Агрессивный", "Консервативный", "Сверх-Надежный"], group=gp_sig)

// ==========================================================
// 🎨 ГРУППА 6: ЦВЕТОВОЕ ОФОРМЛЕНИЕ
// ==========================================================
gp_colors    = "🎨 Цветовое Оформление"
c_bull       = input.color(#10b981, "Цвет Бычьих Зон / LONG", group=gp_colors)
c_bear       = input.color(#ef4444, "Цвет Медвежьих Зон / SHORT", group=gp_colors)
c_gold       = input.color(#f59e0b, "Цвет Золотых Акцентов / Предупреждений", group=gp_colors)
c_neutral    = input.color(#94a3b8, "Нейтральный Цвет", group=gp_colors)
color_invalid_gray = #64748b

// ==========================================================
// 📈 ГРУППА 7: СКОЛЬЗЯЩИЕ СРЕДНИЕ (EMA 9, 21, 50, 100 & 200 КАК НА BINANCE)
// ==========================================================
gp_ma             = "📈 Скользящие Средние (EMA 9, 21, 50, 100 & 200 как на Binance)"
show_ema9         = input.bool(true, "Показывать EMA 9 (Желтая как на Binance)", group=gp_ma)
show_ema21        = input.bool(true, "Показывать EMA 21 (Розовая как на Binance)", group=gp_ma)
show_ema50        = input.bool(true, "Показывать EMA 50 (Циан/Голубой)", group=gp_ma)
show_ema100       = input.bool(true, "Показывать EMA 100 (Зеленый институциональный)", group=gp_ma)
show_ema200       = input.bool(true, "Показывать EMA 200 (Пурпурный глобальный тренд)", group=gp_ma)
show_ema_cloud    = input.bool(true, "Заливка динамического облака тренда между EMA 50 и 100", group=gp_ma)
show_ema_cross    = input.bool(true, "Метки пересечения EMA 50/100 (Золотой / Смертельный крест)", group=gp_ma)
show_ema200_cross = input.bool(true, "Метки пробоя цены через EMA 200 (Бычий/Медвежий)", group=gp_ma)
col_ema9          = input.color(#facc15, "Цвет EMA 9 (Желтый Binance)", group=gp_ma)
col_ema21         = input.color(#ec4899, "Цвет EMA 21 (Розовый Binance)", group=gp_ma)
col_ema50         = input.color(#00e5ff, "Цвет EMA 50 (Циан/Голубой)", group=gp_ma)
col_ema100        = input.color(#22c55e, "Цвет EMA 100 (Зеленый)", group=gp_ma)
col_ema200        = input.color(#e11d48, "Цвет EMA 200 (Пурпурный/Маджента)", group=gp_ma)

// ==========================================================
// 📊 ГРУППА 8: ВЫДЕЛЕННАЯ СТРОКА MACD ВНИЗУ (RSI В ТАБЛИЦЕ НА ГРАФИКЕ)
// ==========================================================
gp_osc            = "📊 Строка MACD внизу графика (RSI в таблице на графике)"
show_macd_pane    = input.bool(true, "Показывать отдельную строку MACD внизу (Binance)", group=gp_osc, tooltip="Отображает чистый индикатор MACD в отдельной строке: столбцы выше и ниже 0.0, быстрая линия DIF и сигнальная DEA в стиле Binance. RSI (6 и 14) отображается в информационной таблице на графике.")
macd_fast         = input.int(12, "MACD Быстрый период EMA (12)", minval=2, group=gp_osc)
macd_slow         = input.int(26, "MACD Медленный период EMA (26)", minval=2, group=gp_osc)
macd_sig_len      = input.int(9, "MACD Сигнальный период (9)", minval=1, group=gp_osc)
rsi6_len          = input.int(6, "Период быстрого RSI для таблицы (6)", minval=2, group=gp_osc)
rsi14_len         = input.int(14, "Период стандартного RSI для таблицы (14)", minval=2, group=gp_osc)
show_osc_marks    = input.bool(true, "Отображать метки MACD и RSI сигналов на графике", group=gp_osc)

// Dynamic preset parameter overrides
int final_lb_st = lb_st
int final_lb_it = lb_it
int final_lb_lt = lb_lt
int final_fib_period = fib_period
float final_extreme_th = extreme_th
string final_sig_mode = signal_mode
float final_fc_target_mult = fc_target_mult
int final_fc_lookback = fc_lookback

int tf_in_sec = timeframe.in_seconds()

if preset_sel == "🇷🇺 MOEX - ★ Универсальный (Все таймфреймы / Авто-Адаптивный)"
    if tf_in_sec <= 180
        final_lb_st := 2
        final_lb_it := 6
        final_lb_lt := 15
        final_fib_period := 12
        final_extreme_th := 1.0
        final_sig_mode := "Агрессивный"
        final_fc_target_mult := 0.85
        final_fc_lookback := 16
    else if tf_in_sec <= 300
        final_lb_st := 2
        final_lb_it := 7
        final_lb_lt := 16
        final_fib_period := 14
        final_extreme_th := 1.1
        final_sig_mode := "Агрессивный"
        final_fc_target_mult := 0.90
        final_fc_lookback := 18
    else if tf_in_sec <= 900
        final_lb_st := 3
        final_lb_it := 8
        final_lb_lt := 20
        final_fib_period := 16
        final_extreme_th := 1.2
        final_sig_mode := "Консервативный"
        final_fc_target_mult := 1.10
        final_fc_lookback := 25
    else if tf_in_sec <= 1800
        final_lb_st := 4
        final_lb_it := 10
        final_lb_lt := 22
        final_fib_period := 18
        final_extreme_th := 1.3
        final_sig_mode := "Консервативный"
        final_fc_target_mult := 1.15
        final_fc_lookback := 28
    else if tf_in_sec <= 7200
        final_lb_st := 4
        final_lb_it := 12
        final_lb_lt := 26
        final_fib_period := 22
        final_extreme_th := 1.4
        final_sig_mode := "Консервативный"
        final_fc_target_mult := 1.18
        final_fc_lookback := 30
    else if tf_in_sec <= 28800
        final_lb_st := 5
        final_lb_it := 14
        final_lb_lt := 28
        final_fib_period := 24
        final_extreme_th := 1.5
        final_sig_mode := "Сверх-Надежный"
        final_fc_target_mult := 1.20
        final_fc_lookback := 35
    else
        final_lb_st := 5
        final_lb_it := 15
        final_lb_lt := 32
        final_fib_period := 24
        final_extreme_th := 1.6
        final_sig_mode := "Сверх-Надежный"
        final_fc_target_mult := 1.22
        final_fc_lookback := 38
else if preset_sel == "🇷🇺 MOEX - 5 мин Скальпинг (Фьючерсы Si, RI, Акции)"
    final_lb_st := 2
    final_lb_it := 7
    final_lb_lt := 16
    final_fib_period := 14
    final_extreme_th := 1.1
    final_sig_mode := "Агрессивный"
    final_fc_target_mult := 0.90
    final_fc_lookback := 18
else if preset_sel == "🇷🇺 MOEX - 15 мин Оптимальный (Сбербанк, Газпром, Лукойл)"
    final_lb_st := 3
    final_lb_it := 8
    final_lb_lt := 20
    final_fib_period := 16
    final_extreme_th := 1.2
    final_sig_mode := "Консервативный"
    final_fc_target_mult := 1.10
    final_fc_lookback := 25
else if preset_sel == "🇷🇺 MOEX - 30 мин Интрадей-Свинг"
    final_lb_st := 4
    final_lb_it := 10
    final_lb_lt := 22
    final_fib_period := 18
    final_extreme_th := 1.3
    final_sig_mode := "Консервативный"
    final_fc_target_mult := 1.15
    final_fc_lookback := 28
else if preset_sel == "🇷🇺 MOEX - 1 час Часовой тренд (IMOEX / Акции)"
    final_lb_st := 4
    final_lb_it := 12
    final_lb_lt := 26
    final_fib_period := 22
    final_extreme_th := 1.4
    final_sig_mode := "Консервативный"
    final_fc_target_mult := 1.18
    final_fc_lookback := 30
else if preset_sel == "🇷🇺 MOEX - 4 часа Свинг-Трейдинг"
    final_lb_st := 5
    final_lb_it := 14
    final_lb_lt := 28
    final_fib_period := 24
    final_extreme_th := 1.5
    final_sig_mode := "Сверх-Надежный"
    final_fc_target_mult := 1.20
    final_fc_lookback := 35
else if preset_sel == "🇷🇺 MOEX - 1 день Инвестиционный (IMOEX, Дивидендные акции)"
    final_lb_st := 5
    final_lb_it := 15
    final_lb_lt := 32
    final_fib_period := 24
    final_extreme_th := 1.6
    final_sig_mode := "Сверх-Надежный"
    final_fc_target_mult := 1.22
    final_fc_lookback := 38
else
    final_lb_st := lb_st
    final_lb_it := lb_it
    final_lb_lt := lb_lt
    final_fib_period := fib_period
    final_extreme_th := extreme_th
    final_sig_mode := signal_mode
    final_fc_target_mult := fc_target_mult
    final_fc_lookback := fc_lookback

get_text_size(opt) =>
    opt == "Микро" ? size.tiny : opt == "Маленький" ? size.small : opt == "Обычный" ? size.normal : opt == "Крупный" ? size.large : size.small

get_table_pos(pos) =>
    pos == "Верхний левый" ? position.top_left : pos == "Верхний правый" ? position.top_right : pos == "Нижний левый" ? position.bottom_left : pos == "Нижний правый" ? position.bottom_right : pos == "Вверху по центру" ? position.top_center : pos == "Внизу по центру" ? position.bottom_center : position.bottom_right

get_table_font_size(sz) =>
    sz == "Авто (size.auto)" ? size.auto : sz == "Микро (size.tiny)" ? size.tiny : sz == "Маленький (size.small)" ? size.small : sz == "Обычный (size.normal)" ? size.normal : size.tiny

get_bottom_hud_pos(pos) =>
    pos == "Внизу по центру" ? position.bottom_center : pos == "Нижний левый" ? position.bottom_left : pos == "Нижний правый" ? position.bottom_right : pos == "Верхний левый" ? position.top_left : position.top_right

// Basic technical series
atr = ta.atr(14)
sma50 = ta.sma(close, 50)
vol_sma20 = ta.sma(volume, 20)
// Moving Averages (EMA 9, EMA 20, EMA 21, EMA 50, EMA 100 & EMA 200 как на Binance)
ema9 = ta.ema(close, 9)
ema20 = ta.ema(close, 20)
ema21 = ta.ema(close, 21)
ema50 = ta.ema(close, 50)
ema100 = ta.ema(close, 100)
ema200 = ta.ema(close, 200)
ema_cross_bull = ta.crossover(ema50, ema100)
ema_cross_bear = ta.crossunder(ema50, ema100)
ema200_cross_bull = ta.crossover(close, ema200)
ema200_cross_bear = ta.crossunder(close, ema200)

// Oscillators: RSI 6 & 14 + MACD (в стиле Binance)
rsi6_val = ta.rsi(close, rsi6_len)
rsi14_val = ta.rsi(close, rsi14_len)
rsi_val = rsi14_val
rsi_overbought = rsi14_val >= 80
rsi_oversold = rsi14_val <= 20
rsi_bullish = rsi14_val >= 50.0

[macd_line, macd_signal, macd_hist] = ta.macd(close, macd_fast, macd_slow, macd_sig_len)
macd_cross_bull = ta.crossover(macd_line, macd_signal)
macd_cross_bear = ta.crossunder(macd_line, macd_signal)
macd_hist_rising = ta.rising(macd_hist, 1)
macd_hist_falling = ta.falling(macd_hist, 1)
macd_is_bullish = macd_line >= macd_signal

in_moex_sess = check_sess ? not na(time(timeframe.period, "1000-1850:23456")) : true

// Volume Delta calculation
calc_delta() =>
    candle_range = high - low
    buying_volume = volume * (candle_range == 0 ? 0.5 : (close >= open ? (close - open + (high - close) * 0.5 + (open - low) * 0.5) : ((high - open) * 0.5 + (close - low) * 0.5)) / candle_range)
    selling_volume = volume - buying_volume
    buying_volume - selling_volume

delta_current = calc_delta()
delta_smoothed = ta.ema(delta_current, vd_smoothing)
delta_std = ta.stdev(delta_current, 20)
is_extreme_delta = math.abs(delta_current) > delta_std * final_extreme_th
is_extreme_buy = is_extreme_delta and delta_current > 0
is_extreme_sell = is_extreme_delta and delta_current < 0

delta_mtf_smooth = request.security(syminfo.tickerid, use_mtf ? mtf_tf : timeframe.period, ta.ema(calc_delta(), vd_smoothing))

// SMC Pivots
sh_st = ta.pivothigh(high, final_lb_st, final_lb_st)
sl_st = ta.pivotlow(low, final_lb_st, final_lb_st)
sh_it = ta.pivothigh(high, final_lb_it, final_lb_it)
sl_it = ta.pivotlow(low, final_lb_it, final_lb_it)
sh_lt = ta.pivothigh(high, final_lb_lt, final_lb_lt)
sl_lt = ta.pivotlow(low, final_lb_lt, final_lb_lt)

var float last_sh_val = na
var float last_sl_val = na
var string trend_state = "bullish"

if not na(sh_it)
    last_sh_val := sh_it
if not na(sl_it)
    last_sl_val := sl_it

bool is_bos = false
bool is_choch = false
bool is_bullish_break = false
float break_price = na

if not na(last_sh_val) and close > last_sh_val
    is_bullish_break := true
    break_price := last_sh_val
    if trend_state == "bearish"
        is_choch := true
        trend_state := "bullish"
    else
        is_bos := true
    last_sh_val := na

if not na(last_sl_val) and close < last_sl_val
    is_bullish_break := false
    break_price := last_sl_val
    if trend_state == "bullish"
        is_choch := true
        trend_state := "bearish"
    else
        is_bos := true
    last_sl_val := na

// Support & Resistance institutional zones
var box[] sup_boxes = array.new<box>()
var box[] res_boxes = array.new<box>()
var label[] sup_labels = array.new<label>()
var label[] res_labels = array.new<label>()

draw_sr_box(float p_level, bool is_support, string label_text, int offset) =>
    bg_color = is_support ? color.new(c_bull, 88) : color.new(c_bear, 88)
    border_color = is_support ? color.new(c_bull, 50) : color.new(c_bear, 50)
    
    b = box.new(left=bar_index - offset, top=p_level + atr * 0.1, right=bar_index + label_offset, bottom=p_level - atr * 0.1, bgcolor=bg_color, border_color=border_color, border_style=line.style_dashed, force_overlay=true)
    l = label.new(bar_index + label_offset, p_level, label_text, color=color.new(color.black, 100), textcolor=is_support ? c_bull : c_bear, style=label.style_label_left, size=get_text_size(text_sz_opt), force_overlay=true)
    
    if is_support
        array.push(sup_boxes, b)
        array.push(sup_labels, l)
        if array.size(sup_boxes) > max_sr_boxes
            box.delete(array.shift(sup_boxes))
            label.delete(array.shift(sup_labels))
    else
        array.push(res_boxes, b)
        array.push(res_labels, l)
        if array.size(res_boxes) > max_sr_boxes
            box.delete(array.shift(res_boxes))
            label.delete(array.shift(res_labels))

add_sr_zone(bool is_support, float p_level, int offset, string txt) =>
    if show_sr_zones
        if array.size(sup_boxes) > 0
            for i = array.size(sup_boxes) - 1 to 0
                bx = array.get(sup_boxes, i)
                lbl = array.get(sup_labels, i)
                if low < box.get_bottom(bx)
                    box.delete(bx)
                    label.delete(lbl)
                    array.remove(sup_boxes, i)
                    array.remove(sup_labels, i)

        if array.size(res_boxes) > 0
            for i = array.size(res_boxes) - 1 to 0
                bx = array.get(res_boxes, i)
                lbl = array.get(res_labels, i)
                if high > box.get_top(bx)
                    box.delete(bx)
                    label.delete(lbl)
                    array.remove(res_boxes, i)
                    array.remove(res_labels, i)

        bool merged = false
        if merge_sr
            target_boxes  = is_support ? sup_boxes : res_boxes
            if array.size(target_boxes) > 0
                for i = 0 to array.size(target_boxes) - 1
                    bx = array.get(target_boxes, i)
                    top_v = box.get_top(bx)
                    bot_v = box.get_bottom(bx)
                    if math.abs(p_level - (top_v + bot_v) / 2.0) <= atr * 0.3
                        box.set_top(bx, math.max(top_v, p_level + atr * 0.1))
                        box.set_bottom(bx, math.min(bot_v, p_level - atr * 0.1))
                        merged := true
                        break
        if not merged
            draw_sr_box(p_level, is_support, txt, offset)

if show_sr_zones
    if not na(sh_lt)
        add_sr_zone(false, sh_lt, 15, "Сопротивление MOEX (" + str.tostring(sh_lt, "#.##") + ")")
    if not na(sl_lt)
        add_sr_zone(true, sl_lt, 15, "Поддержка MOEX (" + str.tostring(sl_lt, "#.##") + ")")

if barstate.islast and show_sr_zones
    if array.size(res_boxes) > 0
        for i = 0 to array.size(res_boxes) - 1
            box.set_right(array.get(res_boxes, i), bar_index + label_offset)
            label.set_x(array.get(res_labels, i), bar_index + label_offset)
    if array.size(sup_boxes) > 0
        for i = 0 to array.size(sup_boxes) - 1
            box.set_right(array.get(sup_boxes, i), bar_index + label_offset)
            label.set_x(array.get(sup_labels, i), bar_index + label_offset)

// Order Blocks (+OB / -OB)
var box[] bull_ob_boxes = array.new<box>()
var box[] bear_ob_boxes = array.new<box>()

if show_ob and bar_index > 1
    if close > high[1] and close[1] < open[1]
        b = box.new(left=bar_index-1, top=high[1], right=bar_index, bottom=low[1], bgcolor=color.new(c_bull, 88), border_color=color.new(c_bull, 50), text="+OB MOEX (Бычий)", text_color=c_bull, text_size=size.tiny, text_halign="right", text_valign="bottom", force_overlay=true)
        array.push(bull_ob_boxes, b)
    if close < low[1] and close[1] > open[1]
        b = box.new(left=bar_index-1, top=high[1], right=bar_index, bottom=low[1], bgcolor=color.new(c_bear, 88), border_color=color.new(c_bear, 50), text="-OB MOEX (Медвежий)", text_color=c_bear, text_size=size.tiny, text_halign="right", text_valign="bottom", force_overlay=true)
        array.push(bear_ob_boxes, b)

    if clean_ob and array.size(bull_ob_boxes) > 0
        for i = array.size(bull_ob_boxes) - 1 to 0
            bx = array.get(bull_ob_boxes, i)
            if low < box.get_bottom(bx)
                box.delete(bx)
                array.remove(bull_ob_boxes, i)

    if clean_ob and array.size(bear_ob_boxes) > 0
        for i = array.size(bear_ob_boxes) - 1 to 0
            bx = array.get(bear_ob_boxes, i)
            if high > box.get_top(bx)
                box.delete(bx)
                array.remove(bear_ob_boxes, i)

    if array.size(bull_ob_boxes) > 0
        for i = 0 to array.size(bull_ob_boxes) - 1
            box.set_right(array.get(bull_ob_boxes, i), bar_index)
    if array.size(bear_ob_boxes) > 0
        for i = 0 to array.size(bear_ob_boxes) - 1
            box.set_right(array.get(bear_ob_boxes, i), bar_index)

    if array.size(bull_ob_boxes) > ob_limit
        box.delete(array.shift(bull_ob_boxes))
    if array.size(bear_ob_boxes) > ob_limit
        box.delete(array.shift(bear_ob_boxes))

// Fair Value Gaps (FVG)
var box[] bull_fvg_boxes = array.new<box>()
var box[] bear_fvg_boxes = array.new<box>()

if show_fvg and bar_index > 2
    if low > high[2] and close[1] > open[1]
        array.push(bull_fvg_boxes, box.new(left=bar_index-2, top=low, right=bar_index, bottom=high[2], bgcolor=color.new(c_bull, 92), border_color=color.new(c_bull, 75), border_style=line.style_dashed, text="+FVG (Имбаланс)", text_color=c_bull, text_size=size.tiny, text_halign="right", text_valign="bottom", force_overlay=true))
    if high < low[2] and close[1] < open[1]
        array.push(bear_fvg_boxes, box.new(left=bar_index-2, top=low[2], right=bar_index, bottom=high, bgcolor=color.new(c_bear, 92), border_color=color.new(c_bear, 75), border_style=line.style_dashed, text="-FVG (Имбаланс)", text_color=c_bear, text_size=size.tiny, text_halign="right", text_valign="bottom", force_overlay=true))

    if clean_ob and array.size(bull_fvg_boxes) > 0
        for i = array.size(bull_fvg_boxes) - 1 to 0
            bx = array.get(bull_fvg_boxes, i)
            if low < box.get_bottom(bx)
                box.delete(bx)
                array.remove(bull_fvg_boxes, i)

    if clean_ob and array.size(bear_fvg_boxes) > 0
        for i = array.size(bear_fvg_boxes) - 1 to 0
            bx = array.get(bear_fvg_boxes, i)
            if high > box.get_top(bx)
                box.delete(bx)
                array.remove(bear_fvg_boxes, i)

    if array.size(bull_fvg_boxes) > 0
        for i = 0 to array.size(bull_fvg_boxes) - 1
            box.set_right(array.get(bull_fvg_boxes, i), bar_index)
    if array.size(bear_fvg_boxes) > 0
        for i = 0 to array.size(bear_fvg_boxes) - 1
            box.set_right(array.get(bear_fvg_boxes, i), bar_index)

    if array.size(bull_fvg_boxes) > ob_limit
        box.delete(array.shift(bull_fvg_boxes))
    if array.size(bear_fvg_boxes) > ob_limit
        box.delete(array.shift(bear_fvg_boxes))

// Swing High/Low calculation for OTE
highest_high = ta.highest(high, final_fib_period)
lowest_low   = ta.lowest(low, final_fib_period)
float lowest_low_8   = ta.lowest(low, 8)
float highest_high_8 = ta.highest(high, 8)
swing_range  = highest_high - lowest_low

// Momentum Oscillators Confirmation (RSI + MACD)
rsi_bull_conf = rsi_val >= 50 and rsi_val <= 70
rsi_bear_conf = rsi_val <= 50 and rsi_val >= 30

macd_bull_conf = macd_line > macd_signal
macd_bear_conf = macd_line < macd_signal

// High/Low Sweeps
var float last_sweep_price = na
var string sweep_type = na
is_high_sweep = not na(sh_st) and high > sh_st and close <= sh_st
is_low_sweep  = not na(sl_st) and low < sl_st and close >= sl_st
if is_high_sweep
    last_sweep_price := sh_st
    sweep_type := "high"
if is_low_sweep
    last_sweep_price := sl_st
    sweep_type := "low"

plotshape(show_sweeps and is_high_sweep, title="MOEX Sweep Сверху", style=shape.triangledown, location=location.abovebar, color=c_bear, size=size.small, text="⚡ SWEEP 🔻", textcolor=c_bear, force_overlay=true)
plotshape(show_sweeps and is_low_sweep, title="MOEX Sweep Снизу", style=shape.triangleup, location=location.belowbar, color=c_bull, size=size.small, text="⚡ SWEEP 🟢", textcolor=c_bull, force_overlay=true)

// OTE Calculation
var string struct_dir = "bullish"
if is_choch or is_bos
    struct_dir := is_bullish_break ? "bullish" : "bearish"

bool is_bull = struct_dir == "bullish"
if is_high_sweep and not is_bull and is_extreme_sell
    is_bull := false
else if is_low_sweep and is_bull and is_extreme_buy
    is_bull := true

float ote_top = is_bull ? (highest_high - swing_range * 0.618) : (lowest_low + swing_range * 0.786)
float ote_bottom = is_bull ? (highest_high - swing_range * 0.786) : (lowest_low + swing_range * 0.618)

// Zone check
in_support_zone = false
if array.size(sup_boxes) > 0
    for i = 0 to array.size(sup_boxes) - 1
        bx = array.get(sup_boxes, i)
        if low <= box.get_top(bx) and close >= box.get_bottom(bx)
            in_support_zone := true
            break

in_resistance_zone = false
if array.size(res_boxes) > 0
    for i = 0 to array.size(res_boxes) - 1
        bx = array.get(res_boxes, i)
        if high >= box.get_bottom(bx) and close <= box.get_top(bx)
            in_resistance_zone := true
            break

in_bullish_ob = false
if array.size(bull_ob_boxes) > 0
    for i = 0 to array.size(bull_ob_boxes) - 1
        bx = array.get(bull_ob_boxes, i)
        if low <= box.get_top(bx) and close >= box.get_bottom(bx)
            in_bullish_ob := true
            break

in_bearish_ob = false
if array.size(bear_ob_boxes) > 0
    for i = 0 to array.size(bear_ob_boxes) - 1
        bx = array.get(bear_ob_boxes, i)
        if high >= box.get_bottom(bx) and close <= box.get_top(bx)
            in_bearish_ob := true
            break

in_ote_zone = is_bull ? (low <= ote_top and close >= ote_bottom) : (high >= ote_bottom and close <= ote_top)

// Trade Signals
bullish_structure_break = is_bos and is_bullish_break
bearish_structure_break = is_bos and not is_bullish_break
bullish_choch = is_choch and is_bullish_break
bearish_choch = is_choch and not is_bullish_break

bool vol_surge = volume > vol_sma20 * 1.5
bool buy_sig = false
bool sell_sig = false

if show_signals and in_moex_sess
    if final_sig_mode == "Агрессивный"
        buy_sig  := (is_bull and (in_support_zone or in_bullish_ob or in_ote_zone) and (is_extreme_buy or vol_surge)) or bullish_choch or (is_bull and bullish_structure_break)
        sell_sig := (not is_bull and (in_resistance_zone or in_bearish_ob or in_ote_zone) and (is_extreme_sell or vol_surge)) or bearish_choch or (not is_bull and bearish_structure_break)
    else if final_sig_mode == "Консервативный"
        buy_sig  := (is_bull and (in_support_zone or in_bullish_ob or in_ote_zone) and is_extreme_buy) or (bullish_choch and (in_support_zone or in_bullish_ob))
        sell_sig := (not is_bull and (in_resistance_zone or in_bearish_ob or in_ote_zone) and is_extreme_sell) or (bearish_choch and (in_resistance_zone or in_bearish_ob))
    else
        buy_sig  := (bullish_choch or (is_bull and bullish_structure_break)) and is_extreme_buy
        sell_sig := (bearish_choch or (not is_bull and bearish_structure_break)) and is_extreme_sell

var int last_sig_bar = 0
if buy_sig or sell_sig
    if bar_index - last_sig_bar < 5
        buy_sig := false
        sell_sig := false
    else
        last_sig_bar := bar_index

// ==========================================================
// 🌐 МУЛЬТИТАЙМФРЕЙМОВОЕ СОГЛАСОВАНИЕ (AUTO-ADAPTIVE MTF ENGINE)
// ==========================================================
auto_htf_tf = timeframe.isdaily ? "W" : (timeframe.isweekly or timeframe.ismonthly ? "M" : (timeframe.isintraday ? (timeframe.multiplier <= 5 ? "15" : (timeframe.multiplier <= 15 ? "60" : (timeframe.multiplier <= 60 ? "240" : "D"))) : "D"))
string effective_htf_tf = fc_mtf_mode == "Авто-Адаптивный (Рекомендуется)" ? auto_htf_tf : fc_mtf_tf

[htf_c, htf_ema20, htf_ema50, htf_ema200, htf_rsi_val, htf_atr_val] = request.security(
    syminfo.tickerid, 
    fc_use_mtf ? effective_htf_tf : timeframe.period, 
    [close, ta.ema(close, 20), ta.ema(close, 50), ta.ema(close, 200), ta.rsi(close, 14), ta.atr(14)],
    gaps=barmerge.gaps_off,
    lookahead=barmerge.lookahead_off
)
bool htf_trend_up = htf_c >= htf_ema50 or (htf_c >= htf_ema20 and htf_ema20 >= htf_ema50)
float htf_atr = nz(htf_atr_val, atr)

// Multi-factor Confluence Scoring (Super Engine)
float bull_score = 0.0
float bear_score = 0.0

// 1. SMC Структура
if is_bull
    bull_score := bull_score + 35.0
else
    bear_score := bear_score + 35.0

// 2. Объем и кластеры
if is_extreme_buy
    bull_score := bull_score + 25.0
else if delta_current > 0
    bull_score := bull_score + 15.0

if is_extreme_sell
    bear_score := bear_score + 25.0
else if delta_current < 0
    bear_score := bear_score + 15.0

// 3. Старший таймфрейм MTF (Трендовый фильтр старшего порядка)
if htf_trend_up
    bull_score := bull_score + 25.0
else
    bear_score := bear_score + 25.0

// 4. Осцилляторы
if rsi_bull_conf
    bull_score := bull_score + 10.0
if rsi_bear_conf
    bear_score := bear_score + 10.0

if macd_bull_conf
    bull_score := bull_score + 10.0
if macd_bear_conf
    bear_score := bear_score + 10.0

// 5. Институциональный Свип ликвидности (ICT Sweep с адаптивным MTF весом)
if is_low_sweep
    bull_score := bull_score + (htf_trend_up or close >= ema200 ? 30.0 : 12.0)
if is_high_sweep
    bear_score := bear_score + (not htf_trend_up or close <= ema200 ? 30.0 : 12.0)

bool consensus_is_bull = bull_score >= bear_score

bool consensus_chg = ta.change(consensus_is_bull)
bool is_confirmed = barstate.isconfirmed or barstate.ishistory
bool consensus_changed = is_confirmed and consensus_chg

calc_moex_prob(bool target_bull) =>
    float p = 50.0
    // 1. Мультитаймфреймный тренд (MTF - ВЫСШИЙ ПРИОРИТЕТ)
    if fc_use_mtf
        if target_bull == htf_trend_up
            p := p + 14.0
        else
            p := p - 18.0

    // 2. Институциональный Свип ликвидности (с защитой от контртрендовой ловушки)
    if target_bull and is_low_sweep
        p := p + (htf_trend_up or close >= ema200 ? 15.0 : 6.0)
    else if not target_bull and is_high_sweep
        p := p + (not htf_trend_up or close <= ema200 ? 15.0 : 6.0)

    // 3. SMC структура тренда
    if target_bull == is_bull
        p := p + 8.0
    else
        p := p - 10.0
    
    // 4. Объемы и кластеры покупок/продаж (CVD / Delta)
    if target_bull
        if is_extreme_buy
            p := p + 8.0
        else if delta_current > 0
            p := p + 5.0
        else
            p := p - 6.0
    else
        if is_extreme_sell
            p := p + 8.0
        else if delta_current < 0
            p := p + 5.0
        else
            p := p - 6.0

    // 5. Моментум и сессия
    if in_moex_sess
        p := p + 3.0
    if target_bull
        if rsi_val >= 50 and macd_bull_conf
            p := p + 4.0
        else if rsi_val < 45 and macd_bear_conf
            p := p - 5.0
    else
        if rsi_val <= 50 and macd_bear_conf
            p := p + 4.0
        else if rsi_val > 55 and macd_bull_conf
            p := p - 5.0

    // 6. Зона входа / OB / S&R / OTE
    if (target_bull and (in_bullish_ob or in_support_zone or in_ote_zone)) or (not target_bull and (in_bearish_ob or in_resistance_zone or in_ote_zone))
        p := p + 6.0
    else
        p := p - 3.0

    math.min(85.0, math.max(30.0, p))

float moex_bull_prob = calc_moex_prob(true)
float moex_bear_prob = calc_moex_prob(false)
bool moex_candidate_is_bull = moex_bull_prob >= moex_bear_prob

// Защита от ложных контртрендовых сигналов в Консервативном и Сверх-Надежном режимах
if final_sig_mode != "Агрессивный"
    if buy_sig and (not htf_trend_up or moex_bull_prob < 55.0)
        buy_sig := false
    if sell_sig and (htf_trend_up or moex_bear_prob < 55.0)
        sell_sig := false

// ==========================================================
// 🌊 SUPER ADAPTIVE WAVE FORECAST ENGINE FOR MOEX
// ==========================================================
var int fc_start_bar = 0
var float fc_start_price = na
var float fc_p1 = na
var float fc_p2 = na
var float fc_p3 = na
var float fc_invalid_level = na
var float fc_alt_p1 = na
var float fc_alt_p2 = na
var float fc_alt_p3 = na
var float fc_alt_p4 = na
var bool fc_is_bull = true
var bool fc_leg1_hit = false
var bool fc_leg2_hit = false
var bool fc_leg3_hit = false
var bool fc_leg4_hit = false
var int fc_leg1_idx = 0
var float fc_leg1_val = na
var int fc_leg2_idx = 0
var float fc_leg2_val = na
var int fc_leg3_idx = 0
var float fc_leg3_val = na
var int fc_leg4_idx = 0
var float fc_leg4_val = na
var float fc_probability = 72.0

// Переменные состояния адаптивного трейлинг-стопа MOEX
var float current_trailing_sl = na
var string trailing_stage_str = "🛡️ Начальный SL"
var int trailing_stage_idx = 0

float effective_sl = use_trailing and not na(current_trailing_sl) ? current_trailing_sl : fc_invalid_level

// Проверка нахождения позиции в прибыли
float pos_entry_ref = not na(fc_leg1_val) ? fc_leg1_val : (not na(fc_p1) ? fc_p1 : fc_start_price)
bool is_pos_in_profit = not na(pos_entry_ref) and ((fc_is_bull and close > pos_entry_ref) or (not fc_is_bull and close < pos_entry_ref))

bool is_hard_sl_breached = false
bool is_trailing_hit     = false
bool is_choch_opposite   = false
bool is_adverse_move     = false

if fc_start_bar > 0 and bar_index >= fc_start_bar
    if fc_is_bull
        bool closed_beyond_sl = close < fc_invalid_level
        bool deep_blowout_sl  = low < (fc_invalid_level - atr * 0.45)
        if (closed_beyond_sl or deep_blowout_sl) and not is_pos_in_profit
            is_hard_sl_breached := true
        if use_trailing and not na(current_trailing_sl) and (close < current_trailing_sl or low <= current_trailing_sl - atr * 0.3)
            is_trailing_hit := true
        if is_confirmed and (bearish_choch or bearish_structure_break) and (close < fc_invalid_level or close < fc_p1 - atr * 1.3)
            is_choch_opposite := true
        bool dump_below_entry = (close < fc_invalid_level and close < open) or (low <= fc_invalid_level - atr * 0.45)
        bool strong_bear_bar  = (close < open and (open - close) >= atr * 1.3 and close < fc_invalid_level and close < ema20)
        if (dump_below_entry or strong_bear_bar) and not is_pos_in_profit
            is_adverse_move := true
    else
        bool closed_beyond_sl = close > fc_invalid_level
        bool deep_blowout_sl  = high > (fc_invalid_level + atr * 0.45)
        if (closed_beyond_sl or deep_blowout_sl) and not is_pos_in_profit
            is_hard_sl_breached := true
        if use_trailing and not na(current_trailing_sl) and (close > current_trailing_sl or high >= current_trailing_sl + atr * 0.3)
            is_trailing_hit := true
        if is_confirmed and (bullish_choch or bullish_structure_break) and (close > fc_invalid_level or close > fc_p1 + atr * 1.3)
            is_choch_opposite := true
        bool pump_above_entry = (close > fc_invalid_level and close > open) or (high >= fc_invalid_level + atr * 0.45)
        bool strong_bull_bar  = (close > open and (close - open) >= atr * 1.3 and close > fc_invalid_level and close > ema20)
        if (pump_above_entry or strong_bull_bar) and not is_pos_in_profit
            is_adverse_move := true

bool is_sl_breached = is_hard_sl_breached or (trail_resets_wave and is_trailing_hit) or is_adverse_move
bool alt_scenario_activated = fc_start_bar > 0 and (is_hard_sl_breached or is_choch_opposite or is_adverse_move)
bool fc_invalidated = false
bool is_trade_fully_completed = fc_leg3_hit or (fc_leg2_hit and is_trailing_hit)
int max_hold_bars = fc_leg2_hit ? 120 : (fc_leg1_hit ? math.min(35, final_fc_lookback * 2) : math.min(20, final_fc_lookback))
bool has_active_forecast = fc_start_bar > 0 and not is_sl_breached and not is_choch_opposite and not is_trade_fully_completed and (bar_index - fc_start_bar <= max_hold_bars)

bool is_strong_bull_setup = ((is_low_sweep and (htf_trend_up or final_sig_mode == "Агрессивный" or close >= ema200)) or (bullish_choch and htf_trend_up) or is_extreme_buy or (close > open and (close - open) >= atr * 0.5 and close > high[1] and close > ema20)) and moex_bull_prob >= 56.0
bool is_strong_bear_setup = ((is_high_sweep and (not htf_trend_up or final_sig_mode == "Агрессивный" or close <= ema200)) or (bearish_choch and not htf_trend_up) or is_extreme_sell or (close < open and (open - close) >= atr * 0.5 and close < low[1] and close < ema20)) and moex_bear_prob >= 56.0
bool is_strong_reversal_setup = (is_strong_bull_setup and not fc_is_bull) or (is_strong_bear_setup and fc_is_bull)

bool should_trigger_new_forecast = false
if (is_low_sweep and (htf_trend_up or final_sig_mode == "Агрессивный" or close >= ema200 or bullish_choch)) or (is_high_sweep and (not htf_trend_up or final_sig_mode == "Агрессивный" or close <= ema200 or bearish_choch))
    should_trigger_new_forecast := true
else if alt_scenario_activated or is_adverse_move
    should_trigger_new_forecast := true
else if fc_start_bar == 0
    should_trigger_new_forecast := true
else if is_strong_reversal_setup
    should_trigger_new_forecast := true
else if not has_active_forecast
    if buy_sig or sell_sig or is_confirmed or consensus_changed or bullish_choch or bearish_choch or is_extreme_buy or is_extreme_sell or (bar_index - fc_start_bar >= 15)
        should_trigger_new_forecast := true
else
    // Защита от зависших неисполненных лимитных входов
    bool is_stale_unfilled_entry = not fc_leg1_hit and ((fc_is_bull and close < fc_p1 - atr * 1.2) or (not fc_is_bull and close > fc_p1 + atr * 1.2))
    if is_stale_unfilled_entry
        should_trigger_new_forecast := true
    else if (buy_sig and not fc_is_bull and moex_bull_prob >= 60.0) or (sell_sig and fc_is_bull and moex_bear_prob >= 60.0)
        should_trigger_new_forecast := true
    else if moex_candidate_is_bull != fc_is_bull and (moex_candidate_is_bull ? moex_bull_prob : moex_bear_prob) >= 70.0 and (bar_index - fc_start_bar >= 4)
        should_trigger_new_forecast := true

// АДАПТИВНОЕ ОГРАНИЧЕНИЕ ЦЕЛЕЙ TP ПО ВСЕМ ТАЙМФРЕЙМАМ MOEX (Timeframe-Adaptive ATR Clamping)
float max_tp1_atr = (timeframe.isweekly or timeframe.ismonthly) ? 2.6 : (timeframe.isdaily ? 2.8 : (timeframe.isminutes and timeframe.multiplier >= 240 ? 3.0 : (timeframe.isminutes and timeframe.multiplier >= 60 ? 3.0 : 2.8)))
float max_tp2_atr = (timeframe.isweekly or timeframe.ismonthly) ? 3.8 : (timeframe.isdaily ? 4.2 : (timeframe.isminutes and timeframe.multiplier >= 240 ? 4.5 : (timeframe.isminutes and timeframe.multiplier >= 60 ? 4.5 : 4.6)))
float min_tp1_atr = (timeframe.isweekly or timeframe.ismonthly) ? 1.5 : (timeframe.isdaily ? 1.5 : (timeframe.isminutes and timeframe.multiplier >= 240 ? 1.7 : (timeframe.isminutes and timeframe.multiplier >= 60 ? 1.7 : 1.6)))
float min_tp2_atr = (timeframe.isweekly or timeframe.ismonthly) ? 1.6 : (timeframe.isdaily ? 1.8 : (timeframe.isminutes and timeframe.multiplier >= 240 ? 2.0 : (timeframe.isminutes and timeframe.multiplier >= 60 ? 2.0 : 1.8)))
// МАКСИМАЛЬНАЯ ГЛУБИНА ЗДОРОВОГО ИНСТИТУЦИОНАЛЬНОГО ОТКАТА (SMC Pullback Retest Limit)
float max_pullback_atr = (timeframe.isweekly or timeframe.ismonthly) ? 0.45 : (timeframe.isdaily ? 0.55 : (timeframe.isminutes and timeframe.multiplier >= 240 ? 0.65 : 0.75))

if should_trigger_new_forecast
    fc_start_bar := bar_index
    fc_start_price := close
    
    if is_low_sweep
        // Защита от контртрендовой ловушки: если старший MTF нисходящий и цена ниже EMA 200,
        // обычный свип локального лоя не может ломать глобальный медвежий тренд без подтвержденного CHoCH
        if fc_use_mtf and final_sig_mode != "Агрессивный" and not htf_trend_up and close < ema200 and not bullish_choch and not is_extreme_buy
            fc_is_bull := false
            fc_probability := math.max(68.0, moex_bear_prob)
        else
            fc_is_bull := true
            fc_probability := math.max(76.0, moex_bull_prob)
    else if is_high_sweep
        if fc_use_mtf and final_sig_mode != "Агрессивный" and htf_trend_up and close > ema200 and not bearish_choch and not is_extreme_sell
            fc_is_bull := true
            fc_probability := math.max(68.0, moex_bull_prob)
        else
            fc_is_bull := false
            fc_probability := math.max(76.0, moex_bear_prob)
    else if alt_scenario_activated
        if htf_trend_up and (in_support_zone or in_bullish_ob or rsi_val <= 32 or delta_current > 0)
            fc_is_bull := true
            fc_probability := math.max(70.0, moex_bull_prob)
        else if not htf_trend_up and (in_resistance_zone or in_bearish_ob or rsi_val >= 68 or delta_current < 0)
            fc_is_bull := false
            fc_probability := math.max(70.0, moex_bear_prob)
        else
            fc_is_bull := htf_trend_up ? (bull_score >= bear_score - 15.0) : (bull_score > bear_score + 15.0)
            fc_probability := fc_is_bull ? math.max(65.0, moex_bull_prob) : math.max(65.0, moex_bear_prob)
    else if is_strong_reversal_setup
        fc_is_bull := is_strong_bull_setup
        fc_probability := is_strong_bull_setup ? moex_bull_prob : moex_bear_prob
    else
        bool cand_bull = (bull_score >= bear_score and (htf_trend_up or not fc_use_mtf or moex_bull_prob >= 58.0)) ? true : ((bear_score > bull_score and (not htf_trend_up or not fc_use_mtf or moex_bear_prob >= 58.0)) ? false : moex_candidate_is_bull)
        if fc_use_mtf and final_sig_mode != "Агрессивный"
            if cand_bull and not htf_trend_up and close < ema200 and not bullish_choch
                cand_bull := false
            else if not cand_bull and htf_trend_up and close > ema200 and not bearish_choch
                cand_bull := true
        fc_is_bull := cand_bull
        fc_probability := fc_is_bull ? moex_bull_prob : moex_bear_prob
    
    float mtf_mult = 1.0
    if fc_use_mtf
        if fc_is_bull
            mtf_mult := htf_trend_up ? 1.25 : 0.75
        else
            mtf_mult := not htf_trend_up ? 1.25 : 0.75
    
    float tp_mult = final_fc_target_mult * mtf_mult
    
    // Exact Entry calculation: Prioritize Order Block sweet spot over generic OTE
    float target_p1 = na
    bool entry_already_hit = false
    
    if is_low_sweep and fc_is_bull
        target_p1 := math.min(close, low)
        entry_already_hit := true
    else if is_high_sweep and not fc_is_bull
        target_p1 := math.max(close, high)
        entry_already_hit := true
    else if fc_is_bull
        if in_bullish_ob or in_support_zone
            target_p1 := math.min(close, low + atr * 0.15)
            entry_already_hit := true
        else
            if array.size(bull_ob_boxes) > 0
                for i = array.size(bull_ob_boxes) - 1 to 0
                    box bx = array.get(bull_ob_boxes, i)
                    float ob_top = box.get_top(bx)
                    float ob_bot = box.get_bottom(bx)
                    float ob_mid = (ob_top + ob_bot) / 2.0
                    if ob_mid < close and ob_mid >= close - atr * max_pullback_atr
                        target_p1 := ob_mid
                        break
            if na(target_p1) and array.size(bull_fvg_boxes) > 0
                for i = array.size(bull_fvg_boxes) - 1 to 0
                    box bx = array.get(bull_fvg_boxes, i)
                    float fvg_mid = (box.get_top(bx) + box.get_bottom(bx)) / 2.0
                    if fvg_mid < close and fvg_mid >= close - atr * max_pullback_atr
                        target_p1 := fvg_mid
                        break
            if na(target_p1)
                target_p1 := not na(ote_top) and not na(ote_bottom) and ote_top < close and ote_top >= close - atr * max_pullback_atr ? (ote_top + ote_bottom) / 2.0 : close - atr * (timeframe.isintraday ? 0.45 : 0.35)
    else
        if in_bearish_ob or in_resistance_zone
            target_p1 := math.max(close, high - atr * 0.15)
            entry_already_hit := true
        else
            if array.size(bear_ob_boxes) > 0
                for i = array.size(bear_ob_boxes) - 1 to 0
                    box bx = array.get(bear_ob_boxes, i)
                    float ob_top = box.get_top(bx)
                    float ob_bot = box.get_bottom(bx)
                    float ob_mid = (ob_top + ob_bot) / 2.0
                    if ob_mid > close and ob_mid <= close + atr * max_pullback_atr
                        target_p1 := ob_mid
                        break
            if na(target_p1) and array.size(bear_fvg_boxes) > 0
                for i = array.size(bear_fvg_boxes) - 1 to 0
                    box bx = array.get(bear_fvg_boxes, i)
                    float fvg_mid = (box.get_top(bx) + box.get_bottom(bx)) / 2.0
                    if fvg_mid > close and fvg_mid <= close + atr * max_pullback_atr
                        target_p1 := fvg_mid
                        break
            if na(target_p1)
                target_p1 := not na(ote_top) and not na(ote_bottom) and ote_bottom > close and ote_bottom <= close + atr * max_pullback_atr ? (ote_top + ote_bottom) / 2.0 : close + atr * (timeframe.isintraday ? 0.45 : 0.35)

    // Target 2 (TP1 / Первый тейк-профит / Ближайшая ликвидность / Зона FVG)
    float target_p2 = na
    if fc_is_bull
        // 1. Поиск ближайшей границы FVG на пути вверх (строго не ближе min_tp1_atr)
        if array.size(bear_fvg_boxes) > 0
            for i = array.size(bear_fvg_boxes) - 1 to 0
                box bx = array.get(bear_fvg_boxes, i)
                float fvg_bottom = box.get_bottom(bx)
                if fvg_bottom >= close + atr * min_tp1_atr and fvg_bottom <= close + atr * max_tp1_atr * tp_mult
                    target_p2 := fvg_bottom
                    break
        // 2. Поиск ближайшей зоны сопротивления
        if na(target_p2) and array.size(res_boxes) > 0
            for i = array.size(res_boxes) - 1 to 0
                box bx = array.get(res_boxes, i)
                float res_bot = box.get_bottom(bx)
                if res_bot >= close + atr * min_tp1_atr and res_bot <= close + atr * max_tp1_atr * tp_mult
                    target_p2 := res_bot
                    break
        if na(target_p2)
            float bull_tp1_swing = highest_high > close ? close + math.max(atr * min_tp1_atr, (highest_high - close) * 0.75) : close + atr * 2.0 * tp_mult
            target_p2 := close + math.min(atr * max_tp1_atr * tp_mult, math.max(atr * min_tp1_atr, bull_tp1_swing))
    else
        // 1. Поиск ближайшей границы FVG на пути вниз (строго не ближе min_tp1_atr)
        if array.size(bull_fvg_boxes) > 0
            for i = array.size(bull_fvg_boxes) - 1 to 0
                box bx = array.get(bull_fvg_boxes, i)
                float fvg_top = box.get_top(bx)
                if fvg_top <= close - atr * min_tp1_atr and fvg_top >= close - atr * max_tp1_atr * tp_mult
                    target_p2 := fvg_top
                    break
        // 2. Поиск ближайшей зоны поддержки
        if na(target_p2) and array.size(sup_boxes) > 0
            for i = array.size(sup_boxes) - 1 to 0
                box bx = array.get(sup_boxes, i)
                float sup_top = box.get_top(bx)
                if sup_top <= close - atr * min_tp1_atr and sup_top >= close - atr * max_tp1_atr * tp_mult
                    target_p2 := sup_top
                    break
        if na(target_p2)
            float bear_tp1_swing = lowest_low < close ? close - math.max(atr * min_tp1_atr, (close - lowest_low) * 0.75) : close - atr * 2.0 * tp_mult
            target_p2 := close - math.min(atr * max_tp1_atr * tp_mult, math.max(atr * min_tp1_atr, math.abs(close - bear_tp1_swing)))

    // Target 3 (TP2 / Fibonacci Expansion)
    float target_p3 = na
    if fc_is_bull
        float bull_fib_target = highest_high + swing_range * 0.382
        if array.size(res_boxes) > 0
            for i = array.size(res_boxes) - 1 to 0
                box bx = array.get(res_boxes, i)
                float res_mid = (box.get_top(bx) + box.get_bottom(bx)) / 2.0
                if res_mid > target_p2 + atr * 0.5 and res_mid <= close + atr * max_tp2_atr * tp_mult
                    target_p3 := res_mid
                    break
        if na(target_p3)
            float raw_p3 = bull_fib_target > close ? close + (bull_fib_target - close) * tp_mult : close + atr * 3.2 * tp_mult
            target_p3 := math.min(close + atr * max_tp2_atr * tp_mult, math.max(target_p2 + atr * min_tp2_atr, raw_p3))
    else
        float bear_fib_target = lowest_low - swing_range * 0.382
        if array.size(sup_boxes) > 0
            for i = array.size(sup_boxes) - 1 to 0
                box bx = array.get(sup_boxes, i)
                float sup_mid = (box.get_top(bx) + box.get_bottom(bx)) / 2.0
                if sup_mid < target_p2 - atr * 0.5 and sup_mid >= close - atr * max_tp2_atr * tp_mult
                    target_p3 := sup_mid
                    break
        if na(target_p3)
            float raw_p3 = bear_fib_target < close ? close - (close - bear_fib_target) * tp_mult : close - atr * 3.2 * tp_mult
            target_p3 := math.max(close - atr * max_tp2_atr * tp_mult, math.min(target_p2 - atr * min_tp2_atr, raw_p3))

    if is_high_sweep and not fc_is_bull
        target_p1 := math.max(close, not na(last_sweep_price) ? last_sweep_price - atr * 0.4 : close + atr * 0.4)
        target_p2 := close - math.max(atr * min_tp1_atr, math.min(atr * max_tp1_atr * tp_mult, atr * 2.0 * tp_mult))
        target_p3 := close - math.max(atr * (min_tp1_atr + min_tp2_atr), math.min(atr * max_tp2_atr * tp_mult, atr * 3.6 * tp_mult))
    else if is_low_sweep and fc_is_bull
        target_p1 := math.min(close, not na(last_sweep_price) ? last_sweep_price + atr * 0.4 : close - atr * 0.4)
        target_p2 := close + math.max(atr * min_tp1_atr, math.min(atr * max_tp1_atr * tp_mult, atr * 2.0 * tp_mult))
        target_p3 := close + math.max(atr * (min_tp1_atr + min_tp2_atr), math.min(atr * max_tp2_atr * tp_mult, atr * 3.6 * tp_mult))

    // Гарантия строгой упорядоченности и анти-инверсии уровней (Strict Monotonicity)
    if fc_is_bull
        target_p1 := math.min(close, target_p1)
        target_p1 := math.max(close - atr * max_pullback_atr, target_p1)
        // TP1 строго не ближе min_tp1_atr и строго выше High текущей свечи (гарантирует видимую прогнозную линию вперед)
        target_p2 := math.max(high + atr * 0.35, math.max(close + atr * min_tp1_atr, math.max(target_p1 + atr * min_tp1_atr, target_p2)))
        target_p2 := math.min(close + atr * max_tp1_atr * tp_mult, target_p2)

        float tp1_span = target_p2 - target_p1
        target_p3 := math.max(target_p2 + atr * min_tp2_atr * tp_mult, math.max(target_p2 + tp1_span * 1.1, not na(target_p3) and target_p3 > target_p2 ? target_p3 : target_p2 + atr * 1.8 * tp_mult))
        target_p3 := math.min(close + atr * max_tp2_atr * tp_mult, target_p3)
    else
        target_p1 := math.max(close, target_p1)
        target_p1 := math.min(close + atr * max_pullback_atr, target_p1)
        // TP1 строго не ближе min_tp1_atr и строго ниже Low текущей свечи (гарантирует видимую прогнозную линию вперед)
        target_p2 := math.min(low - atr * 0.35, math.min(close - atr * min_tp1_atr, math.min(target_p1 - atr * min_tp1_atr, target_p2)))
        target_p2 := math.max(close - atr * max_tp1_atr * tp_mult, target_p2)

        float tp1_span = target_p1 - target_p2
        target_p3 := math.min(target_p2 - atr * min_tp2_atr * tp_mult, math.min(target_p2 - tp1_span * 1.1, not na(target_p3) and target_p3 < target_p2 ? target_p3 : target_p2 - atr * 1.8 * tp_mult))
        target_p3 := math.max(close - atr * max_tp2_atr * tp_mult, target_p3)

    fc_p1 := target_p1
    fc_p2 := target_p2
    fc_p3 := target_p3

    // Stop Loss calculation strictly bounded around entry and local swing (max 1.25 ATR)
    if fc_is_bull
        float local_low = lowest_low_8
        float base_floor = not na(sl_st) and sl_st < fc_p1 and sl_st >= fc_p1 - atr * 1.25 ? sl_st : (not na(local_low) and local_low < fc_p1 and local_low >= fc_p1 - atr * 1.25 ? local_low : fc_p1 - atr * 0.85)
        if array.size(bull_ob_boxes) > 0
            bx_last = array.get(bull_ob_boxes, array.size(bull_ob_boxes) - 1)
            float ob_b = box.get_bottom(bx_last)
            if ob_b < fc_p1 and ob_b >= fc_p1 - atr * 1.25
                base_floor := math.min(base_floor, ob_b)
        float calculated_sl = math.min(fc_p1 - atr * 0.35, math.max(fc_p1 - atr * 1.25, base_floor - atr * 0.15))
        calculated_sl := math.min(calculated_sl, math.min(fc_p1, math.min(close, fc_start_price)) - atr * 0.25)
        fc_invalid_level := calculated_sl
        
        fc_alt_p1 := fc_invalid_level
        fc_alt_p2 := fc_invalid_level - atr * 1.2
        fc_alt_p3 := lowest_low > 0 ? math.min(lowest_low - swing_range * 0.25, fc_invalid_level - atr * 2.8) : fc_invalid_level - atr * 2.8
        fc_alt_p4 := fc_alt_p3 - atr * 1.5
    else
        float local_high = highest_high_8
        float base_roof = not na(sh_st) and sh_st > fc_p1 and sh_st <= fc_p1 + atr * 1.25 ? sh_st : (not na(local_high) and local_high > fc_p1 and local_high <= fc_p1 + atr * 1.25 ? local_high : fc_p1 + atr * 0.85)
        if array.size(bear_ob_boxes) > 0
            bx_last = array.get(bear_ob_boxes, array.size(bear_ob_boxes) - 1)
            float ob_t = box.get_top(bx_last)
            if ob_t > fc_p1 and ob_t <= fc_p1 + atr * 1.25
                base_roof := math.max(base_roof, ob_t)
        float calculated_sl = math.max(fc_p1 + atr * 0.35, math.min(fc_p1 + atr * 1.25, base_roof + atr * 0.15))
        calculated_sl := math.max(calculated_sl, math.max(fc_p1, math.max(close, fc_start_price)) + atr * 0.25)
        fc_invalid_level := calculated_sl
        
        fc_alt_p1 := fc_invalid_level
        fc_alt_p2 := fc_invalid_level + atr * 1.2
        fc_alt_p3 := highest_high > 0 ? math.max(highest_high + swing_range * 0.25, fc_invalid_level + atr * 2.8) : fc_invalid_level + atr * 2.8
        fc_alt_p4 := fc_alt_p3 + atr * 1.5

    fc_leg1_hit := entry_already_hit
    fc_leg1_val := entry_already_hit ? target_p1 : na
    fc_leg1_idx := entry_already_hit ? bar_index : 0
    fc_leg2_hit := false
    fc_leg3_hit := false
    fc_leg4_hit := false
    fc_leg2_idx := 0
    fc_leg2_val := na
    fc_leg3_idx := 0
    fc_leg3_val := na
    fc_leg4_idx := 0
    fc_leg4_val := na
    current_trailing_sl := fc_invalid_level
    trailing_stage_str := "🛡️ Начальный SL"
    trailing_stage_idx := 0

// Live step completion tracking & ПРЯМОЙ ИМПУЛЬС (Direct Breakout without Pullback)
if fc_start_bar > 0 and bar_index >= fc_start_bar
    if fc_is_bull
        // 1. Вход: Фиксируется при тесте fc_p1
        if not fc_leg1_hit and low <= fc_p1
            fc_leg1_hit := true
            fc_leg1_idx := bar_index
            fc_leg1_val := fc_p1
            
        // 2. TP1: Фиксируется при достижении fc_p2 на последующих свечах
        if bar_index > fc_start_bar and high >= fc_p2
            if not fc_leg2_hit
                fc_leg2_hit := true
                fc_leg2_idx := bar_index
                fc_leg2_val := fc_p2
                if not fc_leg1_hit
                    fc_leg1_hit := true
                    fc_leg1_idx := fc_start_bar
                    fc_leg1_val := fc_start_price
                    
        // 3. TP2: Фиксируется при достижении fc_p3 на последующих свечах
        if bar_index > fc_start_bar and high >= fc_p3
            if not fc_leg3_hit
                fc_leg3_hit := true
                fc_leg3_idx := bar_index
                fc_leg3_val := fc_p3
                
        // 4. Зеркальный ретест после TP2
        if fc_leg3_hit and not fc_leg4_hit and low <= fc_p2
            fc_leg4_hit := true
            fc_leg4_idx := bar_index
            fc_leg4_val := fc_p2
    else
        // 1. Вход: Фиксируется при тесте fc_p1
        if not fc_leg1_hit and high >= fc_p1
            fc_leg1_hit := true
            fc_leg1_idx := bar_index
            fc_leg1_val := fc_p1
            
        // 2. TP1: Фиксируется при падении до fc_p2 на последующих свечах
        if bar_index > fc_start_bar and low <= fc_p2
            if not fc_leg2_hit
                fc_leg2_hit := true
                fc_leg2_idx := bar_index
                fc_leg2_val := fc_p2
                if not fc_leg1_hit
                    fc_leg1_hit := true
                    fc_leg1_idx := fc_start_bar
                    fc_leg1_val := fc_start_price
                    
        // 3. TP2: Фиксируется при падении до fc_p3 на последующих свечах
        if bar_index > fc_start_bar and low <= fc_p3
            if not fc_leg3_hit
                fc_leg3_hit := true
                fc_leg3_idx := bar_index
                fc_leg3_val := low
                
        // 4. Зеркальный ретест после TP2
        if fc_leg3_hit and not fc_leg4_hit and high >= fc_p2
            fc_leg4_hit := true
            fc_leg4_idx := bar_index
            fc_leg4_val := high

// ==========================================================
// 🛡️ РАСЧЕТ АДАПТИВНОГО ТРЕЙЛИНГ-СТОПА MOEX (MULTI-STAGE ENGINE)
// ==========================================================
float trail_be_ratio_val = trail_be_trigger == "При 65% пути к TP1" ? 0.65 : (trail_be_trigger == "При 85% пути к TP1" ? 0.85 : 1.0)

if use_trailing and fc_start_bar > 0 and bar_index >= fc_start_bar and not na(fc_p1) and not na(fc_p2)
    float pos_entry = not na(fc_leg1_val) ? fc_leg1_val : (not na(fc_p1) ? fc_p1 : fc_start_price)
    float tp1_dist = math.abs(fc_p2 - pos_entry)
    
    if fc_is_bull
        // 🔒 ФАЗА 1: Перевод в Безубыток (BE + защитный спред)
        bool be_cond = (high >= pos_entry + tp1_dist * trail_be_ratio_val) or fc_leg2_hit
        if be_cond and trailing_stage_idx < 1
            float be_val = pos_entry + atr * trail_be_buff
            if be_val > fc_invalid_level
                current_trailing_sl := be_val
                trailing_stage_str := "🔒 Безубыток (BE +" + str.tostring(trail_be_buff, "#.##") + " ATR)"
                trailing_stage_idx := 1

        // 💰 ФАЗА 2: Фиксация 50% прибыли TP1
        if (fc_leg2_hit or high >= fc_p2) and trailing_stage_idx < 2
            float lock_tp1 = pos_entry + (fc_p2 - pos_entry) * 0.50
            float struct_sup = lowest_low_8 - atr * 0.35
            float safe_tp1_sl = math.max(lock_tp1, struct_sup)
            if safe_tp1_sl > nz(current_trailing_sl, fc_invalid_level)
                current_trailing_sl := safe_tp1_sl
                trailing_stage_str := "💰 Защита 50% TP1"
                trailing_stage_idx := 2

        // 🚀 ФАЗА 3: Динамический структурный трейлинг Chandelier + Swing Lows к TP2
        if (fc_leg2_hit or high >= fc_p2) and trail_mode != "🔒 Только Безубыток (BE при взятии TP1)"
            float atr_trail_floor = high - atr * trail_atr_dist
            float swing_floor = lowest_low_8 - atr * 0.40
            
            float candidate_sl = trail_mode == "🏛️ Smart Money (Строго по Свингам структуры BOS)" ? swing_floor : (trail_mode == "🌊 Широкий Волновой Chandelier (Anti-Whipsaw)" ? atr_trail_floor : math.max(swing_floor, atr_trail_floor))
            
            if candidate_sl > nz(current_trailing_sl, fc_invalid_level)
                current_trailing_sl := candidate_sl
                trailing_stage_str := "🚀 Трейлинг (" + str.tostring(trail_atr_dist, "#.#") + " ATR)"
                trailing_stage_idx := 3

        if trailing_stage_idx == 0
            current_trailing_sl := fc_invalid_level
        else
            current_trailing_sl := math.max(nz(current_trailing_sl[1], fc_invalid_level), nz(current_trailing_sl, fc_invalid_level))
            current_trailing_sl := math.min(current_trailing_sl, low - atr * 0.20)
            current_trailing_sl := math.max(current_trailing_sl, fc_invalid_level)

    else
        // SHORT ПОЗИЦИЯ
        bool be_cond = (low <= pos_entry - tp1_dist * trail_be_ratio_val) or fc_leg2_hit
        if be_cond and trailing_stage_idx < 1
            float be_val = pos_entry - atr * trail_be_buff
            if be_val < fc_invalid_level
                current_trailing_sl := be_val
                trailing_stage_str := "🔒 Безубыток (BE -" + str.tostring(trail_be_buff, "#.##") + " ATR)"
                trailing_stage_idx := 1

        if (fc_leg2_hit or low <= fc_p2) and trailing_stage_idx < 2
            float lock_tp1 = pos_entry - (pos_entry - fc_p2) * 0.50
            float struct_res = highest_high_8 + atr * 0.35
            float safe_tp1_sl = math.min(lock_tp1, struct_res)
            if safe_tp1_sl < nz(current_trailing_sl, fc_invalid_level)
                current_trailing_sl := safe_tp1_sl
                trailing_stage_str := "💰 Защита 50% TP1"
                trailing_stage_idx := 2

        if (fc_leg2_hit or low <= fc_p2) and trail_mode != "🔒 Только Безубыток (BE при взятии TP1)"
            float atr_trail_ceil = low + atr * trail_atr_dist
            float swing_ceil = highest_high_8 + atr * 0.40
            
            float candidate_sl = trail_mode == "🏛️ Smart Money (Строго по Свингам структуры BOS)" ? swing_ceil : (trail_mode == "🌊 Широкий Волновой Chandelier (Anti-Whipsaw)" ? atr_trail_ceil : math.min(swing_ceil, atr_trail_ceil))
            
            if candidate_sl < nz(current_trailing_sl, fc_invalid_level)
                current_trailing_sl := candidate_sl
                trailing_stage_str := "🚀 Трейлинг (" + str.tostring(trail_atr_dist, "#.#") + " ATR)"
                trailing_stage_idx := 3

        if trailing_stage_idx == 0
            current_trailing_sl := fc_invalid_level
        else
            current_trailing_sl := math.min(nz(current_trailing_sl[1], fc_invalid_level), nz(current_trailing_sl, fc_invalid_level))
            current_trailing_sl := math.max(current_trailing_sl, high + atr * 0.20)
            current_trailing_sl := math.min(current_trailing_sl, fc_invalid_level)

// ==========================================================
// ⚡ ДЕТЕКЦИЯ БЕЗОТКАТНОГО ИМПУЛЬСА (RUNAWAY EXPANSION & NO-PULLBACK ENGINE)
// ==========================================================
float bar_rng = high - low
float bar_body = math.abs(close - open)
bool is_marubozu_expansion = bar_rng > 0 and (bar_body / bar_rng >= 0.65) and (bar_rng >= atr * 1.15)
bool has_breakaway_fvg = fc_is_bull ? (low > math.max(open[1], close[1]) + atr * 0.15) : (high < math.min(open[1], close[1]) - atr * 0.15)
bool has_htf_align = fc_is_bull == consensus_is_bull
bool has_vol_burst = (volume > vol_sma20 * 1.4) or is_extreme_buy or is_extreme_sell
bool has_rsi_acceleration = fc_is_bull ? (rsi6_val >= 60.0 and rsi14_val >= 53.0) : (rsi6_val <= 40.0 and rsi14_val <= 47.0)

float np_score = 15.0
if has_htf_align
    np_score += 25.0
if has_vol_burst
    np_score += 25.0
if is_marubozu_expansion
    np_score += 20.0
if has_breakaway_fvg
    np_score += 15.0
if has_rsi_acceleration
    np_score += 10.0

float no_pullback_prob = math.min(95.0, math.max(12.0, np_score))
bool is_high_runaway = no_pullback_prob >= 65.0

// Актуальный уровень Stop Loss / Трейлинг-Стопа для отображения на графике и в HUD-панели MOEX
float disp_sl = use_trailing and not na(current_trailing_sl) ? current_trailing_sl : fc_invalid_level

// Drawing elements
var line line_fc_0 = na
var line line_fc_1 = na
var line line_fc_2 = na
var line line_fc_3 = na
var line line_sl   = na
var line line_alt_0 = na
var line line_alt_1 = na
var line line_alt_2 = na
var line line_alt_3 = na

var label label_fc_0 = na
var label label_fc_1 = na
var label label_fc_2 = na
var label label_fc_3 = na
var label label_fc_4 = na
var label label_sl   = na
var label label_alt_desc = na

if barstate.islast and show_forecast
    line.delete(line_fc_0), line.delete(line_fc_1), line.delete(line_fc_2), line.delete(line_fc_3)
    line.delete(line_sl)
    line.delete(line_alt_0), line.delete(line_alt_1), line.delete(line_alt_2), line.delete(line_alt_3)
    label.delete(label_fc_0), label.delete(label_fc_1), label.delete(label_fc_2), label.delete(label_fc_3), label.delete(label_fc_4)
    label.delete(label_sl), label.delete(label_alt_desc)

    int x0 = bar_index
    float y0 = close
    bool draw_is_bull = fc_is_bull
    
    int x1 = bar_index + 8
    float y1 = not na(fc_p1) ? fc_p1 : (draw_is_bull ? close - atr * 0.8 : close + atr * 0.8)
    int x2 = bar_index + 18
    float y2 = not na(fc_p2) ? fc_p2 : (draw_is_bull ? close + atr * 2.2 : close - atr * 2.2)
    int x3 = bar_index + 30
    float y3 = not na(fc_p3) ? fc_p3 : (draw_is_bull ? close + atr * 4.5 : close - atr * 4.5)
    int x4 = bar_index + 38
    float y4 = y2

    float render_sl = not na(disp_sl) ? disp_sl : fc_invalid_level
    if trailing_stage_idx == 0 and not na(render_sl)
        if draw_is_bull
            render_sl := math.min(render_sl, math.min(y1, y0) - atr * 0.3)
        else
            render_sl := math.max(render_sl, math.max(y1, y0) + atr * 0.3)

    // Координаты альтернативной волны (План Б: Слом SL)
    // ВАЖНО: Альтернативная волна привязывается к горизонтальному уровню Стоп-Лосса (render_sl)
    // и проецируется ВПЕРЕД в будущее при сценарии пробоя. Никаких линий от свечки (close)!
    int alt_x0 = bar_index + 3
    float alt_y0 = render_sl
    int alt_x1 = bar_index + 11
    float alt_y1 = draw_is_bull ? alt_y0 - atr * 1.5 : alt_y0 + atr * 1.5
    int alt_x2 = bar_index + 21
    float alt_y2 = draw_is_bull ? alt_y0 - atr * 3.0 : alt_y0 + atr * 3.0
    int alt_x3 = bar_index + 29
    float alt_y3 = draw_is_bull ? alt_y2 + atr * 1.2 : alt_y2 - atr * 1.2

    bool leg1_completed = false
    bool leg2_completed = false
    bool leg3_completed = false
    bool leg4_completed = false

    if fc_start_bar > 0 and bar_index - fc_start_bar <= 400
        x0 := fc_start_bar
        y0 := fc_start_price
        
        bool leg1_was_hit = fc_leg1_hit or fc_leg2_hit or fc_leg3_hit
        int safe_leg1_idx = fc_leg1_hit ? fc_leg1_idx : (fc_leg2_hit ? fc_start_bar : math.max(bar_index + 4, fc_start_bar + 4))
        float safe_leg1_val = fc_leg1_hit ? fc_leg1_val : (fc_leg2_hit ? fc_start_price : fc_p1)
        
        x1 := safe_leg1_idx
        y1 := safe_leg1_val
        
        x2 := fc_leg2_hit ? math.max(x1 + 3, fc_leg2_idx) : math.max(bar_index + 14, (leg1_was_hit ? safe_leg1_idx + 10 : x1 + 10))
        y2 := not na(fc_leg2_val) ? fc_leg2_val : fc_p2
        
        x3 := fc_leg3_hit ? math.max(x2 + 3, fc_leg3_idx) : math.max(bar_index + 26, (fc_leg2_hit ? fc_leg2_idx + 12 : x2 + 12))
        y3 := not na(fc_leg3_val) ? fc_leg3_val : fc_p3
        
        x4 := fc_leg4_hit ? math.max(x3 + 3, fc_leg4_idx) : math.max(bar_index + 36, (fc_leg3_hit ? fc_leg3_idx + 10 : x3 + 10))
        y4 := fc_leg4_hit ? fc_leg4_val : y2

        // Хронологический контроль
        x1 := math.max(x0 + 1, x1)
        x2 := math.max(x1 + 2, x2)
        x3 := math.max(x2 + 2, x3)
        x4 := math.max(x3 + 2, x4)

        // Альтернативная волна строится ВПЕРЕД от горизонтального уровня SL без привязки к телу свечи
        alt_x0 := math.max(bar_index + 3, safe_leg1_idx + 2)
        alt_y0 := render_sl
        alt_x1 := alt_x0 + 8
        alt_y1 := draw_is_bull ? alt_y0 - atr * 1.5 : alt_y0 + atr * 1.5
        alt_x2 := alt_x1 + 10
        alt_y2 := draw_is_bull ? alt_y0 - atr * 3.0 : alt_y0 + atr * 3.0
        alt_x3 := alt_x2 + 8
        alt_y3 := draw_is_bull ? alt_y2 + atr * 1.2 : alt_y2 - atr * 1.2

        leg1_completed := leg1_was_hit
        leg2_completed := fc_leg2_hit
        leg3_completed := fc_leg3_hit
        leg4_completed := fc_leg4_hit

    // Геометрический контроль незавершенных шагов
    if draw_is_bull
        if not leg2_completed
            y2 := math.max(y0 + atr * 0.5, math.max(y1 + atr * 0.8, y2))
        if not leg3_completed
            y3 := math.max(y2 + atr * 1.0 * tp_mult, y3)
        y4 := y2
    else
        if not leg2_completed
            y2 := math.min(y0 - atr * 0.5, math.min(y1 - atr * 0.8, y2))
        if not leg3_completed
            y3 := math.min(y2 - atr * 1.0 * tp_mult, y3)
        y4 := y2

    int min_fc_x = math.max(1, bar_index - 450)
    x0 := math.max(min_fc_x, x0)
    x1 := math.max(min_fc_x, x1)
    x2 := math.max(min_fc_x, x2)
    x3 := math.max(min_fc_x, x3)
    x4 := math.max(min_fc_x, x4)
    alt_x0 := math.max(min_fc_x, alt_x0)
    alt_x1 := math.max(min_fc_x, alt_x1)
    alt_x2 := math.max(min_fc_x, alt_x2)
    alt_x3 := math.max(min_fc_x, alt_x3)

    // Distinct colors for each TP stage
    color color_tp1 = draw_is_bull ? #06b6d4 : #f97316
    color color_tp2 = #10b981
    color color_retest = #a855f7

    color col_leg1 = fc_invalidated ? color_invalid_gray : (draw_is_bull ? (leg1_completed ? color.new(c_bull, 40) : c_bull) : (leg1_completed ? color.new(c_bear, 40) : c_bear))
    color col_leg2 = fc_invalidated ? color_invalid_gray : (leg2_completed ? color.new(color_tp1, 35) : color_tp1)
    color col_leg3 = fc_invalidated ? color_invalid_gray : (leg3_completed ? color.new(color_tp2, 35) : color_tp2)
    color col_leg4 = fc_invalidated ? color_invalid_gray : (leg4_completed ? color.new(color_retest, 35) : color_retest)

    line_fc_0 := line.new(x1=x0, y1=y0, x2=x1, y2=y1, xloc=xloc.bar_index, color=col_leg1, width=leg1_completed ? 2 : 4, style=leg1_completed ? line.style_dashed : line.style_solid, force_overlay=true)
    line_fc_1 := line.new(x1=x1, y1=y1, x2=x2, y2=y2, xloc=xloc.bar_index, color=col_leg2, width=leg2_completed ? 3 : 4, style=leg2_completed ? line.style_dashed : line.style_solid, force_overlay=true)
    line_fc_2 := line.new(x1=x2, y1=y2, x2=x3, y2=y3, xloc=xloc.bar_index, color=col_leg3, width=leg3_completed ? 3 : 4, style=leg3_completed ? line.style_dashed : line.style_solid, force_overlay=true)
    if fc_post_target
        line_fc_3 := line.new(x1=x3, y1=y3, x2=x4, y2=y4, xloc=xloc.bar_index, color=col_leg4, width=leg4_completed ? 2 : (leg3_completed ? 4 : 3), style=leg4_completed ? line.style_dashed : line.style_dotted, force_overlay=true)

    // Stop Loss line & Trailing Stop Level
    color sl_line_color = fc_invalidated ? color_invalid_gray : (trailing_stage_idx > 0 ? #38bdf8 : #ef4444)
    int sl_end_x = math.max(math.max(x3, x4), alt_x2) + 4
    line_sl := line.new(x1=x0, y1=render_sl, x2=sl_end_x, y2=render_sl, xloc=xloc.bar_index, color=sl_line_color, width=2, style=trailing_stage_idx > 0 ? line.style_dashed : line.style_solid, force_overlay=true)
    string sl_lbl_title = trailing_stage_idx > 0 ? ("🛡️ ТРЕЙЛИНГ-СТОП (" + trailing_stage_str + "): " + str.tostring(render_sl, "#.##")) : ("🛑 СТОП-ЛОСС (SL / Отмена): " + str.tostring(render_sl, "#.##"))
    label_sl := label.new(sl_end_x, render_sl, sl_lbl_title, color=color.new(color.black, 100), textcolor=sl_line_color, style=label.style_label_left, size=get_text_size(text_sz_opt), force_overlay=true)

    if show_alt_wave
        color alt_col = fc_invalidated ? color_invalid_gray : (draw_is_bull ? color.new(c_bear, 25) : color.new(c_bull, 25))
        line_alt_0 := line.new(x1=alt_x0, y1=alt_y0, x2=alt_x1, y2=alt_y1, xloc=xloc.bar_index, color=alt_col, width=2, style=line.style_dashed, force_overlay=true)
        line_alt_1 := line.new(x1=alt_x1, y1=alt_y1, x2=alt_x2, y2=alt_y2, xloc=xloc.bar_index, color=alt_col, width=2, style=line.style_dashed, force_overlay=true)
        if fc_post_target
            line_alt_2 := line.new(x1=alt_x2, y1=alt_y2, x2=alt_x3, y2=alt_y3, xloc=xloc.bar_index, color=alt_col, width=2, style=line.style_dotted, force_overlay=true)

        string alt_lbl_txt = draw_is_bull ? "💥 АЛЬТЕРНАТИВА (При сломе SL " + str.tostring(render_sl, "#.##") + ")\\n➔ TP1: " + str.tostring(alt_y1, "#.##") + "\\n➔ TP2: " + str.tostring(alt_y2, "#.##") : "🚀 АЛЬТЕРНАТИВА (При сломе SL " + str.tostring(render_sl, "#.##") + ")\\n➔ TP1: " + str.tostring(alt_y1, "#.##") + "\\n➔ TP2: " + str.tostring(alt_y2, "#.##")
        color alt_txt_col = draw_is_bull ? c_bear : c_bull
        label_alt_desc := label.new(alt_x2, alt_y2, alt_lbl_txt, color=color.new(color.black, 100), textcolor=alt_txt_col, style=draw_is_bull ? label.style_label_down : label.style_label_up, size=size.small, force_overlay=true)

    // Labels for wave nodes
    color col_node = fc_invalidated ? color_invalid_gray : (draw_is_bull ? c_bull : c_bear)
    if not leg1_completed and not leg2_completed
        label_fc_0 := label.new(x0, y0, "Прогноз MOEX: Старт 🟢\\n(Winrate: " + str.tostring(fc_probability, "#") + "%)" + (fc_invalidated ? "\\n[НЕВАЛИДЕН]" : ""), color=color.new(color.black, 100), textcolor=col_node, style=label.style_label_down, size=size.small, force_overlay=true)
    
    string runaway_moex_note = (is_high_runaway and not leg1_completed and not leg2_completed) ? ("\\n⚡ БЕЗ ОТКАТА: " + str.tostring(no_pullback_prob, "#") + "%! (Сплит 50/50)") : ""
    string txt_l1 = leg1_completed ? ("📍 ВХОД (Entry / OB): " + str.tostring(y1, "#.##") + " [OK ✅]") : (draw_is_bull ? "📍 ВХОД (Buy Limit / OB): " + str.tostring(y1, "#.##") + runaway_moex_note + " ↗" : "📍 ВХОД (Sell Limit / OB): " + str.tostring(y1, "#.##") + runaway_moex_note + " ↘")
    label_fc_1 := label.new(x1, y1, txt_l1, color=color.new(color.black, 100), textcolor=leg1_completed ? color.gray : col_node, style=draw_is_bull ? label.style_label_up : label.style_label_down, size=size.small, force_overlay=true)
    
    string txt_l2 = leg2_completed ? "🏁 ТЕЙК 1 (TP1 / BOS): " + str.tostring(y2, "#.##") + " [OK ✅]" : (draw_is_bull ? "🏁 ТЕЙК 1 (TP1 / Пробой): " + str.tostring(y2, "#.##") + " ↗" : "🏁 ТЕЙК 1 (TP1 / Пробой): " + str.tostring(y2, "#.##") + " ↘")
    label_fc_2 := label.new(x2, y2, txt_l2, color=color.new(color.black, 100), textcolor=color_tp1, style=draw_is_bull ? label.style_label_down : label.style_label_up, size=size.small, force_overlay=true)
    
    string txt_l3 = leg3_completed ? "🎯 ТЕЙК 2 (TP2 🎯): " + str.tostring(y3, "#.##") + " [OK ✅]" : (draw_is_bull ? "🎯 ТЕЙК 2 (TP2 🎯 / 1.618): " + str.tostring(y3, "#.##") + " ↑" : "🎯 ТЕЙК 2 (TP2 🎯 / 1.618): " + str.tostring(y3, "#.##") + " ↓")
    label_fc_3 := label.new(x3, y3, txt_l3, color=color.new(color.black, 100), textcolor=color_tp2, style=draw_is_bull ? label.style_label_up : label.style_label_down, size=size.small, force_overlay=true)

    if fc_post_target
        string txt_l4 = leg4_completed ? "🔄 Зеркальный ретест [OK ✅]" : (draw_is_bull ? "🔄 Зеркальный ретест: " + str.tostring(y4, "#.##") + " ↘" : "🔄 Зеркальный ретест: " + str.tostring(y4, "#.##") + " ↗")
        label_fc_4 := label.new(x4, y4, txt_l4, color=color.new(color.gray, 100), textcolor=leg4_completed ? color.gray : color_retest, style=draw_is_bull ? label.style_label_down : label.style_label_up, size=size.small, force_overlay=true)

    if show_alt_wave
        string alt_lbl_txt = draw_is_bull ? "💥 АЛЬТЕРНАТИВА (Слом SL " + str.tostring(fc_invalid_level, "#.##") + ") ➔ Уровень Дампа: " + str.tostring(alt_y3, "#.##") : "🚀 АЛЬТЕРНАТИВА (Слом SL " + str.tostring(fc_invalid_level, "#.##") + ") ➔ Уровень Пампа: " + str.tostring(alt_y3, "#.##")
        color alt_txt_col = fc_invalidated ? color_invalid_gray : (draw_is_bull ? c_bear : c_bull)
        label_alt_desc := label.new(fc_post_target ? alt_x4 : alt_x3, fc_post_target ? alt_y4 : alt_y3, alt_lbl_txt, color=color.new(color.black, 100), textcolor=alt_txt_col, style=draw_is_bull ? label.style_label_down : label.style_label_up, size=size.small, force_overlay=true)

// Signals display
plotshape(buy_sig, title="MOEX Super LONG Signal", style=shape.triangleup, location=location.belowbar, color=c_bull, size=size.normal, text="LONG MOEX", textcolor=color.black, force_overlay=true)
plotshape(sell_sig, title="MOEX Super SHORT Signal", style=shape.triangledown, location=location.abovebar, color=c_bear, size=size.normal, text="SHORT MOEX", textcolor=color.black, force_overlay=true)

// ==========================================================
// 📈 ОТРИСОВКА ЛИНИЙ EMA 9, 21, 50, 100 И EMA 200 (BINANCE STYLE)
// ==========================================================
p_ema9   = plot(show_ema9 ? ema9 : na, "EMA 9 (Binance Желтый)", color=col_ema9, linewidth=1, force_overlay=true)
p_ema21  = plot(show_ema21 ? ema21 : na, "EMA 21 (Binance Розовый)", color=col_ema21, linewidth=1, force_overlay=true)
p_ema50  = plot(show_ema50 ? ema50 : na, "EMA 50 MOEX (Циан)", color=col_ema50, linewidth=2, force_overlay=true)
p_ema100 = plot(show_ema100 ? ema100 : na, "EMA 100 MOEX (Зеленый)", color=col_ema100, linewidth=2, force_overlay=true)
p_ema200 = plot(show_ema200 ? ema200 : na, "EMA 200 MOEX (Пурпурный)", color=col_ema200, linewidth=3, force_overlay=true)
fill(p_ema50, p_ema100, color=show_ema_cloud ? (ema50 >= ema100 ? color.new(#10b981, 88) : color.new(#ef4444, 88)) : na, title="Динамическое облако EMA 50/100")

// Метки Золотого и Смертельного Креста EMA 50 / EMA 100
plotshape(show_ema_cross and ema_cross_bull, title="EMA 50/100 Золотой Крест", style=shape.circle, location=location.belowbar, color=#00e5ff, size=size.tiny, text="EMA ⚔️", textcolor=#00e5ff, force_overlay=true)
plotshape(show_ema_cross and ema_cross_bear, title="EMA 50/100 Смертельный Крест", style=shape.circle, location=location.abovebar, color=#ef4444, size=size.tiny, text="EMA ☠️", textcolor=#ef4444, force_overlay=true)

// Метки пробоя цены через EMA 200
plotshape(show_ema200_cross and ema200_cross_bull, title="Пробой EMA 200 Вверх", style=shape.triangleup, location=location.belowbar, color=#ec4899, size=size.tiny, text="EMA 200 ▲", textcolor=#ec4899, force_overlay=true)
plotshape(show_ema200_cross and ema200_cross_bear, title="Пробой EMA 200 Вниз", style=shape.triangledown, location=location.abovebar, color=#ec4899, size=size.tiny, text="EMA 200 ▼", textcolor=#ec4899, force_overlay=true)

// Сигнальные метки осцилляторов RSI и MACD на барах
plotshape(show_osc_marks and macd_cross_bull, title="MACD Бычий Крест", style=shape.diamond, location=location.belowbar, color=#10b981, size=size.tiny, text="MACD ▲", textcolor=#10b981, force_overlay=true)
plotshape(show_osc_marks and macd_cross_bear, title="MACD Медвежий Крест", style=shape.diamond, location=location.abovebar, color=#ef4444, size=size.tiny, text="MACD ▼", textcolor=#ef4444, force_overlay=true)
plotshape(show_osc_marks and rsi_oversold, title="RSI Перепроданность (<30)", style=shape.triangleup, location=location.belowbar, color=#f59e0b, size=size.tiny, text="RSI OS", textcolor=#f59e0b, force_overlay=true)
plotshape(show_osc_marks and rsi_overbought, title="RSI Перекупленность (>70)", style=shape.triangledown, location=location.abovebar, color=#a855f7, size=size.tiny, text="RSI OB", textcolor=#a855f7, force_overlay=true)

// ==========================================================
// 📊 ИНФО-ПАНЕЛЬ MOEX SUPER INDICATOR
// ==========================================================
// Расчет ATR, волатильности и запаса хода (ADR Headroom)
float atr_val = ta.atr(14)
float atr_pct = close > 0 ? (atr_val / close) * 100.0 : 0.0

// Дневной диапазон (ADR - Average Daily Range)
float d_high = request.security(syminfo.tickerid, "D", high, ignore_invalid_symbol=true)
float d_low  = request.security(syminfo.tickerid, "D", low, ignore_invalid_symbol=true)
float d_atr  = request.security(syminfo.tickerid, "D", ta.atr(14), ignore_invalid_symbol=true)
float d_range = not na(d_high) and not na(d_low) ? (d_high - d_low) : 0.0
float adr_used_pct = not na(d_atr) and d_atr > 0 ? math.min(150.0, (d_range / d_atr) * 100.0) : 0.0
float adr_left_pct = math.max(0.0, 100.0 - adr_used_pct)

// Запас хода до TP1 и корректный расчет Risk/Reward сетапа
float dist_tp1_pts = math.abs(fc_p2 - close)
float dist_tp1_atr = atr_val > 0 ? dist_tp1_pts / atr_val : 1.0
float pos_entry_val = not na(fc_leg1_val) ? fc_leg1_val : (not na(fc_p1) ? fc_p1 : fc_start_price)
float trade_risk    = math.max(0.2 * atr_val, math.abs(pos_entry_val - fc_invalid_level))
float trade_reward  = math.abs(fc_p2 - pos_entry_val)
float rr_ratio      = trade_risk > 0 ? math.min(15.0, math.max(0.5, trade_reward / trade_risk)) : 2.0

var table moex_tbl = na
if barstate.islast and show_tables
    table.delete(moex_tbl)
    t_sz = get_table_font_size(table_text_sz)
    
    // Подготовка текстовых значений
    string sess_txt = in_moex_sess ? "🟢 СЕССИЯ" : "🌙 АУКЦИОН"
    string moex_delta_str = is_extreme_buy ? "🔥 АНОМАЛ. ПОКУПКИ" : is_extreme_sell ? "⚡ АНОМАЛ. ПРОДАЖИ" : delta_current >= 0 ? "🟢 БЫЧЬЯ ДЕЛЬТА" : "🔴 МЕДВЕЖЬЯ ДЕЛЬТА"
    string moex_adr_txt = "ATR " + str.tostring(atr_val, "#.##") + " (" + str.tostring(atr_pct, "#.##") + "%) | ADR: " + str.tostring(adr_left_pct, "#") + "%"
    color moex_adr_col = adr_left_pct > 35 ? c_bull : (adr_left_pct > 15 ? c_gold : c_bear)

    string moex_zone_txt = in_bullish_ob ? "🟢 В ЗОНЕ +OB" : in_bearish_ob ? "🔴 В ЗОНЕ -OB" : in_ote_zone ? "🎯 ЗОНА OTE" : "⚪ Вне активных зон"
    color moex_zone_col = in_bullish_ob ? c_bull : in_bearish_ob ? c_bear : in_ote_zone ? c_gold : c_neutral

    // Согласованный макро-тренд для HUD-панели (полная синхронизация с активным сетапом и структурой)
    bool is_macro_bear = (close < ema200) and (not htf_trend_up or close < ema50)
    bool is_macro_bull = (close > ema200) and (htf_trend_up or close > ema50)
    bool table_trend_is_bull = has_active_forecast ? fc_is_bull : (is_macro_bull ? true : (is_macro_bear ? false : consensus_is_bull))

    string moex_setup_txt = fc_invalidated ? "⚠️ Прогноз невалиден (SL)" : fc_leg3_hit ? (fc_is_bull ? "🏁 ДОСТИГНУТ TP2 (LONG) 🎯" : "🏁 ДОСТИГНУТ TP2 (SHORT) 🎯") : fc_leg2_hit ? (fc_is_bull ? "✅ ДОСТИГНУТ TP1 (LONG)" : "✅ ДОСТИГНУТ TP1 (SHORT)") : fc_leg1_hit ? (fc_is_bull ? "📍 ИСПОЛНЕН ВХОД LONG" : "📍 ИСПОЛНЕН ВХОД SHORT") : (fc_is_bull ? "🎯 ВХОД LONG @ Leg 1" : "🎯 ВХОД SHORT @ Leg 1")
    color moex_setup_col = fc_invalidated ? color_invalid_gray : fc_leg3_hit ? #34d399 : fc_leg2_hit ? #38bdf8 : fc_leg1_hit ? #fbbf24 : (fc_is_bull ? c_bull : c_bear)

    string ema_trend_txt = (close > ema50 and ema50 > ema100 and ema100 > ema200) ? "🟢 Сильный Бычий (P > 50 > 100 > 200)" : (close < ema50 and ema50 < ema100 and ema100 < ema200) ? "🔴 Сильный Медвежий (P < 50 < 100 < 200)" : (close > ema200 ? "🟡 Выше EMA 200 (Бычий)" : "🟡 Ниже EMA 200 (Медвежий)")

    if tbl_view_mode == "🔹 Ультра-Микро (1 колонка)"
        // 1 колонка, 5 строк - суперкомпакт с индикатором RSI для смартфона
        moex_tbl := table.new(get_table_pos(table_pos), columns=1, rows=5, bgcolor=#0f172a, border_color=#334155, border_width=1, force_overlay=true)
        table.cell(moex_tbl, 0, 0, "🇷🇺 " + syminfo.ticker + " (" + timeframe.period + ")", text_color=#38bdf8, text_size=size.tiny, bgcolor=#1e293b)
        table.cell(moex_tbl, 0, 1, (fc_is_bull ? "🚀 LONG " : "💥 SHORT ") + str.tostring(fc_probability, "#") + "%" + (is_high_runaway ? " ⚡БЕЗ ОТКАТА" : (fc_leg2_hit ? " ✅ TP1" : fc_leg1_hit ? " 📍 Вход" : "")), text_color=moex_setup_col, text_size=size.tiny)
        table.cell(moex_tbl, 0, 2, "TP: " + str.tostring(fc_p2, "#.##") + " | " + (trailing_stage_idx > 0 ? "🛡️ " : "SL: ") + str.tostring(nz(disp_sl, fc_invalid_level), "#.##") + " (1:" + str.tostring(rr_ratio, "#.#") + ")", text_color=#38bdf8, text_size=size.tiny)
        table.cell(moex_tbl, 0, 3, (table_trend_is_bull ? "ТРЕНД 🟢 Бычий" : "ТРЕНД 🔴 Медвежий") + " | " + sess_txt, text_color=table_trend_is_bull ? c_bull : c_bear, text_size=size.tiny)
        table.cell(moex_tbl, 0, 4, "RSI: " + str.tostring(rsi6_val, "#.#") + " / " + str.tostring(rsi14_val, "#.#") + (rsi6_val >= 80 ? " 🔴 Перекуп" : rsi6_val <= 20 ? " 🟢 Перепрод" : ""), text_color=#facc15, text_size=size.tiny)

    else if tbl_view_mode == "⚡ Мини-Смартфон (3 строки: Сетап / Зона / Цели)"
        // 2 колонки, 5 строк - ультракомпактная таблица с индикатором RSI для смартфона
        moex_tbl := table.new(get_table_pos(table_pos), columns=2, rows=5, bgcolor=#0f172a, border_color=#334155, border_width=1, force_overlay=true)
        table.cell(moex_tbl, 0, 0, "🇷🇺 MOEX", text_color=#38bdf8, text_size=t_sz, bgcolor=#1e293b)
        table.cell(moex_tbl, 1, 0, syminfo.ticker + " (" + timeframe.period + ")", text_color=color.white, text_size=t_sz, bgcolor=#1e293b)

        table.cell(moex_tbl, 0, 1, "Сетап", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 1, (fc_is_bull ? "🟢 LONG " : "🔴 SHORT ") + str.tostring(fc_probability, "#") + "% " + (is_high_runaway ? "⚡БЕЗ ОТКАТА" : (fc_leg2_hit ? "✅TP1" : fc_leg1_hit ? "📍Вход" : "🎯")), text_color=moex_setup_col, text_size=t_sz)

        table.cell(moex_tbl, 0, 2, "Цель TP1", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 2, str.tostring(fc_p2, "#.##") + " (R:R 1:" + str.tostring(rr_ratio, "#.#") + ")", text_color=c_bull, text_size=t_sz)

        table.cell(moex_tbl, 0, 3, "Стоп & Трейлинг", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 3, str.tostring(nz(disp_sl, fc_invalid_level), "#.##") + " (" + (trailing_stage_idx > 0 ? trailing_stage_str : "SL") + ")", text_color=trailing_stage_idx > 0 ? #38bdf8 : #f87171, text_size=t_sz)

        table.cell(moex_tbl, 0, 4, "RSI (6 / 14)", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 4, str.tostring(rsi6_val, "#.#") + " / " + str.tostring(rsi14_val, "#.#") + (rsi6_val >= 80 ? " 🔴 Перекуп" : rsi6_val <= 20 ? " 🟢 Перепрод" : ""), text_color=(rsi6_val >= 80 ? c_bear : rsi6_val <= 20 ? c_bull : #facc15), text_size=t_sz)

    else if tbl_view_mode == "📱 Мобильный (Полный HUD / Компакт по ширине)" or tbl_view_mode == "📱 Мобильный (Компакт / 5 строк)"
        // 📱 МОБИЛЬНЫЙ ПОЛНЫЙ HUD MOEX: 100% данных с ПК (все 9 аналитических строк), оптимизированных по ширине
        moex_tbl := table.new(get_table_pos(table_pos), columns=2, rows=10, bgcolor=#0f172a, border_color=#334155, border_width=1, force_overlay=true)
        table.cell(moex_tbl, 0, 0, "🇷🇺 MOEX", text_color=#38bdf8, text_size=t_sz, bgcolor=#1e293b)
        table.cell(moex_tbl, 1, 0, syminfo.ticker + " (" + timeframe.period + ") " + (in_moex_sess ? "Сессия" : "Аукцион"), text_color=color.white, text_size=t_sz, bgcolor=#1e293b)

        // 1. Сессия & Тренд
        table.cell(moex_tbl, 0, 1, "Сессия/Тренд", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 1, sess_txt + " | " + (table_trend_is_bull ? "🟢LONG" : "🔴SHORT") + " (" + (close > ema200 ? ">EMA200" : "<EMA200") + ")", text_color=table_trend_is_bull ? c_bull : c_bear, text_size=t_sz)

        // 2. Дельта Объема
        table.cell(moex_tbl, 0, 2, "Дельта Объем", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 2, moex_delta_str, text_color=is_extreme_buy ? c_gold : is_extreme_sell ? c_bear : (delta_current >= 0 ? c_bull : c_bear), text_size=t_sz)

        // 3. ATR & Запас Хода (ADR)
        table.cell(moex_tbl, 0, 3, "ATR / ADR", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 3, moex_adr_txt, text_color=moex_adr_col, text_size=t_sz)

        // 4. Зона Входа & R:R Соотношение
        table.cell(moex_tbl, 0, 4, "Зона / R:R", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 4, moex_zone_txt + " | RR 1:" + str.tostring(rr_ratio, "#.#") + " (" + str.tostring(dist_tp1_atr, "#.#") + " ATR)", text_color=moex_zone_col, text_size=t_sz)

        // 5. Торговый Сетап, Статус и Winrate
        bool moex_mob_actual = not fc_leg1_hit and not fc_leg2_hit and not fc_leg3_hit and not fc_invalidated
        string moex_mob_suffix = (moex_mob_actual and is_high_runaway) ? " ⚡NoPB" : ""
        table.cell(moex_tbl, 0, 5, "Сетап & WR", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 5, moex_setup_txt + " (" + str.tostring(fc_probability, "#") + "%)" + moex_mob_suffix, text_color=moex_setup_col, text_size=t_sz)

        // 6. Стоп & Трейлинг
        table.cell(moex_tbl, 0, 6, "SL / Трейл", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 6, str.tostring(nz(disp_sl, fc_invalid_level), "#.##") + " | " + trailing_stage_str, text_color=trailing_stage_idx > 0 ? #38bdf8 : #f87171, text_size=t_sz)

        // 7. Альтернатива (План Б)
        table.cell(moex_tbl, 0, 7, "План Б (Слом)", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 7, show_alt_wave ? ("⚠️Слом " + str.tostring(fc_invalid_level, "#.##") + (fc_is_bull ? "➔SHORT" : "➔LONG")) : "⚪Выкл", text_color=#fbbf24, text_size=t_sz)

        // 8. Скользящие средние EMA
        table.cell(moex_tbl, 0, 8, "EMA Тренды", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 8, ema_trend_txt, text_color=(close > ema200) ? c_bull : c_bear, text_size=t_sz)

        // 9. RSI Моментум (6 и 14)
        table.cell(moex_tbl, 0, 9, "RSI (6/14)", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 9, "R6: " + str.tostring(rsi6_val, "#.#") + " | R14: " + str.tostring(rsi14_val, "#.#") + " (" + (rsi6_val >= 80 ? "⚠️Перекуп" : rsi6_val <= 20 ? "🔥Перепрод" : rsi6_val >= 50 ? "Бычий" : "Медвеж") + ")", text_color=(rsi6_val >= 80 ? c_bear : rsi6_val <= 20 ? c_bull : #a855f7), text_size=t_sz)

    else
        // 💻 Полный режим для ПК (10 строк - объединен сетап и импульс без отката, только когда актуально)
        moex_tbl := table.new(get_table_pos(table_pos), columns=2, rows=10, bgcolor=#0f172a, border_color=#334155, border_width=1, force_overlay=true)
        table.cell(moex_tbl, 0, 0, "🇷🇺 S&T MOEX SUPER", text_color=#38bdf8, text_size=t_sz, bgcolor=#1e293b)
        table.cell(moex_tbl, 1, 0, syminfo.ticker + " (" + timeframe.period + ")", text_color=color.white, text_size=t_sz, bgcolor=#1e293b)

        table.cell(moex_tbl, 0, 1, "Сессия & Тренд", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 1, sess_txt + " | " + (table_trend_is_bull ? "🟢 БЫЧИЙ (LONG)" : "🔴 МЕДВЕЖИЙ (SHORT)"), text_color=table_trend_is_bull ? c_bull : c_bear, text_size=t_sz)

        table.cell(moex_tbl, 0, 2, "Дельта Объема", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 2, moex_delta_str, text_color=is_extreme_buy ? c_gold : is_extreme_sell ? c_bear : (delta_current >= 0 ? c_bull : c_bear), text_size=t_sz)

        table.cell(moex_tbl, 0, 3, "ATR & Запас Хода", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 3, moex_adr_txt, text_color=moex_adr_col, text_size=t_sz)

        table.cell(moex_tbl, 0, 4, "Зона Входа & R:R", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 4, moex_zone_txt + " | R:R 1:" + str.tostring(rr_ratio, "#.#") + " (" + str.tostring(dist_tp1_atr, "#.#") + " ATR)", text_color=moex_zone_col, text_size=t_sz)

        // Строка 5: Торговый Сетап (+ Импульс без отката только пока актуально)
        bool moex_runaway_actual = not fc_leg1_hit and not fc_leg2_hit and not fc_leg3_hit and not fc_invalidated
        string moex_runaway_suffix = ""
        if moex_runaway_actual
            if is_high_runaway
                moex_runaway_suffix := " | ⚡ Без отката " + str.tostring(no_pullback_prob, "#") + "% (50/50)"
            else if no_pullback_prob >= 45.0
                moex_runaway_suffix := " | ⚡ Без отката " + str.tostring(no_pullback_prob, "#") + "%"

        table.cell(moex_tbl, 0, 5, "Торговый Сетап", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 5, moex_setup_txt + " (" + str.tostring(fc_probability, "#.#") + "% " + (fc_probability >= 75.0 ? "🔥" : "⚖️") + ")" + moex_runaway_suffix, text_color=moex_setup_col, text_size=t_sz)

        table.cell(moex_tbl, 0, 6, "Трейлинг & SL", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 6, str.tostring(nz(disp_sl, fc_invalid_level), "#.##") + " | " + trailing_stage_str, text_color=trailing_stage_idx > 0 ? #38bdf8 : #f87171, text_size=t_sz)

        table.cell(moex_tbl, 0, 7, "Альтернатива (План Б)", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 7, show_alt_wave ? ("⚠️ Слом SL " + str.tostring(fc_invalid_level, "#.##") + (fc_is_bull ? " ➔ SHORT" : " ➔ LONG")) : "⚪ Отключен", text_color=#fbbf24, text_size=t_sz)

        table.cell(moex_tbl, 0, 8, "EMA 50 / 100 / 200", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 8, ema_trend_txt, text_color=(close > ema200) ? c_bull : c_bear, text_size=t_sz)

        table.cell(moex_tbl, 0, 9, "RSI (6 & 14)", text_color=c_neutral, text_size=t_sz)
        table.cell(moex_tbl, 1, 9, "RSI 6: " + str.tostring(rsi6_val, "#.#") + " | RSI 14: " + str.tostring(rsi14_val, "#.#") + " (" + (rsi6_val >= 80 ? "⚠️ Перекуплен (>80)" : rsi6_val <= 20 ? "🔥 Перепродан (<20)" : rsi6_val >= 50 ? "Бычий баланс" : "Медвежий баланс") + ")", text_color=(rsi6_val >= 80 ? c_bear : rsi6_val <= 20 ? c_bull : #a855f7), text_size=t_sz)

// ==========================================================
// 📊 ВЫДЕЛЕННЫЙ MACD ВНИЗУ ГРАФИКА (ТОЛЬКО MACD В СТИЛЕ BINANCE: СТОЛБЦЫ ОТ 0, DIF И DEA)
// ==========================================================
bool hist_is_growing = macd_hist >= macd_hist[1]
color col_hist = hist_is_growing ? #0ecb81 : #f6465d

// Отрисовка столбцов гистограммы от 0.00 (Binance: зеленые при росте, красные при спаде)
plot(show_macd_pane ? macd_hist : na, "MACD Столбцы (Binance от 0.0)", color=col_hist, style=plot.style_columns)
// Быстрая линия DIF (Binance Желтая)
plot(show_macd_pane ? macd_line : na, "MACD DIF Быстрая (Binance Желтая)", color=#facc15, linewidth=2)
// Сигнальная линия DEA (Binance Розовая)
plot(show_macd_pane ? macd_signal : na, "MACD DEA Сигнальная (Binance Розовая)", color=#ec4899, linewidth=2)
// Нулевая горизонтальная линия 0.0
plot(show_macd_pane ? 0.0 : na, "MACD Нулевая Линия 0.0", color=color.new(color.gray, 60), style=plot.style_linebr)

// Telegram and TradingView alert conditions
bool moex_alert_runaway = not fc_leg1_hit and not fc_leg2_hit and is_high_runaway and (fc_start_bar > 0 and bar_index >= fc_start_bar)
bool moex_alert_be      = trailing_stage_idx == 1 and trailing_stage_idx[1] == 0
bool moex_alert_tp1     = fc_leg2_hit and not fc_leg2_hit[1]
bool moex_alert_tp2     = fc_leg3_hit and not fc_leg3_hit[1]
bool moex_alert_sl      = (is_hard_sl_breached and not is_hard_sl_breached[1]) or (is_trailing_hit and not is_trailing_hit[1])

alertcondition(moex_alert_runaway and not moex_alert_runaway[1], "⚡ [Telegram] MOEX Импульс БЕЗ ОТКАТА (Runaway)", "⚡ S&T MOEX: Высокая вероятность импульса сразу к цели TP1 без отката! Рекомендован вход сплитом 50/50 или по пробою! Ticker: {{ticker}}, Close: {{close}}")
alertcondition(moex_alert_be, "🛡️ [Telegram] MOEX Перевод в Безубыток (BE)", "🛡️ S&T MOEX: Позиция переведена в безубыток! Ticker: {{ticker}}, BE: {{close}}")
alertcondition(moex_alert_tp1, "🏁 [Telegram] MOEX Достигнут Тейк 1 (TP1)", "🏁 S&T MOEX: Взят Тейк 1 (BOS)! Зафиксировано 50%, стоп в безубыток. Ticker: {{ticker}}, Price: {{close}}")
alertcondition(moex_alert_tp2, "🎯 [Telegram] MOEX Достигнут Тейк 2 (TP2)", "🎯 S&T MOEX: Главная цель волнового прогноза TP2 успешно достигнута! Ticker: {{ticker}}, Price: {{close}}")
alertcondition(moex_alert_sl, "🛑 [Telegram] MOEX Сработал Стоп / Трейлинг", "🛑 S&T MOEX: Сработал Стоп-Лосс или Трейлинг-Стоп. Ticker: {{ticker}}, Price: {{close}}")
alertcondition(buy_sig, "S&T MOEX Super LONG Сигнал", "Сформирован LONG сигнал по российским акциям (MOEX)!")
alertcondition(sell_sig, "S&T MOEX Super SHORT Сигнал", "Сформирован SHORT сигнал по российским акциям (MOEX)!")
alertcondition(fc_leg1_hit, "S&T MOEX Достигнут ВХОД (Leg 1)", "Цена вошла в зону входа (Order Block / OTE)! Ticker: {{ticker}}, Close: {{close}}")
alertcondition(fc_leg2_hit, "S&T MOEX Достигнут ТЕЙК 1 (TP1)", "Цена достигла Тейк-Профита 1 (BOS)! Ticker: {{ticker}}, Close: {{close}}")
alertcondition(fc_leg3_hit, "S&T MOEX Достигнут ТЕЙК 2 (TP2)", "Цена достигла главной цели Тейк-Профита 2 (Fib 1.618)! Ticker: {{ticker}}, Close: {{close}}")
alertcondition(fc_invalidated, "S&T MOEX Прогноз НЕВАЛИДЕН (SL Hit)", "Сработал Stop Loss / Невалидация волновой структуры! Ticker: {{ticker}}, Close: {{close}}")
alertcondition(ema_cross_bull, "S&T MOEX EMA 50/100 Золотой Крест", "EMA 50 пересекла EMA 100 снизу вверх (Бычий тренд MOEX)! Ticker: {{ticker}}, Close: {{close}}")
alertcondition(ema_cross_bear, "S&T MOEX EMA 50/100 Смертельный Крест", "EMA 50 пересекла EMA 100 сверху вниз (Медвежий тренд MOEX)! Ticker: {{ticker}}, Close: {{close}}")
alertcondition(ema200_cross_bull, "S&T MOEX Пробой EMA 200 Вверх", "Цена пробила EMA 200 снизу вверх (Глобальный бычий импульс MOEX)! Ticker: {{ticker}}, Close: {{close}}")
alertcondition(ema200_cross_bear, "S&T MOEX Пробой EMA 200 Вниз", "Цена пробила EMA 200 сверху вниз (Глобальный медвежий импульс MOEX)! Ticker: {{ticker}}, Close: {{close}}")
alertcondition(macd_cross_bull, "S&T MOEX MACD Бычий Крест", "Линия MACD пересекла сигнальную снизу вверх! Ticker: {{ticker}}, Close: {{close}}")
alertcondition(macd_cross_bear, "S&T MOEX MACD Медвежий Крест", "Линия MACD пересекла сигнальную сверху вниз! Ticker: {{ticker}}, Close: {{close}}")
alertcondition(rsi_oversold, "S&T MOEX RSI Перепроданность (<30)", "RSI MOEX опустился ниже 30 (Зона покупок)! Ticker: {{ticker}}, Close: {{close}}")
alertcondition(rsi_overbought, "S&T MOEX RSI Перекупленность (>70)", "RSI MOEX поднялся выше 70 (Зона фиксации/продаж)! Ticker: {{ticker}}, Close: {{close}}")
`;
};
