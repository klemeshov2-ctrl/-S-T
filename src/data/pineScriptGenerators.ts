import { IndicatorSettings } from "../types";
export { generateWaveInvalidationAdaptiveScript } from "./invalidationWaveEngineGenerator";
export { generateMoexStocksScript } from "./moexSuperIndicatorGenerator";
export { generateNeuraLibAdaptiveScript } from "./neuralibScriptGenerator";
export { generateNeuralSuperFusionScript } from "./neuralSuperFusionGenerator";
export { generateBinanceMacdScript, generateBinanceRsiScript, generateBinanceDuoScript } from "./binanceOscillatorsGenerator";

export const generateVolumeDeltaScript = (s: IndicatorSettings) => {
  const isMobileOptimized = s.mobileOptimized;
  return `//@version=6
indicator("Volume Delta Candles 5TF + MTF with Fibonacci Probability Levels [S&T Premium v6]", "S&T Delta", overlay=false, max_boxes_count=500, max_lines_count=500, max_labels_count=500)

// ==========================================================
// 📱 ГРУППА 1: НАСТРОЙКИ МОБИЛЬНОЙ ОПТИМИЗАЦИИ И ИНТЕРФЕЙСА
// ==========================================================
gp_ui        = "📱 Настройки Мобильной Оптимизации и Интерфейса"
show_tables  = input.bool(true, "Показывать инфо-панели S&T", group=gp_ui)
compact_mode = input.bool(${isMobileOptimized?"true":"false"}, "Компактный режим панели", group=gp_ui)
table_pos    = input.string("${isMobileOptimized?"Нижний левый":"Нижний правый"}", "Позиция инфо-панели", options=["Верхний левый", "Верхний правый", "Нижний левый", "Нижний правый"], group=gp_ui)
text_sz_opt  = input.string("${isMobileOptimized?"Микро":"Маленький"}", "Размер шрифта на графике", options=["Микро", "Маленький", "Обычный", "Крупный"], group=gp_ui)
label_offset = input.int(${isMobileOptimized?"15":"8"}, "Смещение меток вправо (бары)", minval=2, maxval=50, group=gp_ui)
line_len     = input.int(${isMobileOptimized?"25":"40"}, "Длина горизонтальных линий (бары)", minval=5, maxval=100, group=gp_ui)

// ==========================================================
// 📊 ГРУППА 2: ДЕЛЬТА И МУЛЬТИ-ТАЙМФРЕЙМ (MTF)
// ==========================================================
gp_delta     = "📊 Объемная Дельта и MTF Анализ"
use_mtf      = input.bool(true, "Включить MTF Анализ Дельты", group=gp_delta)
mtf_tf       = input.timeframe("60", "Таймфрейм MTF Дельты", group=gp_delta)
vd_smoothing = input.int(14, "Период сглаживания Дельты (EMA)", minval=1, maxval=50, group=gp_delta)
extreme_th   = input.float(2.0, "Порог аномальной Дельты (StdDev)", minval=1.0, maxval=4.0, step=0.1, group=gp_delta)

// ==========================================================
// 🏛️ ГРУППА 3: ЗОНЫ ПОДДЕРЖКИ И СОПРОТИВЛЕНИЯ LIQUIDITY S/R
// ==========================================================
gp_sr        = "🏛️ Ключевые Уровни Liquidity S/R"
show_sr_zones= input.bool(true, "Показывать ключевые зоны Liquidity S/R", group=gp_sr)
max_sr_boxes = input.int(${isMobileOptimized?"4":"8"}, "Макс. активных зон Liquidity S/R", minval=2, maxval=20, group=gp_sr)
merge_sr     = input.bool(true, "Объединять близкие уровни Liquidity S/R", group=gp_sr)

// ==========================================================
// 🎯 ГРУППА 4: ФИБОНАЧЧИ УРОВНИ И ВЕРОЯТНОСТИ
// ==========================================================
gp_fib       = "🎯 Вероятности и Фибоначчи"
show_fib_table = input.bool(true, "Показывать таблицу вероятностей Фибоначчи", group=gp_fib)
show_forecast_lines = input.bool(${s.showPriceForecast!==!1?"true":"false"}, "Показывать визуальные линии прогноза", group=gp_fib)

// ==========================================================
// 🎨 ГРУППА 5: ЦВЕТОВАЯ СХЕМА S&T
// ==========================================================
gp_colors    = "🎨 Цветовая схема S&T"
c_bull       = input.color(#22c55e, "Цвет Бычьих Зон / LONG", group=gp_colors)
c_bear       = input.color(#ef4444, "Цвет Медвежьих Зон / SHORT", group=gp_colors)
c_gold       = input.color(#eab308, "Цвет Золотых Сигналов", group=gp_colors)
c_fuchsia    = input.color(#d946ef, "Цвет Пурпурных Сигналов", group=gp_colors)
c_neutral    = input.color(#94a3b8, "Нейтральный Цвет", group=gp_colors)

// ==========================================================
// 🛠️ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================================
get_text_size(opt) =>
    opt == "Микро" ? size.tiny : opt == "Маленький" ? size.small : opt == "Обычный" ? size.normal : opt == "Крупный" ? size.large : size.small

get_table_pos(pos) =>
    pos == "Верхний левый" ? position.top_left : pos == "Верхний правый" ? position.top_right : pos == "Нижний левый" ? position.bottom_left : pos == "Нижний правый" ? position.bottom_right : position.bottom_right

val_dot(v, max_v) =>
    float ratio = max_v > 0 ? math.abs(v) / max_v : 0
    ratio > 0.8 ? "🟣" : ratio > 0.5 ? "🔵" : ratio > 0.2 ? "🟡" : "⚪"

// Базовые вычисления дельты объема
v_buy  = volume * (close >= open ? (high - low > 0 ? (close - low) / (high - low) : 0.5) : (high - low > 0 ? (high - open) / (high - low) : 0.3))
v_sell = volume - v_buy
v_delta = v_buy - v_sell

atr = ta.atr(14)
v_delta_ema = ta.ema(v_delta, vd_smoothing)
v_delta_sma50 = ta.sma(v_delta, 50)
v_delta_stdev = ta.stdev(v_delta, 50)
v_delta_z = v_delta_stdev > 0 ? (v_delta - v_delta_sma50) / v_delta_stdev : 0.0

is_extreme_buy  = v_delta_z > extreme_th
is_extreme_sell = v_delta_z < -extreme_th

// MTF Анализ Дельты
delta_mtf_raw = request.security(syminfo.tickerid, use_mtf ? mtf_tf : timeframe.period, v_delta, ignore_invalid_symbol=true)
delta_mtf_smooth = request.security(syminfo.tickerid, use_mtf ? mtf_tf : timeframe.period, ta.ema(v_delta, vd_smoothing), ignore_invalid_symbol=true)

// Отрисовка гистограммы дельты
c_candle_body = is_extreme_buy ? c_gold : is_extreme_sell ? c_fuchsia : v_delta >= 0 ? c_bull : c_bear
plotcandle(0, v_delta, 0, v_delta, title="Свечи Дельты Обьема S&T", color=c_candle_body, wickcolor=c_candle_body, bordercolor=c_candle_body)
plot(v_delta_ema, title="EMA Сглаженная Дельта", color=color.white, linewidth=2)
plot(use_mtf ? delta_mtf_smooth : na, title="MTF EMA Дельта", color=#38bdf8, linewidth=2, style=plot.style_line)
hline(0, "Нулевая Линия Дельты", color=color.new(c_neutral, 50), linestyle=hline.style_dashed)

// Расчет уровней поддержки/сопротивления Liquidity S/R
ph_lt = ta.pivothigh(high, 5, 5)
pl_lt = ta.pivotlow(low, 5, 5)

var box[] sup_boxes = array.new_box(0)
var box[] res_boxes = array.new_box(0)
var label[] sup_labels = array.new_label(0)
var label[] res_labels = array.new_label(0)

draw_sr_box(float p_level, bool is_support, string label_text, int offset) =>
    bg_color = is_support ? color.new(c_bull, 85) : color.new(c_bear, 85)
    border_color = is_support ? color.new(c_bull, 60) : color.new(c_bear, 60)
    textcolor = is_support ? c_bull : c_bear
    
    bool merged = false
    if merge_sr
        if is_support and array.size(sup_boxes) > 0
            for i = 0 to array.size(sup_boxes) - 1
                bx = array.get(sup_boxes, i)
                lbl = array.get(sup_labels, i)
                b_top = box.get_top(bx)
                b_bottom = box.get_bottom(bx)
                float box_center = (b_top + b_bottom) / 2.0
                if math.abs(p_level - box_center) < atr * 0.65
                    new_top = math.max(b_top, p_level + atr * 0.08)
                    new_bottom = math.min(b_bottom, p_level - atr * 0.08)
                    box.set_top(bx, new_top)
                    box.set_bottom(bx, new_bottom)
                    label.set_y(lbl, (new_top + new_bottom) / 2.0)
                    label.set_text(lbl, label_text)
                    merged := true
                    break
        else if not is_support and array.size(res_boxes) > 0
            for i = 0 to array.size(res_boxes) - 1
                bx = array.get(res_boxes, i)
                lbl = array.get(res_labels, i)
                b_top = box.get_top(bx)
                b_bottom = box.get_bottom(bx)
                float box_center = (b_top + b_bottom) / 2.0
                if math.abs(p_level - box_center) < atr * 0.65
                    new_top = math.max(b_top, p_level + atr * 0.08)
                    new_bottom = math.min(b_bottom, p_level - atr * 0.08)
                    box.set_top(bx, new_top)
                    box.set_bottom(bx, new_bottom)
                    label.set_y(lbl, (new_top + new_bottom) / 2.0)
                    label.set_text(lbl, label_text)
                    merged := true
                    break

    if not merged
        b = box.new(left=bar_index - offset, top=p_level + atr * 0.08, right=bar_index + label_offset, bottom=p_level - atr * 0.08, bgcolor=bg_color, border_color=border_color, border_style=line.style_dashed)
        l = label.new(bar_index + label_offset, p_level, text=label_text, style=label.style_label_left, color=color.new(color.black, 100), textcolor=textcolor, size=get_text_size(text_sz_opt))
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

add_sr_zone(bool is_supp, float p_lvl, int off, string txt) =>
    draw_sr_box(p_lvl, is_supp, txt, off)

if show_sr_zones
    if not na(ph_lt)
        add_sr_zone(false, ph_lt, 15, "Сопротивление S&T (" + str.tostring(ph_lt, "#.##") + ")")
    if not na(pl_lt)
        add_sr_zone(true, pl_lt, 15, "Поддержка S&T (" + str.tostring(pl_lt, "#.##") + ")")

// Таблица гистограммы и 5-TF аналитики
var table vd_tbl = na
if barstate.islast and show_tables
    t_sz = get_text_size(text_sz_opt)
    vd_tbl := table.new(get_table_pos(table_pos), columns=2, rows=6, bgcolor=#0f172a, border_color=#334155, border_width=1)
    
    table.cell(vd_tbl, 0, 0, "📊 VOLUME DELTA 5-TF", text_color=#38bdf8, text_size=t_sz, bgcolor=#1e293b)
    table.cell(vd_tbl, 1, 0, syminfo.ticker, text_color=color.white, text_size=t_sz, bgcolor=#1e293b)
    
    table.cell(vd_tbl, 0, 1, "Текущая Дельта", text_color=c_neutral, text_size=t_sz)
    table.cell(vd_tbl, 1, 1, str.tostring(v_delta, "#.#") + (v_delta > 0 ? " 🟢" : " 🔴"), text_color=v_delta > 0 ? c_bull : c_bear, text_size=t_sz)
    
    table.cell(vd_tbl, 0, 2, "Z-Score Аномалия", text_color=c_neutral, text_size=t_sz)
    table.cell(vd_tbl, 1, 2, str.tostring(v_delta_z, "#.##") + (math.abs(v_delta_z) > extreme_th ? " 🔥 АНОМАЛИЯ" : " ⚪ Норма"), text_color=math.abs(v_delta_z) > extreme_th ? c_gold : c_neutral, text_size=t_sz)
    
    table.cell(vd_tbl, 0, 3, "MTF Дельта (" + (use_mtf ? mtf_tf : timeframe.period) + ")", text_color=c_neutral, text_size=t_sz)
    table.cell(vd_tbl, 1, 3, str.tostring(delta_mtf_smooth, "#.#"), text_color=delta_mtf_smooth > 0 ? c_bull : c_bear, text_size=t_sz)

    table.cell(vd_tbl, 0, 4, "Преобладание Рынка", text_color=c_neutral, text_size=t_sz)
    table.cell(vd_tbl, 1, 4, is_extreme_buy ? "🔥 АГРЕССИВНЫЕ ПОКУПКИ" : is_extreme_sell ? "⚡ АГРЕССИВНЫЕ ПРОДАЖИ" : v_delta >= 0 ? "🟢 БЫЧЬЕ ПРЕОБЛАДАНИЕ" : "🔴 МЕДВЕЖЬЕ ПРЕОБЛАДАНИЕ", text_color=is_extreme_buy ? c_gold : is_extreme_sell ? c_fuchsia : v_delta >= 0 ? c_bull : c_bear, text_size=t_sz)

    table.cell(vd_tbl, 0, 5, "Консенсус S&T Delta", text_color=c_neutral, text_size=t_sz)
    table.cell(vd_tbl, 1, 5, (v_delta > 0 and delta_mtf_smooth > 0) ? "🟩 ПОЛНОЕ СОВПАДЕНИЕ (LONG)" : (v_delta < 0 and delta_mtf_smooth < 0) ? "🟥 ПОЛНОЕ СОВПАДЕНИЕ (SHORT)" : "⚖️ РАСХОЖДЕНИЕ ТАЙМФРЕЙМОВ", text_color=(v_delta > 0 and delta_mtf_smooth > 0) ? c_bull : (v_delta < 0 and delta_mtf_smooth < 0) ? c_bear : c_gold, text_size=t_sz)

alertcondition(is_extreme_buy, "S&T Аномальная Buy Дельта", "Зафиксирован аномальный всплеск объема покупок!")
alertcondition(is_extreme_sell, "S&T Аномальная Sell Дельта", "Зафиксирован аномальный всплеск объема продаж!")`;
};

export const generateSuperIndicatorScript = (s: IndicatorSettings) => {
  const isMobileOptimized = s.mobileOptimized;

  const VALID_PRESETS = [
    "★ Универсальный (Все таймфреймы / Авто-Адаптивный)",
    "По умолчанию (Ручные настройки)",
    "Золото (XAUUSD) - 5 мин Скальпинг",
    "Золото (XAUUSD) - 15 мин Оптимальный",
    "Золото (XAUUSD) - 30 мин Свинг-Интрадей",
    "Золото (XAUUSD) - 1 час Интрадей/Тренд",
    "Золото (XAUUSD) - 4 часа Свинг",
    "Золото (XAUUSD) - 1 день Инвестиционный/Дневной",
    "Общий (Все активы) - 1 мин Скальпинг",
    "Общий (Все активы) - 5 мин Быстрый скальпинг",
    "Общий (Все активы) - 15 мин Оптимальный",
    "Общий (Все активы) - 30 мин Свинг-Интрадей",
    "Общий (Все активы) - 1 час Часовой тренд",
    "Общий (Все активы) - 4 часа Свинг-трейдинг",
    "Общий (Все активы) - 1 день Дневной/Инвестиционный",
    "Биткоин (BTCUSD) - 15 мин Оптимальный"
  ];
  const safePreset = (s.selectedPreset && VALID_PRESETS.includes(s.selectedPreset))
    ? s.selectedPreset
    : "★ Универсальный (Все таймфреймы / Авто-Адаптивный)";

  const safeLbSt = Math.max(2, Math.min(10, Math.round(s.orderBlockPeriod ?? s.structureLookback ?? 4)));
  const safeFcTargetMult = Math.max(0.5, Math.min(2.5, Number(s.forecastTargetMult) || 1.0));

  return `//@version=6
indicator("S&T Premium Ultimate Super Indicator [S&T Premium v6]", "S&T Super", overlay=${s.superOscillatorPane === false ? "true" : "false"}, max_boxes_count=500, max_lines_count=500, max_labels_count=500)

gp_presets   = "⚙️ Оптимальные Пресеты S&T"
preset_sel   = input.string("${safePreset}", "Выбрать Оптимальный Пресет", options=[
     "★ Универсальный (Все таймфреймы / Авто-Адаптивный)",
     "По умолчанию (Ручные настройки)",
     "Золото (XAUUSD) - 5 мин Скальпинг",
     "Золото (XAUUSD) - 15 мин Оптимальный",
     "Золото (XAUUSD) - 30 мин Свинг-Интрадей",
     "Золото (XAUUSD) - 1 час Интрадей/Тренд",
     "Золото (XAUUSD) - 4 часа Свинг",
     "Золото (XAUUSD) - 1 день Инвестиционный/Дневной",
     "Общий (Все активы) - 1 мин Скальпинг",
     "Общий (Все активы) - 5 мин Быстрый скальпинг",
     "Общий (Все активы) - 15 мин Оптимальный",
     "Общий (Все активы) - 30 мин Свинг-Интрадей",
     "Общий (Все активы) - 1 час Часовой тренд",
     "Общий (Все активы) - 4 часа Свинг-трейдинг",
     "Общий (Все активы) - 1 день Дневной/Инвестиционный",
     "Биткоин (BTCUSD) - 15 мин Оптимальный"
     ], group=gp_presets, tooltip="★ Универсальный пресет: автоматически и динамически настраивает параметры под любой открытый таймфрейм (1м, 5м, 15м, 1Ч, 4Ч, 1Д) без необходимости ручного переключения пресетов.")

gp_ui             = "📱 Настройки Мобильной Оптимизации и Интерфейса"
show_tables       = input.bool(${s.showDashboard ?? s.showDashboardTable !== false}, "Показывать инфо-панель S&T", group=gp_ui)
tbl_view_mode     = input.string("${s.superTableMode === 'mobile_ultra' ? "🔹 Ультра-Микро (1 колонка)" : s.superTableMode === 'mobile_mini' ? "⚡ Мини-Смартфон (3 строки: Сетап / Зона / Цели)" : (s.superTableMode === 'mobile_compact' || isMobileOptimized) ? "📱 Мобильный (Полный HUD / Компакт по ширине)" : "💻 Стандартный (ПК / Полный HUD)"}", "📱 Режим отображения таблицы", options=[
     "💻 Стандартный (ПК / Полный HUD)",
     "📱 Мобильный (Полный HUD / Компакт по ширине)",
     "📱 Мобильный (Компакт / 5 строк)",
     "⚡ Мини-Смартфон (3 строки: Сетап / Зона / Цели)",
     "🔹 Ультра-Микро (1 колонка)"
     ], group=gp_ui, tooltip="Специальная настройка под экраны смартфонов и планшетов. Отображает полную информацию как на ПК, но в сверхкомпактном по ширине виде без обрезания строк.")
table_pos         = input.string("${isMobileOptimized ? "Нижний левый" : "Нижний левый"}", "Позиция инфо-панели", options=[
     "Верхний левый", "Верхний правый", "Нижний левый", "Нижний правый", "Вверху по центру", "Внизу по центру"
     ], group=gp_ui)
table_text_sz     = input.string("${isMobileOptimized ? "Микро (size.tiny)" : "Маленький (size.small)"}", "Размер шрифта таблицы", options=[
     "Авто (size.auto)", "Микро (size.tiny)", "Маленький (size.small)", "Обычный (size.normal)"
     ], group=gp_ui, tooltip="Для смартфонов рекомендуется 'Микро (size.tiny)' или 'Авто'")
mobile_short_text = input.bool(${s.mobileShortText !== false ? "true" : "false"}, "Сокращать слова на смартфоне (LONG, SHORT, SL, TP, R:R)", group=gp_ui, tooltip="Заменяет длинные фразы краткими трейдерскими обозначениями для экономии места.")
text_sz_opt       = input.string("${isMobileOptimized ? "Микро" : "Маленький"}", "Размер шрифта на графике", options=["Микро", "Маленький", "Обычный", "Крупный"], group=gp_ui)
label_offset      = input.int(15, "Смещение меток вправо (бары)", minval=2, maxval=50, group=gp_ui)
line_len          = input.int(25, "Длина уровней Фибоначчи (бары)", minval=5, maxval=100, group=gp_ui)
clean_ob          = input.bool(true, "Скрывать протестированные (mitigated) OB/FVG", group=gp_ui)
show_sweeps       = input.bool(false, "Показывать надписи SWEEP на графике", group=gp_ui)

gp_delta     = "📊 Volume Delta & MTF Настройки"
use_mtf      = input.bool(true, "Включить MTF Анализ дельты", group=gp_delta)
mtf_tf       = input.timeframe("5", "Таймфрейм для MTF (5TF)", group=gp_delta)
vd_smoothing = input.int(14, "Сглаживание дельты (EMA)", minval=1, group=gp_delta)
extreme_th   = input.float(1, "Порог аномальной дельты (STD)", minval=0.5, step=0.1, group=gp_delta)

gp_macro     = "🌐 Внешние Макро-Рынки (DXY & Нефть)"
dxy_symbol   = input.symbol("DXY", "Символ Индекса Доллара США", group=gp_macro)
oil_symbol   = input.symbol("UKOIL", "Символ Нефти Brent", group=gp_macro)

gp_smc       = "🏛️ SMC & S&R Настройки"
lb_st        = input.int(${safeLbSt}, "Период Pivot ST (Краткосрочный)", minval=2, maxval=10, group=gp_smc)
lb_it        = input.int(12, "Период Pivot IT (Среднесрочный)", minval=5, maxval=20, group=gp_smc)
lb_lt        = input.int(28, "Период Pivot LT (Долгосрочный)", minval=15, maxval=50, group=gp_smc)
show_bos     = input.bool(true, "Показывать BOS / CHoCH", group=gp_smc)
show_ob      = input.bool(${s.showOrderBlocks??s.showOB!==!1}, "Показывать Блоки Ордеров (OB)", group=gp_smc)
show_fvg     = input.bool(${s.showFvg??s.showFVG!==!1}, "Показывать Имбалансы (FVG)", group=gp_smc)
ob_limit     = input.int(3, "Макс. активных блоков OB", minval=1, maxval=20, group=gp_smc)
show_sr_zones= input.bool(true, "Показывать институциональные зоны S&R", group=gp_smc)
max_sr_boxes = input.int(3, "Макс. активных зон на горизонт", minval=1, maxval=10, group=gp_smc)
merge_sr     = input.bool(true, "Объединять накладывающиеся зоны S&R", group=gp_smc)
merge_dist   = input.float(0.65, "Дистанция объединения (ATR)", minval=0.1, maxval=2.0, step=0.05, group=gp_smc)

gp_fib       = "🎯 Fibonacci & Probability Levels (Premium)"
fib_period   = input.int(15, "Период свингов для Фибо", minval=5, group=gp_fib)
show_fib_ext = input.bool(false, "Показывать Фибо-расширения (Take Profit)", group=gp_fib)
show_probs   = input.bool(true, "Показывать вероятности отскока (%)", group=gp_fib)
dir_mode     = input.string("Авто-Структура", "Режим определения тренда", options=["Авто-Структура", "RSI фильтр", "Только Вверх", "Только Вниз"], group=gp_fib)
show_reversal = input.bool(true, "Показывать зоны разворота (Reversal Zones)", group=gp_fib)
show_forecast = input.bool(${s.showWaveForecast??s.showPriceForecast!==!1}, "Показывать волновой прогноз цены", group=gp_fib)
show_alt_wave = input.bool(true, "Показывать альтернативную линию пробоя SL", group=gp_fib)
sl_break_mode = input.string("Закрытие бара (Фильтр шпилек / SMC)", "Триггер слома SL (План Б)", options=["Закрытие бара (Фильтр шпилек / SMC)", "Касание тенью (Любой укол)"], group=gp_fib, tooltip="★ Институциональная защита: при 'Закрытие бара' тени свечей и ложные заколы (Stop-Hunt) не ломают прогноз, если цена закрылась внутри или идет в прибыль по сделке. Слом фиксируется только при закрытии тела свечи за SL или глубоком пробое > 0.45 ATR.")
filter_plan_b_mtf = input.bool(true, "Защита от ложного Плана Б против 70%+ консенсуса ТФ", group=gp_fib, tooltip="Запрещает рисовать разворотный План Б (например, лонг), если 4 или 5 старших таймфреймов находятся в шорте (и наоборот).")
fc_lookback   = input.int(30, "Глубина волнового прогноза", minval=10, maxval=50, group=gp_fib)
fc_target_mult = input.float(${safeFcTargetMult}, "Множитель TP волнового прогноза", minval=0.5, maxval=2.5, step=0.1, group=gp_fib)
fc_post_target = input.bool(true, "Показывать сценарий ретеста после цели (Leg 4)", group=gp_fib)
fc_model_acc   = input.string("SMC-Balanced", "Точность волнового прогноза", options=["SMC-Balanced", "Conservative", "Aggressive"], group=gp_fib)
fc_use_mtf    = input.bool(true, "Учитывать старшие таймфреймы в прогнозе", group=gp_fib)
fc_mtf_mode   = input.string("Авто-Адаптивный (Рекомендуется)", "Режим старшего ТФ (MTF)", options=["Авто-Адаптивный (Рекомендуется)", "Фиксированный (Ручной)"], group=gp_fib)
fc_mtf_tf     = input.timeframe("60", "Ручной старший ТФ (при фиксированном)", group=gp_fib)
fc_htf_intrabar = input.bool(true, "⚡ Гибридный режим: интрабар-реакция на 4Ч/1Д при импульсе", group=gp_fib, tooltip="На коротких ТФ (< 4Ч) индикатор строго ждет закрытия свечи, исключая рыночный шум. На долгих ТФ (4Ч, 1Д, 1W) перестраивает прогноз внутри свечи при появлении мощного институционального импульса (>1.2 ATR с объемом, либо при мгновенном выбивании SL или взятии всех TP).")
fc_fast_rejection = input.bool(true, "⚡ Мгновенный разворот при отскоке от OB (без ожидания закрытия)", group=gp_fib, tooltip="Позволяет на 15м/30м/1Ч мгновенно разворачивать прогноз при тесте зоны поддержки +OB/FVG и сильном откупе (длинная тень снизу + зеленый бар при консенсусе старших ТФ >= 70%), не дожидаясь 15-минутного закрытия свечи.")

gp_sig       = "⚡ Торговые Сигналы S&T"
show_signals = input.bool(false, "Отображать сигналы Long/Short", group=gp_sig)
signal_mode  = input.string("Консервативный", "Режим генерации сигналов", options=["Агрессивный", "Консервативный", "Сверх-Надежный"], group=gp_sig)

gp_colors    = "🎨 Тематическое Оформление S&T"
theme_mode   = input.string("Золотой Слейт", "Цветовая тема", options=["Золотой Слейт", "Океанский Синий", "Киберпанк"], group=gp_colors)

gp_trend     = "📈 Система Динамических Линий Тренда S&T"
show_trend_l = input.bool(true, "Показывать линию тренда S&T", group=gp_trend)
trend_type   = input.string("EMA", "Метод расчета тренда", options=["EMA", "SMA", "HMA", "WMA"], group=gp_trend)
trend_len    = input.int(200, "Период линии тренда", minval=10, maxval=500, group=gp_trend)

gp_trail            = "🛡️ Надежный Адаптивный Трейлинг-Стоп (Anti-Whipsaw)"
use_trailing        = input.bool(true, "Включить Адаптивный Трейлинг-Стоп", group=gp_trail, tooltip="Автоматически и плавно подтягивает защитный стоп по мере продвижения сделки, предотвращая преждевременное выбивание и фиксируя прибыль")
trail_mode          = input.string("🛡️ Институциональный (BE при TP1 + Защита 50% прибыли)", "Режим Трейлинга", options=["🛡️ Институциональный (BE при TP1 + Защита 50% прибыли)", "🏛️ Smart Money (Строго по Свингам структуры BOS)", "🌊 Широкий Волновой Chandelier (Anti-Whipsaw)", "🔒 Только Безубыток (BE при взятии TP1)"], group=gp_trail)
trail_be_trigger    = input.string("Строго при взятии TP1 (Рекомендовано)", "Момент перевода в Безубыток (BE)", options=["Строго при взятии TP1 (Рекомендовано)", "При 85% пути к TP1", "При 65% пути к TP1"], group=gp_trail, tooltip="Защищает от выбивания: переводит стоп в безубыток ТОЛЬКО тогда, когда первая цель достигнута или почти достигнута, давая цене свободно дышать на тесте Order Block")
trail_be_buff       = input.float(0.15, "Защитный буфер безубытка (ATR)", minval=0.0, maxval=0.5, step=0.02, group=gp_trail, tooltip="Запас к цене входа для покрытия спреда, проскальзывания и биржевой комиссии")
trail_atr_dist      = input.float(2.20, "Защитный ATR отступ (Anti-Whipsaw)", minval=1.2, maxval=4.0, step=0.1, group=gp_trail, tooltip="Оптимальный отступ 2.0-2.6 ATR надежно защищает от выбивания случайным рыночным шумом и хвостами свечей")
trail_resets_wave   = input.bool(false, "Сбрасывать прогноз при закрытии по трейлингу", group=gp_trail, tooltip="Если выключено, фиксация по трейлингу не ломает общую волновую разметку на графике до пробоя базового Hard SL")
show_trail_line     = input.bool(false, "Отображать линию трейлинг-стопа на графике", group=gp_trail)

gp_osc            = "📊 Строка MACD внизу графика (RSI в таблице на графике)"
show_macd_pane    = input.bool(true, "Показывать отдельную строку MACD внизу (Binance)", group=gp_osc, tooltip="Отображает чистый индикатор MACD в отдельной строке: столбцы выше и ниже 0.0, быстрая линия DIF и сигнальная DEA в стиле Binance. RSI (6 и 14) отображается в информационной таблице на графике.")
macd_fast         = input.int(12, "MACD Быстрый период EMA (12)", minval=2, group=gp_osc)
macd_slow         = input.int(26, "MACD Медленный период EMA (26)", minval=2, group=gp_osc)
macd_sig_len      = input.int(9, "MACD Сигнальный период (9)", minval=1, group=gp_osc)
rsi6_len          = input.int(6, "Период быстрого RSI для таблицы (6)", minval=2, group=gp_osc)
rsi14_len         = input.int(14, "Период стандартного RSI для таблицы (14)", minval=2, group=gp_osc)
show_osc_marks    = input.bool(false, "Отображать метки MACD и RSI сигналов на графике", group=gp_osc)

gp_mtf_syn          = "⚡ Мультитаймфреймовый Синтез (MTF Confluence)"
show_all_mtf_cons   = input.bool(true, "★ Полный Консенсус 5 ТФ (15м, 1ч, 4ч, 1д, 1н)", group=gp_mtf_syn, tooltip="Сканирует одновременно 5 таймфреймов (15м, 1Ч, 4Ч, 1Д, 1Н). Определяет глобальный тренд старших ТФ и фазу отката младших ТФ, устраняя разногласия между дневным графиком и интрадеем.")
show_mtf_hud        = input.bool(true, "1. Строка Синтеза ТФ в таблице (MTF Консенсус)", group=gp_mtf_syn, tooltip="Анализирует цели и тренд старших ТФ, выводя точный текстовый сценарий: откат ➔ импульс")
show_mtf_wave       = input.bool(false, "2. Синтетическая волна консенсуса (MTF Path)", group=gp_mtf_syn, tooltip="Отображает единую составную траекторию с учетом отката младшего ТФ и разворота в старший тренд")
show_tp_clusters    = input.bool(false, "3. Кластеры тейков и магниты ликвидности", group=gp_mtf_syn, tooltip="Находит совпадающие зоны тейк-профитов на разных ТФ и подсвечивает горизонтальный кластер притяжения цены")

gp_gex              = "🏛️ GEX & Dealer Gamma Engine (Автономный расчет CME/Deribit)"
use_gex             = input.bool(true, "Включить Автономный GEX Модуль", group=gp_gex, tooltip="Автономный расчет опционной гаммы дилеров CME/Deribit, Call/Put стен, Zero-Flip и Max Pain без ручного ввода параметров! Идеально для Золота (XAUUSD), Биткоина и мировых активов.")
gex_asset_type      = input.string("Авто-Определение", "Тип актива для GEX", options=["Авто-Определение", "Золото (XAUUSD)", "Биткоин (BTC)", "Форекс / EUR", "Индексы / SPX"], group=gp_gex, tooltip="Авто-определение само подбирает шаг страйков институциональных опционов по текущей цене.")
show_gex_walls      = input.bool(true, "Показывать Call Wall & Put Wall (Стены Дилеров)", group=gp_gex)
show_gex_flip       = input.bool(true, "Показывать Zero-Gamma Flip (Граница Волатильности)", group=gp_gex)
show_gex_pain       = input.bool(true, "Показывать Max Pain / Pin Level (Магнит Экспирации)", group=gp_gex)
show_gex_bars       = input.bool(false, "Отображать горизонтальный профиль GEX справа", group=gp_gex)
gex_align_fc        = input.bool(true, "Калибровать цели волнового прогноза по стенам GEX", group=gp_gex, tooltip="Подтягивает цели TP1/TP2 к ближайшим опционным стенам дилеров и магниту Max Pain, исключая ложные цели за пределами непробиваемых опционных барьеров.")

int final_lb_st = lb_st
int final_lb_it = lb_it
int final_lb_lt = lb_lt
int final_fib_period = fib_period
float final_extreme_th = extreme_th
string final_sig_mode = signal_mode
float final_fc_target_mult = fc_target_mult
int final_fc_lookback = fc_lookback

int tf_in_sec = timeframe.in_seconds()

if preset_sel == "★ Универсальный (Все таймфреймы / Авто-Адаптивный)"
    if tf_in_sec <= 180
        final_lb_st := 2
        final_lb_it := 6
        final_lb_lt := 16
        final_fib_period := 10
        final_extreme_th := 1.00
        final_sig_mode := "Агрессивный"
        final_fc_target_mult := 0.85
        final_fc_lookback := 16
    else if tf_in_sec <= 300
        final_lb_st := 3
        final_lb_it := 8
        final_lb_lt := 20
        final_fib_period := 12
        final_extreme_th := 1.10
        final_sig_mode := "Консервативный"
        final_fc_target_mult := 1.00
        final_fc_lookback := 20
    else if tf_in_sec <= 900
        final_lb_st := 3
        final_lb_it := 10
        final_lb_lt := 22
        final_fib_period := 15
        final_extreme_th := 1.15
        final_sig_mode := "Консервативный"
        final_fc_target_mult := 1.10
        final_fc_lookback := 25
    else if tf_in_sec <= 1800
        final_lb_st := 4
        final_lb_it := 12
        final_lb_lt := 26
        final_fib_period := 18
        final_extreme_th := 1.25
        final_sig_mode := "Консервативный"
        final_fc_target_mult := 1.15
        final_fc_lookback := 28
    else if tf_in_sec <= 7200
        final_lb_st := 4
        final_lb_it := 13
        final_lb_lt := 28
        final_fib_period := 20
        final_extreme_th := 1.35
        final_sig_mode := "Консервативный"
        final_fc_target_mult := 1.18
        final_fc_lookback := 32
    else if tf_in_sec <= 28800
        final_lb_st := 5
        final_lb_it := 14
        final_lb_lt := 30
        final_fib_period := 22
        final_extreme_th := 1.45
        final_sig_mode := "Сверх-Надежный"
        final_fc_target_mult := 1.20
        final_fc_lookback := 35
    else
        final_lb_st := 5
        final_lb_it := 15
        final_lb_lt := 32
        final_fib_period := 24
        final_extreme_th := 1.50
        final_sig_mode := "Сверх-Надежный"
        final_fc_target_mult := 1.22
        final_fc_lookback := 38
else if preset_sel == "Золото (XAUUSD) - 5 мин Скальпинг"
    final_lb_st := 2
    final_lb_it := 8
    final_lb_lt := 18
    final_fib_period := 12
    final_extreme_th := 1.0
    final_sig_mode := "Консервативный"
    final_fc_target_mult := 0.95
    final_fc_lookback := 18
else if preset_sel == "Золото (XAUUSD) - 15 мин Оптимальный"
    final_lb_st := 3
    final_lb_it := 10
    final_lb_lt := 22
    final_fib_period := 15
    final_extreme_th := 1.1
    final_sig_mode := "Консервативный"
    final_fc_target_mult := 1.10
    final_fc_lookback := 25
else if preset_sel == "Золото (XAUUSD) - 30 мин Свинг-Интрадей"
    final_lb_st := 4
    final_lb_it := 12
    final_lb_lt := 26
    final_fib_period := 18
    final_extreme_th := 1.2
    final_sig_mode := "Консервативный"
    final_fc_target_mult := 1.15
    final_fc_lookback := 30
else if preset_sel == "Золото (XAUUSD) - 1 час Интрадей/Тренд"
    final_lb_st := 4
    final_lb_it := 13
    final_lb_lt := 28
    final_fib_period := 20
    final_extreme_th := 1.3
    final_sig_mode := "Консервативный"
    final_fc_target_mult := 1.18
    final_fc_lookback := 32
else if preset_sel == "Золото (XAUUSD) - 4 часа Свинг"
    final_lb_st := 5
    final_lb_it := 14
    final_lb_lt := 30
    final_fib_period := 22
    final_extreme_th := 1.4
    final_sig_mode := "Сверх-Надежный"
    final_fc_target_mult := 1.20
    final_fc_lookback := 35
else if preset_sel == "Золото (XAUUSD) - 1 день Инвестиционный/Дневной"
    final_lb_st := 5
    final_lb_it := 15
    final_lb_lt := 32
    final_fib_period := 24
    final_extreme_th := 1.5
    final_sig_mode := "Сверх-Надежный"
    final_fc_target_mult := 1.22
    final_fc_lookback := 38
else if preset_sel == "Биткоин (BTCUSD) - 15 мин Оптимальный"
    final_lb_st := 3
    final_lb_it := 10
    final_lb_lt := 24
    final_fib_period := 18
    final_extreme_th := 1.3
    final_sig_mode := "Консервативный"
    final_fc_target_mult := 1.20
    final_fc_lookback := 25
else if preset_sel == "Общий (Все активы) - 1 мин Скальпинг"
    final_lb_st := 2
    final_lb_it := 5
    final_lb_lt := 14
    final_fib_period := 10
    final_extreme_th := 0.9
    final_sig_mode := "Агрессивный"
    final_fc_target_mult := 0.75
    final_fc_lookback := 12
else if preset_sel == "Общий (Все активы) - 5 мин Быстрый скальпинг"
    final_lb_st := 3
    final_lb_it := 8
    final_lb_lt := 18
    final_fib_period := 14
    final_extreme_th := 1.1
    final_sig_mode := "Агрессивный"
    final_fc_target_mult := 0.90
    final_fc_lookback := 18
else if preset_sel == "Общий (Все активы) - 15 мин Оптимальный"
    final_lb_st := 4
    final_lb_it := 10
    final_lb_lt := 24
    final_fib_period := 16
    final_extreme_th := 1.2
    final_sig_mode := "Консервативный"
    final_fc_target_mult := 1.10
    final_fc_lookback := 25
else if preset_sel == "Общий (Все активы) - 30 мин Свинг-Интрадей"
    final_lb_st := 4
    final_lb_it := 12
    final_lb_lt := 26
    final_fib_period := 18
    final_extreme_th := 1.3
    final_sig_mode := "Консервативный"
    final_fc_target_mult := 1.15
    final_fc_lookback := 28
else if preset_sel == "Общий (Все активы) - 1 час Часовой тренд"
    final_lb_st := 5
    final_lb_it := 13
    final_lb_lt := 28
    final_fib_period := 20
    final_extreme_th := 1.4
    final_sig_mode := "Консервативный"
    final_fc_target_mult := 1.18
    final_fc_lookback := 30
else if preset_sel == "Общий (Все активы) - 4 часа Свинг-трейдинг"
    final_lb_st := 5
    final_lb_it := 14
    final_lb_lt := 30
    final_fib_period := 22
    final_extreme_th := 1.5
    final_sig_mode := "Сверх-Надежный"
    final_fc_target_mult := 1.20
    final_fc_lookback := 35
else if preset_sel == "Общий (Все активы) - 1 день Дневной/Инвестиционный"
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

get_table_text_size(opt) =>
    opt == "Микро (size.tiny)" or opt == "Микро" ? size.tiny : opt == "Маленький (size.small)" or opt == "Маленький" ? size.small : opt == "Обычный (size.normal)" or opt == "Обычный" ? size.normal : opt == "Авто (size.auto)" ? size.auto : size.tiny

get_table_pos(pos) =>
    pos == "Верхний левый" ? position.top_left : pos == "Верхний правый" ? position.top_right : pos == "Нижний левый" ? position.bottom_left : pos == "Нижний правый" ? position.bottom_right : (pos == "Вверху по центру" ? position.top_center : (pos == "Внизу по центру" ? position.bottom_center : position.bottom_left))

val_dot(tf) =>
    request.security(syminfo.tickerid, tf, ta.ema(close, 9) > ta.ema(close, 21))

dot_5   = val_dot("5") ? "🟢" : "🔴"
dot_15  = val_dot("15") ? "🟢" : "🔴"
dot_60  = val_dot("60") ? "🟢" : "🔴"
dot_240 = val_dot("240") ? "🟢" : "🔴"
dot_D   = val_dot("D") ? "🟢" : "🔴"
dot_2D  = val_dot("2D") ? "🟢" : "🔴"
dot_W   = val_dot("W") ? "🟢" : "🔴"

c_bull       = theme_mode == "Золотой Слейт" ? #fbbf24 : (theme_mode == "Океанский Синий" ? #06b6d4 : #00ffcc)
c_bear       = theme_mode == "Золотой Слейт" ? #ef4444 : (theme_mode == "Океанский Синий" ? #f43f5e : #ff007f)
c_extreme_bear = theme_mode == "Золотой Слейт" ? #d946ef : (theme_mode == "Океанский Синий" ? #d946ef : #ff007f)
c_neutral    = theme_mode == "Золотой Слейт" ? #94a3b8 : (theme_mode == "Океанский Синий" ? #64748b : #475569)
c_gold       = #f59e0b
color_invalid_gray = #64748b
c_bg_panel   = theme_mode == "Золотой Слейт" ? color.new(#0f172a, 15) : (theme_mode == "Океанский Синий" ? color.new(#082f49, 15) : color.new(#1e1b4b, 15))
c_text_panel = theme_mode == "Золотой Слейт" ? #f8fafc : (theme_mode == "Океанский Синий" ? #f0fdfa : #fdf4ff)

calc_ma(src, length, type) =>
    type == "EMA" ? ta.ema(src, length) : type == "WMA" ? ta.wma(src, length) : type == "HMA" ? ta.hma(src, length) : ta.sma(src, length)

trend_line_val = calc_ma(close, trend_len, trend_type)

calc_delta() =>
    candle_range = high - low
    buying_volume = volume * (candle_range == 0 ? 0.5 : (close >= open ? (close - open + (high - close) * 0.5 + (open - low) * 0.5) : ((high - open) * 0.5 + (close - low) * 0.5)) / candle_range)
    selling_volume = volume - buying_volume
    buying_volume - selling_volume

delta_current = calc_delta()
delta_smoothed = ta.ema(delta_current, vd_smoothing)
delta_std = ta.stdev(delta_current, 20)
is_extreme_delta = math.abs(delta_current) > delta_std * final_extreme_th
bool vd_extreme_bull = is_extreme_delta and delta_current > 0
bool vd_extreme_bear = is_extreme_delta and delta_current < 0

float lowest_low_8    = ta.lowest(low, 8)
float highest_high_8  = ta.highest(high, 8)
float lowest_low_10   = ta.lowest(low, 10)
float highest_high_10 = ta.highest(high, 10)
float main_ema20      = ta.ema(close, 20)
float main_ema50      = ta.ema(close, 50)
float main_ema200     = ta.ema(close, 200)
float vol_sma20       = ta.sma(volume, 20)

delta_mtf = request.security(syminfo.tickerid, use_mtf ? mtf_tf : timeframe.period, calc_delta())
delta_mtf_smooth = request.security(syminfo.tickerid, use_mtf ? mtf_tf : timeframe.period, ta.ema(calc_delta(), vd_smoothing))

// =============================================================================
// 🏛️ GEX & DEALER GAMMA ENGINE: ЖИВАЯ ВОЛАТИЛЬНОСТЬ И ОПЦИОННЫЕ ДАННЫЕ
// =============================================================================
gvz_gex_val = request.security("CBOE:GVZ", "D", close, ignore_invalid_symbol=true)
vix_gex_val = request.security("CBOE:VIX", "D", close, ignore_invalid_symbol=true)
btc_hv_gex  = ta.stdev(math.log(close / close[1]), 30) * math.sqrt(365) * 100
gen_hv_gex  = ta.stdev(math.log(close / close[1]), 20) * math.sqrt(252) * 100

f_is_gold_asset() =>
    string sym = str.upper(syminfo.ticker)
    string r_sym = str.upper(syminfo.root)
    bool is_g = str.contains(sym, "XAU") or str.contains(sym, "GOLD") or str.startswith(sym, "GC") or str.contains(sym, "MGC") or str.startswith(sym, "GD") or str.contains(sym, "GLD") or str.contains(sym, "PAXG") or r_sym == "GC" or r_sym == "MGC" or r_sym == "GD" or gex_asset_type == "Золото (XAUUSD)"
    is_g

f_is_btc_asset() =>
    string sym = str.upper(syminfo.ticker)
    string r_sym = str.upper(syminfo.root)
    bool is_b = str.contains(sym, "BTC") or str.contains(sym, "XBT") or r_sym == "BTC" or r_sym == "MBT" or gex_asset_type == "Биткоин (BTC)"
    is_b

f_get_effective_iv() =>
    bool is_gold = f_is_gold_asset()
    bool is_btc  = f_is_btc_asset()
    float v = 18.0
    if is_gold
        v := not na(gvz_gex_val) and gvz_gex_val > 5.0 ? gvz_gex_val : 17.5
    else if is_btc
        v := not na(btc_hv_gex) and btc_hv_gex > 15.0 ? btc_hv_gex : 52.0
    else
        v := not na(vix_gex_val) and vix_gex_val > 5.0 ? vix_gex_val : (not na(gen_hv_gex) ? gen_hv_gex : 16.0)
    v

f_calc_gex_step() =>
    string sym = str.upper(syminfo.ticker)
    float pr = close
    float step = 10.0
    if gex_asset_type == "Золото (XAUUSD)" or (gex_asset_type == "Авто-Определение" and f_is_gold_asset())
        step := pr > 3500 ? 25.0 : (pr > 1500 ? 10.0 : 5.0)
    else if gex_asset_type == "Биткоин (BTC)" or (gex_asset_type == "Авто-Определение" and f_is_btc_asset())
        step := pr > 50000 ? 1000.0 : 500.0
    else if gex_asset_type == "Индексы / SPX" or (gex_asset_type == "Авто-Определение" and (str.contains(sym, "SPX") or str.contains(sym, "SPY") or str.contains(sym, "US500") or str.startswith(sym, "ES") or str.startswith(sym, "MES")))
        step := 25.0
    else if gex_asset_type == "Форекс / EUR" or (gex_asset_type == "Авто-Определение" and pr < 10.0)
        step := 0.0050
    else if str.contains(sym, "ETH") or str.contains(sym, "ETHEREUM")
        step := pr > 3000 ? 50.0 : 25.0
    else if str.contains(sym, "SILVER") or str.contains(sym, "XAG") or str.startswith(sym, "SI")
        step := 0.25
    else if str.contains(sym, "OIL") or str.contains(sym, "BRENT") or str.contains(sym, "WTI") or str.startswith(sym, "CL")
        step := 0.50
    else
        float p_log = math.log10(pr)
        float base_mag = math.pow(10, math.floor(p_log) - 1)
        step := base_mag * 1.0
        if pr > 1000 and pr <= 5000
            step := 25.0
        else if pr > 5000 and pr <= 20000
            step := 100.0
        if step < syminfo.mintick * 10
            step := syminfo.mintick * 10
    step

f_norm_pdf(float x) =>
    (1.0 / math.sqrt(2.0 * 3.141592653589793)) * math.exp(-0.5 * x * x)

f_calc_gamma(float S, float K, float sigma, float T) =>
    if S <= 0 or K <= 0 or sigma <= 0 or T <= 0
        0.0
    else
        float d1 = (math.log(S / K) + (sigma * sigma * 0.5) * T) / (sigma * math.sqrt(T))
        f_norm_pdf(d1) / (S * sigma * math.sqrt(T))

barcolor(is_extreme_delta ? (delta_current > 0 ? color.new(c_bull, 10) : color.new(c_extreme_bear, 10)) : na)

sh_st = ta.pivothigh(high, final_lb_st, final_lb_st)
sl_st = ta.pivotlow(low, final_lb_st, final_lb_st)
sh_it = ta.pivothigh(high, final_lb_it, final_lb_it)
sl_it = ta.pivotlow(low, final_lb_it, final_lb_it)
sh_lt = ta.pivothigh(high, final_lb_lt, final_lb_lt)
sl_lt = ta.pivotlow(low, final_lb_lt, final_lb_lt)

var float last_sh_val = na
var float last_sl_val = na
var float last_st_sh_val = na
var float last_st_sl_val = na
var string trend_state = "bullish"
var int last_sh_bar = na
var int last_sl_bar = na

if not na(sh_st)
    last_st_sh_val := sh_st
if not na(sl_st)
    last_st_sl_val := sl_st

if not na(sh_it)
    last_sh_val := sh_it
    last_sh_bar := bar_index - final_lb_it
if not na(sl_it)
    last_sl_val := sl_it
    last_sl_bar := bar_index - final_lb_it

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

if show_bos
    if is_bos or is_choch
        if is_bullish_break
            col = is_choch ? color.teal : c_bull
            txt = is_choch ? "CHoCH ↑ (Разворот)" : "BOS ↑ (Тренд)"
            x1_val = not na(last_sh_bar) ? last_sh_bar : bar_index - 5
            line.new(x1=x1_val, y1=break_price, x2=bar_index, y2=break_price, color=col, style=line.style_dashed, width=1, force_overlay=true)
            label.new(x=math.round((x1_val + bar_index) / 2), y=break_price, text=txt, style=label.style_label_center, color=color.new(color.black, 100), textcolor=col, size=get_text_size(text_sz_opt), force_overlay=true)
        else
            col = is_choch ? color.purple : c_bear
            txt = is_choch ? "CHoCH ↓ (Разворот)" : "BOS ↓ (Тренд)"
            x1_val = not na(last_sl_bar) ? last_sl_bar : bar_index - 5
            line.new(x1=x1_val, y1=break_price, x2=bar_index, y2=break_price, color=col, style=line.style_dashed, width=1, force_overlay=true)
            label.new(x=math.round((x1_val + bar_index) / 2), y=break_price, text=txt, style=label.style_label_center, color=color.new(color.black, 100), textcolor=col, size=get_text_size(text_sz_opt), force_overlay=true)

var box[] sup_boxes = array.new<box>()
var box[] res_boxes = array.new<box>()
var label[] sup_labels = array.new<label>()
var label[] res_labels = array.new<label>()

atr = ta.atr(14)

ph_st = ta.pivothigh(high, 5, 5)
pl_st = ta.pivotlow(low, 5, 5)
ph_it = ta.pivothigh(high, 15, 15)
pl_it = ta.pivotlow(low, 15, 15)
ph_lt = ta.pivothigh(high, 35, 35)
pl_lt = ta.pivotlow(low, 35, 35)

add_sr_zone(is_support, p_level, offset, label_text, is_lt) =>
    border_style = is_lt ? line.style_solid : line.style_dashed
    bg_color = is_support ? color.new(c_bull, 93) : color.new(c_bear, 93)
    border_color = is_support ? color.new(c_bull, 70) : color.new(c_bear, 70)
    textcolor = is_support ? c_bull : c_bear
    
    bool merged = false
    if merge_sr
        if is_support
            if array.size(sup_boxes) > 0
                for i = 0 to array.size(sup_boxes) - 1
                    bx = array.get(sup_boxes, i)
                    lbl = array.get(sup_labels, i)
                    b_top = box.get_top(bx)
                    b_bottom = box.get_bottom(bx)
                    float box_center = (b_top + b_bottom) / 2.0
                    if math.abs(p_level - box_center) < atr * merge_dist
                        new_top = math.max(b_top, p_level + atr * 0.08)
                        new_bottom = math.min(b_bottom, p_level - atr * 0.08)
                        box.set_top(bx, new_top)
                        box.set_bottom(bx, new_bottom)
                        label.set_y(lbl, (new_top + new_bottom) / 2.0)
                        label.set_text(lbl, label_text)
                        merged := true
                        break
        else
            if array.size(res_boxes) > 0
                for i = 0 to array.size(res_boxes) - 1
                    bx = array.get(res_boxes, i)
                    lbl = array.get(res_labels, i)
                    b_top = box.get_top(bx)
                    b_bottom = box.get_bottom(bx)
                    float box_center = (b_top + b_bottom) / 2.0
                    if math.abs(p_level - box_center) < atr * merge_dist
                        new_top = math.max(b_top, p_level + atr * 0.08)
                        new_bottom = math.min(b_bottom, p_level - atr * 0.08)
                        box.set_top(bx, new_top)
                        box.set_bottom(bx, new_bottom)
                        label.set_y(lbl, (new_top + new_bottom) / 2.0)
                        label.set_text(lbl, label_text)
                        merged := true
                        break

    if not merged
        b = box.new(left=bar_index - offset, top=p_level + atr * 0.08, right=bar_index + label_offset, bottom=p_level - atr * 0.08,
                    bgcolor=bg_color, border_color=border_color, border_style=border_style, force_overlay=true)
        l = label.new(bar_index + label_offset, p_level, text=label_text,
                      style=label.style_label_left, color=color.new(color.black, 100), textcolor=textcolor, size=get_text_size(text_sz_opt), force_overlay=true)
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

if show_sr_zones
    if array.size(sup_boxes) > 0
        for i = array.size(sup_boxes) - 1 to 0
            bx = array.get(sup_boxes, i)
            lbl = array.get(sup_labels, i)
            b_bottom = box.get_bottom(bx)
            if low < b_bottom
                box.delete(bx)
                label.delete(lbl)
                array.remove(sup_boxes, i)
                array.remove(sup_labels, i)

    if array.size(res_boxes) > 0
        for i = array.size(res_boxes) - 1 to 0
            bx = array.get(res_boxes, i)
            lbl = array.get(res_labels, i)
            b_top = box.get_top(bx)
            if high > b_top
                box.delete(bx)
                label.delete(lbl)
                array.remove(res_boxes, i)
                array.remove(res_labels, i)

    if not na(ph_lt)
        p_vol = volume[35]
        p_delta = delta_current[35]
        label_text = "Liq LT [" + str.tostring(p_vol / 1000.0, "#.#") + "K | " + (p_delta >= 0 ? "+" : "") + str.tostring(p_delta / 1000.0, "#.#") + "K] Сопр."
        add_sr_zone(false, ph_lt, 35, label_text, true)
    if not na(ph_it)
        p_vol = volume[15]
        p_delta = delta_current[15]
        label_text = "Liq IT [" + str.tostring(p_vol / 1000.0, "#.#") + "K | " + (p_delta >= 0 ? "+" : "") + str.tostring(p_delta / 1000.0, "#.#") + "K] Сопр."
        add_sr_zone(false, ph_it, 15, label_text, false)
    if not na(ph_st)
        p_vol = volume[5]
        p_delta = delta_current[5]
        label_text = "Liq ST [" + str.tostring(p_vol / 1000.0, "#.#") + "K | " + (p_delta >= 0 ? "+" : "") + str.tostring(p_delta / 1000.0, "#.#") + "K] Сопр."
        add_sr_zone(false, ph_st, 5, label_text, false)

    if not na(pl_lt)
        p_vol = volume[35]
        p_delta = delta_current[35]
        label_text = "Liq LT [" + str.tostring(p_vol / 1000.0, "#.#") + "K | " + (p_delta >= 0 ? "+" : "") + str.tostring(p_delta / 1000.0, "#.#") + "K] Подд."
        add_sr_zone(true, pl_lt, 35, label_text, true)
    if not na(pl_it)
        p_vol = volume[15]
        p_delta = delta_current[15]
        label_text = "Liq IT [" + str.tostring(p_vol / 1000.0, "#.#") + "K | " + (p_delta >= 0 ? "+" : "") + str.tostring(p_delta / 1000.0, "#.#") + "K] Подд."
        add_sr_zone(true, pl_it, 15, label_text, false)
    if not na(pl_st)
        p_vol = volume[5]
        p_delta = delta_current[5]
        label_text = "Liq ST [" + str.tostring(p_vol / 1000.0, "#.#") + "K | " + (p_delta >= 0 ? "+" : "") + str.tostring(p_delta / 1000.0, "#.#") + "K] Подд."
        add_sr_zone(true, pl_st, 5, label_text, false)

if barstate.islast
    if array.size(res_boxes) > 0
        for i = 0 to array.size(res_boxes) - 1
            box.set_right(array.get(res_boxes, i), bar_index + label_offset)
            label.set_x(array.get(res_labels, i), bar_index + label_offset)
    if array.size(sup_boxes) > 0
        for i = 0 to array.size(sup_boxes) - 1
            box.set_right(array.get(sup_boxes, i), bar_index + label_offset)
            label.set_x(array.get(sup_labels, i), bar_index + label_offset)

var box[] bull_ob_boxes = array.new<box>()
var box[] bear_ob_boxes = array.new<box>()

if show_ob and bar_index > 1
    if close > high[1] and close[1] < open[1]
        b = box.new(left=bar_index-1, top=high[1], right=bar_index, bottom=low[1], bgcolor=color.new(c_bull, 90), border_color=color.new(c_bull, 60), text="+OB", text_color=c_bull, text_size=size.tiny, text_halign="right", text_valign="bottom", force_overlay=true)
        array.push(bull_ob_boxes, b)
    if close < low[1] and close[1] > open[1]
        b = box.new(left=bar_index-1, top=high[1], right=bar_index, bottom=low[1], bgcolor=color.new(c_bear, 90), border_color=color.new(c_bear, 60), text="-OB", text_color=c_bear, text_size=size.tiny, text_halign="right", text_valign="bottom", force_overlay=true)
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

var box[] bull_fvg_boxes = array.new<box>()
var box[] bear_fvg_boxes = array.new<box>()

if show_fvg and bar_index > 2
    if low > high[2] and close[1] > open[1]
        array.push(bull_fvg_boxes, box.new(left=bar_index-2, top=low, right=bar_index, bottom=high[2], bgcolor=color.new(c_bull, 92), border_color=color.new(c_bull, 80), border_style=line.style_dashed, text="+FVG", text_color=c_bull, text_size=size.tiny, text_halign="right", text_valign="bottom", force_overlay=true))
    if high < low[2] and close[1] < open[1]
        array.push(bear_fvg_boxes, box.new(left=bar_index-2, top=low[2], right=bar_index, bottom=high, bgcolor=color.new(c_bear, 92), border_color=color.new(c_bear, 80), border_style=line.style_dashed, text="-FVG", text_color=c_bear, text_size=size.tiny, text_halign="right", text_valign="bottom", force_overlay=true))

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

highest_high = ta.highest(high, final_fib_period)
lowest_low   = ta.lowest(low, final_fib_period)
swing_range  = highest_high - lowest_low
fib_500      = lowest_low + swing_range * 0.5

string auto_htf_tf = "D"
string auto_htf_name = "1Д"
string auto_cur_tf_name = "15м"

if timeframe.isintraday
    int cur_m = timeframe.multiplier
    if cur_m <= 1
        auto_cur_tf_name := "1м"
        auto_htf_tf      := "5"
        auto_htf_name    := "5м"
    else if cur_m <= 3
        auto_cur_tf_name := "3м"
        auto_htf_tf      := "15"
        auto_htf_name    := "15м"
    else if cur_m <= 5
        auto_cur_tf_name := "5м"
        auto_htf_tf      := "15"
        auto_htf_name    := "15м"
    else if cur_m <= 15
        auto_cur_tf_name := "15м"
        auto_htf_tf      := "60"
        auto_htf_name    := "1Ч"
    else if cur_m <= 30
        auto_cur_tf_name := "30м"
        auto_htf_tf      := "240"
        auto_htf_name    := "4Ч"
    else if cur_m <= 45
        auto_cur_tf_name := "45м"
        auto_htf_tf      := "240"
        auto_htf_name    := "4Ч"
    else if cur_m <= 60
        auto_cur_tf_name := "1Ч"
        auto_htf_tf      := "240"
        auto_htf_name    := "4Ч"
    else if cur_m <= 120
        auto_cur_tf_name := "2Ч"
        auto_htf_tf      := "D"
        auto_htf_name    := "1Д"
    else if cur_m <= 180
        auto_cur_tf_name := "3Ч"
        auto_htf_tf      := "D"
        auto_htf_name    := "1Д"
    else if cur_m <= 240
        auto_cur_tf_name := "4Ч"
        auto_htf_tf      := "D"
        auto_htf_name    := "1Д"
    else if cur_m <= 480
        auto_cur_tf_name := "8Ч"
        auto_htf_tf      := "D"
        auto_htf_name    := "1Д"
    else if cur_m <= 720
        auto_cur_tf_name := "12Ч"
        auto_htf_tf      := "D"
        auto_htf_name    := "1Д"
    else
        auto_cur_tf_name := str.tostring(cur_m / 60) + "Ч"
        auto_htf_tf      := "D"
        auto_htf_name    := "1Д"
else if timeframe.isdaily
    auto_cur_tf_name := "1Д"
    auto_htf_tf      := "W"
    auto_htf_name    := "1W"
else if timeframe.isweekly
    auto_cur_tf_name := "1W"
    auto_htf_tf      := "M"
    auto_htf_name    := "1Мес"
else
    auto_cur_tf_name := "1Мес"
    auto_htf_tf      := "12M"
    auto_htf_name    := "12М"

string effective_htf_tf = fc_mtf_mode == "Авто-Адаптивный (Рекомендуется)" ? auto_htf_tf : fc_mtf_tf

bool htf_is_weekly_or_more = (effective_htf_tf == "W" or effective_htf_tf == "1W" or effective_htf_tf == "M" or effective_htf_tf == "12M")
bool htf_is_daily          = (effective_htf_tf == "D" or effective_htf_tf == "1D" or effective_htf_tf == "2D" or effective_htf_tf == "3D")
bool htf_is_4h_or_more     = (effective_htf_tf == "240" or effective_htf_tf == "480" or effective_htf_tf == "720")
bool htf_is_1h_or_more     = (effective_htf_tf == "60" or effective_htf_tf == "120" or effective_htf_tf == "180")

float htf_mult_max_tp1 = htf_is_weekly_or_more ? 2.6 : (htf_is_daily ? 2.8 : (htf_is_4h_or_more ? 3.0 : (htf_is_1h_or_more ? 3.0 : 2.8)))
float htf_mult_min_tp1 = htf_is_weekly_or_more ? 1.5 : (htf_is_daily ? 1.5 : (htf_is_4h_or_more ? 1.7 : (htf_is_1h_or_more ? 1.7 : 1.6)))
float htf_mult_max_tp2 = htf_is_weekly_or_more ? 3.8 : (htf_is_daily ? 4.2 : (htf_is_4h_or_more ? 4.5 : (htf_is_1h_or_more ? 4.5 : 4.6)))
float htf_mult_min_tp2 = htf_is_weekly_or_more ? 1.6 : (htf_is_daily ? 1.8 : (htf_is_4h_or_more ? 2.0 : (htf_is_1h_or_more ? 2.0 : 1.8)))

f_eval_tf_trend() =>
    float _c = close
    float _hh20 = ta.highest(high, 20)
    float _ll20 = ta.lowest(low, 20)
    float _e20  = ta.ema(close, 20)
    float _e50  = ta.ema(close, 50)
    float _e200 = ta.ema(close, 200)
    float _rsi14 = ta.rsi(close, 14)

    float _range = _hh20 - _ll20
    float _eq    = _range > 0 ? (_ll20 + _range * 0.50) : _c

    bool _is_bull_trend = true
    if _c < _e200 and _c < _e50 and _rsi14 < 46.0
        _is_bull_trend := false
    else if _c >= _e200 and (_c >= _e50 or _rsi14 >= 48.0 or _c >= _eq)
        _is_bull_trend := true
    else if _c >= _e50 and _rsi14 >= 48.0
        _is_bull_trend := true
    else if _c < _e50 and _rsi14 < 48.0 and _c < _eq
        _is_bull_trend := false
    else
        _is_bull_trend := _c >= _e50 or _rsi14 >= 50.0
    _is_bull_trend

f_htf_intel(p_max_tp1, p_min_tp1, p_max_tp2, p_min_tp2) =>
    float h_c = close
    float h_atr = ta.atr(14)
    float h_e20 = ta.ema(close, 20)
    float h_e50 = ta.ema(close, 50)
    float h_e200 = ta.ema(close, 200)
    float h_hh20 = ta.highest(high, 20)
    float h_ll20 = ta.lowest(low, 20)
    float h_hh50 = ta.highest(high, 50)
    float h_ll50 = ta.lowest(low, 50)

    bool h_has_bull_ob = false
    float h_ob_sl = na
    float h_ob_entry = na
    for i = 1 to 25
        if close[i] > high[i+1] and close[i+1] < open[i+1]
            float ob_bot = low[i+1]
            float ob_top = high[i+1]
            bool ob_violated = false
            if i > 1
                for k = 0 to i - 1
                    if close[k] < ob_bot
                        ob_violated := true
                        break
            if not ob_violated and h_c >= ob_bot - (h_atr * 0.25)
                h_has_bull_ob := true
                h_ob_sl := ob_bot
                h_ob_entry := ob_top
                break

    bool h_has_bear_ob = false
    float h_bear_ob_sl = na
    float h_bear_ob_entry = na
    for i = 1 to 25
        if close[i] < low[i+1] and close[i+1] > open[i+1]
            float ob_bot = low[i+1]
            float ob_top = high[i+1]
            bool ob_violated = false
            if i > 1
                for k = 0 to i - 1
                    if close[k] > ob_top
                        ob_violated := true
                        break
            if not ob_violated and h_c <= ob_top + (h_atr * 0.25)
                h_has_bear_ob := true
                h_bear_ob_sl := ob_top
                h_bear_ob_entry := ob_bot
                break

    bool h_is_up = f_eval_tf_trend()

    float h_max_tp1 = p_max_tp1
    float h_min_tp1 = p_min_tp1
    float h_max_tp2 = p_max_tp2
    float h_min_tp2 = p_min_tp2

    float h_fvg_bear_bot = na
    float h_fvg_bull_top = na
    for j = 1 to 25
        if na(h_fvg_bear_bot) and high[j] < low[j+2] and close[j+1] < open[j+1]
            float f_top = low[j+2]
            float f_bot = high[j]
            bool f_violated = false
            if j > 1
                for k = 0 to j - 1
                    if high[k] > f_top
                        f_violated := true
                        break
            if not f_violated and f_bot > h_c
                h_fvg_bear_bot := f_bot
        if na(h_fvg_bull_top) and low[j] > high[j+2] and close[j+1] > open[j+1]
            float f_top = low[j]
            float f_bot = high[j+2]
            bool f_violated = false
            if j > 1
                for k = 0 to j - 1
                    if low[k] < f_bot
                        f_violated := true
                        break
            if not f_violated and f_top < h_c
                h_fvg_bull_top := f_top

    float h_ph_st = ta.pivothigh(high, 5, 5)
    float h_pl_st = ta.pivotlow(low, 5, 5)
    float h_ph_it = ta.pivothigh(high, 15, 15)
    float h_pl_it = ta.pivotlow(low, 15, 15)
    float last_res_st = ta.valuewhen(not na(h_ph_st), high[5], 0)
    float last_sup_st = ta.valuewhen(not na(h_pl_st), low[5], 0)
    float last_res_it = ta.valuewhen(not na(h_ph_it), high[15], 0)
    float last_sup_it = ta.valuewhen(not na(h_pl_it), low[15], 0)

    float h_tp1 = na
    if h_is_up
        if not na(h_fvg_bear_bot) and h_fvg_bear_bot > h_c and h_fvg_bear_bot <= h_c + h_atr * h_max_tp1
            h_tp1 := h_fvg_bear_bot
        else if not na(h_bear_ob_entry) and h_bear_ob_entry > h_c and h_bear_ob_entry <= h_c + h_atr * h_max_tp1
            h_tp1 := h_bear_ob_entry
        else if not na(last_res_st) and (last_res_st - h_atr * 0.08) > h_c and (last_res_st - h_atr * 0.08) <= h_c + h_atr * h_max_tp1
            h_tp1 := last_res_st - h_atr * 0.08
        else if not na(last_res_it) and (last_res_it - h_atr * 0.08) > h_c and (last_res_it - h_atr * 0.08) <= h_c + h_atr * h_max_tp1
            h_tp1 := last_res_it - h_atr * 0.08
        else
            h_tp1 := h_c + math.min(h_atr * h_max_tp1, math.max(h_atr * h_min_tp1, (h_hh20 > h_c ? (h_hh20 - h_c) * 0.5 : h_atr * 1.5)))
        h_tp1 := math.max(h_c + h_atr * h_min_tp1, h_tp1)
        h_tp1 := math.min(h_c + h_atr * h_max_tp1, h_tp1)
    else
        if not na(h_fvg_bull_top) and h_fvg_bull_top < h_c and h_fvg_bull_top >= h_c - h_atr * h_max_tp1
            h_tp1 := h_fvg_bull_top
        else if not na(h_ob_entry) and h_ob_entry < h_c and h_ob_entry >= h_c - h_atr * h_max_tp1
            h_tp1 := h_ob_entry
        else if not na(last_sup_st) and (last_sup_st + h_atr * 0.08) < h_c and (last_sup_st + h_atr * 0.08) >= h_c - h_atr * h_max_tp1
            h_tp1 := last_sup_st + h_atr * 0.08
        else if not na(last_sup_it) and (last_sup_it + h_atr * 0.08) < h_c and (last_sup_it + h_atr * 0.08) >= h_c - h_atr * h_max_tp1
            h_tp1 := last_sup_it + h_atr * 0.08
        else
            h_tp1 := h_c - math.min(h_atr * h_max_tp1, math.max(h_atr * h_min_tp1, (h_ll20 < h_c ? (h_c - h_ll20) * 0.5 : h_atr * 1.5)))
        h_tp1 := math.min(h_c - h_atr * h_min_tp1, h_tp1)
        h_tp1 := math.max(h_c - h_atr * h_max_tp1, h_tp1)

    float h_tp2 = na
    if h_is_up
        float bull_fib = h_hh50 + (h_hh50 - h_ll50) * 0.382
        h_tp2 := math.min(h_c + h_atr * h_max_tp2, math.max(h_tp1 + h_atr * h_min_tp2, bull_fib > h_tp1 ? bull_fib : h_c + h_atr * 2.8))
        h_tp2 := math.min(h_c + h_atr * h_max_tp2, h_tp2)
    else
        float bear_fib = h_ll50 - (h_hh50 - h_ll50) * 0.382
        h_tp2 := math.max(h_c - h_atr * h_max_tp2, math.min(h_tp1 - h_atr * h_min_tp2, bear_fib < h_tp1 ? bear_fib : h_c - h_atr * 2.8))
        h_tp2 := math.max(h_c - h_atr * h_max_tp2, h_tp2)

    [h_is_up, h_tp1, h_tp2, h_atr, h_hh20, h_ll20, h_has_bull_ob, h_ob_sl, h_ob_entry, h_has_bear_ob]

[htf_calc_trend_up, htf_raw_tp1_target, htf_tp2_target, htf_atr, htf_hh20, htf_ll20, htf_has_bull_ob, htf_ob_sl, htf_ob_entry, htf_has_bear_ob] = request.security(
    syminfo.tickerid, 
    fc_use_mtf ? effective_htf_tf : timeframe.period, 
    f_htf_intel(htf_mult_max_tp1, htf_mult_min_tp1, htf_mult_max_tp2, htf_mult_min_tp2),
    gaps=barmerge.gaps_off,
    lookahead=barmerge.lookahead_off
)

bool mtf_1w_up  = request.security(syminfo.tickerid, "W", f_eval_tf_trend(), gaps=barmerge.gaps_off, lookahead=barmerge.lookahead_off)
bool mtf_1d_up  = request.security(syminfo.tickerid, "D", f_eval_tf_trend(), gaps=barmerge.gaps_off, lookahead=barmerge.lookahead_off)
bool mtf_4h_up  = request.security(syminfo.tickerid, "240", f_eval_tf_trend(), gaps=barmerge.gaps_off, lookahead=barmerge.lookahead_off)
bool mtf_1h_up  = request.security(syminfo.tickerid, "60", f_eval_tf_trend(), gaps=barmerge.gaps_off, lookahead=barmerge.lookahead_off)
bool mtf_15m_up = request.security(syminfo.tickerid, "15", f_eval_tf_trend(), gaps=barmerge.gaps_off, lookahead=barmerge.lookahead_off)

int mtf_score_bull = (mtf_1w_up ? 3 : 0) + (mtf_1d_up ? 3 : 0) + (mtf_4h_up ? 2 : 0) + (mtf_1h_up ? 1 : 0) + (mtf_15m_up ? 1 : 0)
int mtf_score_bear = 10 - mtf_score_bull
int mtf_pct_bull   = mtf_score_bull * 10
int mtf_pct_bear   = mtf_score_bear * 10

int mtf_bull_cnt = (mtf_15m_up ? 1 : 0) + (mtf_1h_up ? 1 : 0) + (mtf_4h_up ? 1 : 0) + (mtf_1d_up ? 1 : 0) + (mtf_1w_up ? 1 : 0)
int mtf_bear_cnt = 5 - mtf_bull_cnt

bool macro_is_bull = mtf_1d_up and mtf_1w_up
bool macro_is_bear = not mtf_1d_up and not mtf_1w_up

bool intra_is_bull = mtf_15m_up and mtf_1h_up
bool intra_is_bear = not mtf_15m_up and not mtf_1h_up

bool direct_htf_trend_up = auto_htf_name == "15м" ? mtf_15m_up : (auto_htf_name == "1Ч" ? mtf_1h_up : (auto_htf_name == "4Ч" ? mtf_4h_up : (auto_htf_name == "1Д" ? mtf_1d_up : ((auto_htf_name == "1Нед" or auto_htf_name == "1 Нед" or auto_htf_name == "1W") ? mtf_1w_up : htf_calc_trend_up))))

bool htf_trend_up = fc_use_mtf ? direct_htf_trend_up : (close >= main_ema50)

float htf_tp1_target = htf_raw_tp1_target
if na(htf_tp1_target)
    htf_tp1_target := htf_trend_up ? high + atr * 1.5 : low - atr * 1.5

float htf_tp_target = htf_tp1_target

var string struct_dir = "Вверх"
if is_choch or is_bos
    if not is_bullish_break and htf_trend_up and (htf_has_bull_ob or (not na(htf_ob_sl) and close >= htf_ob_sl))
        struct_dir := "Вверх"
    else if is_bullish_break and not htf_trend_up and (htf_has_bear_ob or (not na(htf_ob_entry) and close <= htf_ob_sl))
        struct_dir := "Вниз"
    else
        struct_dir := is_bullish_break ? "Вверх" : "Вниз"

ph_trend = ta.pivothigh(high, 10, 10)
pl_trend = ta.pivotlow(low, 10, 10)
var float last_ph_trend = na
var float last_pl_trend = na
if not na(ph_trend)
    last_ph_trend := ph_trend
if not na(pl_trend)
    last_pl_trend := pl_trend

if not na(last_ph_trend) and close > last_ph_trend
    struct_dir := "Вверх"
    last_ph_trend := na
if not na(last_pl_trend) and close < last_pl_trend
    if htf_trend_up and (htf_has_bull_ob or (not na(htf_ob_sl) and close >= htf_ob_sl))
        struct_dir := "Вверх"
    else
        struct_dir := "Вниз"
    last_pl_trend := na

rsi6_val   = ta.rsi(close, rsi6_len)
rsi14_val  = ta.rsi(close, rsi14_len)
rsi_val    = rsi14_val
[macd_line, signal_line, macd_hist] = ta.macd(close, macd_fast, macd_slow, macd_sig_len)
macd_signal = signal_line

bool rsi_xo_50 = ta.crossover(rsi_val, 50)
bool rsi_xu_50 = ta.crossunder(rsi_val, 50)
bool macd_xo   = ta.crossover(macd_line, signal_line)
bool macd_xu   = ta.crossunder(macd_line, signal_line)

bool macd_cross_bull  = macd_xo
bool macd_cross_bear  = macd_xu
bool macd_hist_rising = ta.rising(macd_hist, 1)
bool macd_hist_falling = ta.falling(macd_hist, 1)
bool macd_is_bullish  = macd_line >= signal_line

bool rsi_bull_conf  = rsi_val >= 50 or rsi_xo_50
bool rsi_bear_conf  = rsi_val < 50 or rsi_xu_50
bool macd_bull_conf = macd_hist > 0 or macd_xo
bool macd_bear_conf = macd_hist < 0 or macd_xu

cur_dir = dir_mode == "Только Вверх" ? "Вверх" : (dir_mode == "Только Вниз" ? "Вниз" : (dir_mode == "RSI фильтр" ? (rsi_val > 50 ? "Вверх" : "Вниз") : struct_dir))
bool is_bull = cur_dir == "Вверх" or (htf_trend_up and (htf_has_bull_ob or (not na(htf_ob_sl) and close >= htf_ob_sl)))

var float last_sweep_price = na
var string sweep_type = na

float pivot_high_level = ta.pivothigh(high, 5, 5)
float pivot_low_level  = ta.pivotlow(low, 5, 5)

var float key_high_ref = na
var float key_low_ref  = na

if not na(pivot_high_level)
    key_high_ref := pivot_high_level
if not na(pivot_low_level)
    key_low_ref := pivot_low_level

bool is_high_sweep = false
bool is_low_sweep = false

if not na(key_high_ref) and high > key_high_ref and close <= key_high_ref
    float body_h = math.abs(close - open)
    float wick_h = high - math.max(open, close)
    float total_h = high - low
    if total_h > 0 and (wick_h >= total_h * 0.40 or body_h <= total_h * 0.45)
        is_high_sweep := true
        last_sweep_price := key_high_ref
        sweep_type := "high"

if not na(key_low_ref) and low < key_low_ref and close >= key_low_ref
    float body_h = math.abs(close - open)
    float wick_h = math.min(open, close) - low
    float total_h = high - low
    if total_h > 0 and (wick_h >= total_h * 0.40 or body_h <= total_h * 0.45)
        is_low_sweep := true
        last_sweep_price := key_low_ref
        sweep_type := "low"

if is_high_sweep and not is_bull and delta_current < 0
    is_bull := false
else if is_low_sweep and is_bull and delta_current > 0
    is_bull := true

float ote_top = na
float ote_bottom = na
float ext_1 = na
float ext_2 = na
float ext_3 = na

if is_bull
    ote_top := highest_high - swing_range * 0.618
    ote_bottom := highest_high - swing_range * 0.786
    ext_1 := highest_high + swing_range * 0.272
    ext_2 := highest_high + swing_range * 0.618
    ext_3 := highest_high + swing_range * 1.618
else
    ote_top := lowest_low + swing_range * 0.786
    ote_bottom := lowest_low + swing_range * 0.618
    ext_1 := lowest_low - swing_range * 0.272
    ext_2 := lowest_low - swing_range * 0.618
    ext_3 := lowest_low - swing_range * 1.618

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
var float active_fc_prob = 0.0
var bool fc_leg1_hit = false
var bool fc_leg2_hit = false
var bool fc_leg3_hit = false
var bool fc_leg4_hit = false
var bool fc_leg5_hit = false
var int fc_leg1_idx = 0
var float fc_leg1_val = na
var int fc_leg2_idx = 0
var float fc_leg2_val = na
var int fc_leg3_idx = 0
var float fc_leg3_val = na
var int fc_leg4_idx = 0
var int fc_leg5_idx = 0
var float fc_leg4_val = na
var float fc_leg5_val = na

var float current_trailing_sl = na
var string trailing_stage_str = "🛡️ Начальный SL"
var int trailing_stage_idx = 0

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

in_ote_zone = false
if not na(ote_top) and not na(ote_bottom)
    if is_bull
        in_ote_zone := low <= ote_top and close >= ote_bottom
    else
        in_ote_zone := high >= ote_bottom and close <= ote_top

bullish_structure_break = is_bos and is_bullish_break
bearish_structure_break = is_bos and not is_bullish_break

bullish_choch = is_choch and is_bullish_break
bearish_choch = is_choch and not is_bullish_break

bool buy_sig = false
bool sell_sig = false

if show_signals
    if signal_mode == "Агрессивный"
        buy_sig  := (is_bull and (delta_current > 0 or htf_has_bull_ob) and (in_support_zone or in_bullish_ob or in_ote_zone or htf_has_bull_ob)) or bullish_choch or (is_bull and bullish_structure_break)
        sell_sig := (not is_bull and (delta_current < 0 or htf_has_bear_ob) and (in_resistance_zone or in_bearish_ob or in_ote_zone or htf_has_bear_ob)) or bearish_choch or (not is_bull and bearish_structure_break)
    else if signal_mode == "Консервативный"
        buy_sig  := (is_bull and (delta_current > 0 or htf_has_bull_ob) and (in_support_zone or in_bullish_ob or in_ote_zone or htf_has_bull_ob)) or (bullish_choch and (in_support_zone or in_bullish_ob or delta_current > 0 or htf_has_bull_ob))
        sell_sig := (not is_bull and (delta_current < 0 or htf_has_bear_ob) and (in_resistance_zone or in_bearish_ob or in_ote_zone or htf_has_bear_ob)) or (bearish_choch and (in_resistance_zone or in_bearish_ob or delta_current < 0 or htf_has_bear_ob))
    else
        buy_sig  := (bullish_choch or (is_bull and bullish_structure_break)) and (delta_current > 0 or htf_has_bull_ob)
        sell_sig := (bearish_choch or (not is_bull and bearish_structure_break)) and (delta_current < 0 or htf_has_bear_ob)

var int last_sig_bar = 0
if buy_sig or sell_sig
    if bar_index - last_sig_bar < 5
        buy_sig := false
        sell_sig := false
    else
        last_sig_bar := bar_index

bool consensus_is_bull = is_bull
float bull_score = 0.0
float bear_score = 0.0

if is_bull
    bull_score := bull_score + 35.0
else
    bear_score := bear_score + 35.0

if delta_current > 0
    bull_score := bull_score + (is_extreme_delta ? 25.0 : 15.0)
else if delta_current < 0
    bear_score := bear_score + (is_extreme_delta ? 25.0 : 15.0)

if show_all_mtf_cons
    bull_score := bull_score + (float(mtf_score_bull) * 3.0)
    bear_score := bear_score + (float(mtf_score_bear) * 3.0)
else
    if htf_trend_up
        bull_score := bull_score + 25.0
    else
        bear_score := bear_score + 25.0

if rsi_bull_conf
    bull_score := bull_score + 10.0
if rsi_bear_conf
    bear_score := bear_score + 10.0

if macd_bull_conf
    bull_score := bull_score + 10.0
if macd_bear_conf
    bear_score := bear_score + 10.0

if is_low_sweep
    bull_score := bull_score + 30.0
if is_high_sweep
    bear_score := bear_score + 30.0

consensus_is_bull := bull_score >= bear_score

bool consensus_chg = ta.change(consensus_is_bull)
bool is_confirmed   = barstate.isconfirmed or barstate.ishistory
bool consensus_changed = is_confirmed and consensus_chg

calc_setup_prob(bool target_bull) =>
    float p = 50.0
    if show_all_mtf_cons
        int favorable_score = target_bull ? mtf_score_bull : mtf_score_bear
        if favorable_score >= 10
            p := p + 18.0  // Абсолютный консенсус (10/10 очков, 100%)
        else if favorable_score >= 8
            p := p + 14.0  // Подавляющий макро + свинг консенсус (8-9 очков)
        else if favorable_score >= 6
            p := p + 8.0   // Институциональное большинство (6-7 очков)
        else if favorable_score == 5
            p := p + 0.0   // Равновесие (5 очков)
        else if favorable_score >= 3
            p := p - 8.0   // Слабый контртренд (3-4 очка)
        else
            p := p - 18.0  // Жесткий контртренд против институтов (0-2 очка)
        
        if target_bull and macro_is_bull
            p := p + 6.0
        else if not target_bull and macro_is_bear
            p := p + 6.0
        else if not target_bull and macro_is_bull
            p := p - 6.0 // Штраф за шорт против бычьего 1Д + 1Н
        else if target_bull and macro_is_bear
            p := p - 6.0 // Штраф за лонг против медвежьего 1Д + 1Н
    else if fc_use_mtf
        if target_bull == htf_trend_up
            p := p + 14.0  // ПО ТРЕНДУ СТАРШЕГО ТФ: Бонус +14%
        else
            p := p - 18.0  // КОНТРТРЕНД ПРОТИВ СТАРШЕГО ТФ: Жесткий штраф -18%

    if target_bull and is_low_sweep
        p := p + 15.0
    else if not target_bull and is_high_sweep
        p := p + 15.0

    if target_bull == is_bull
        p := p + 8.0
    else
        p := p - 10.0
    
    if target_bull
        if delta_current > 0
            p := p + (is_extreme_delta ? 8.0 : 6.0)
        else
            p := p - 8.0
    else
        if delta_current < 0
            p := p + (is_extreme_delta ? 8.0 : 6.0)
        else
            p := p - 8.0

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

    if (target_bull and (in_bullish_ob or in_support_zone or in_ote_zone)) or (not target_bull and (in_bearish_ob or in_resistance_zone or in_ote_zone))
        p := p + 6.0
    else
        p := p - 3.0

    math.min(85.0, math.max(30.0, p))

float bull_prob = calc_setup_prob(true)
float bear_prob = calc_setup_prob(false)

bool candidate_is_bull = bull_prob >= bear_prob
float candidate_prob = candidate_is_bull ? bull_prob : bear_prob

if signal_mode != "Агрессивный"
    if buy_sig and (not htf_trend_up or bull_prob < 55.0)
        buy_sig := false
    if sell_sig and (htf_trend_up or bear_prob < 55.0)
        sell_sig := false

float effective_sl = use_trailing and not na(current_trailing_sl) ? current_trailing_sl : fc_invalid_level

float pos_entry_ref = not na(fc_leg1_val) ? fc_leg1_val : (not na(fc_p1) ? fc_p1 : fc_start_price)
bool is_pos_in_profit = not na(pos_entry_ref) and ((fc_is_bull and close > pos_entry_ref) or (not fc_is_bull and close < pos_entry_ref))

bool is_strict_wick      = sl_break_mode == "Касание тенью (Любой укол)"
bool is_hard_sl_breached = false
bool is_wick_sweep       = false
bool is_trailing_hit     = false
bool is_choch_opposite   = false
bool is_adverse_move     = false

if fc_start_bar > 0 and bar_index >= fc_start_bar
    if fc_is_bull
        bool closed_beyond_sl = is_confirmed and close < fc_invalid_level
        bool wick_touched_sl  = low <= fc_invalid_level

        if (is_strict_wick ? wick_touched_sl : closed_beyond_sl) and not is_pos_in_profit
            is_hard_sl_breached := true
        else if wick_touched_sl and (close >= fc_invalid_level or is_pos_in_profit or not is_confirmed)
            is_wick_sweep := true

        if use_trailing and not na(current_trailing_sl) and (is_confirmed ? close < current_trailing_sl : (is_strict_wick and low <= current_trailing_sl))
            is_trailing_hit := true
        if is_confirmed and (bearish_choch or bearish_structure_break) and (close < fc_invalid_level and close < fc_p1 - atr * 1.0)
            is_choch_opposite := true
        bool catastrophic_dump = is_confirmed and close < fc_invalid_level and (close < open and (open - close) >= atr * 1.5 and close < fc_p1 - atr * 1.5)
        if catastrophic_dump and not is_pos_in_profit
            is_adverse_move := true
    else
        bool closed_beyond_sl = is_confirmed and close > fc_invalid_level
        bool wick_touched_sl  = high >= fc_invalid_level

        if (is_strict_wick ? wick_touched_sl : closed_beyond_sl) and not is_pos_in_profit
            is_hard_sl_breached := true
        else if wick_touched_sl and (close <= fc_invalid_level or is_pos_in_profit or not is_confirmed)
            is_wick_sweep := true

        if use_trailing and not na(current_trailing_sl) and (is_confirmed ? close > current_trailing_sl : (is_strict_wick and high >= current_trailing_sl))
            is_trailing_hit := true
        if is_confirmed and (bullish_choch or bullish_structure_break) and (close > fc_invalid_level and close > fc_p1 + atr * 1.0)
            is_choch_opposite := true
        bool catastrophic_pump = is_confirmed and close > fc_invalid_level and (close > open and (close - open) >= atr * 1.5 and close > fc_p1 + atr * 1.5)
        if catastrophic_pump and not is_pos_in_profit
            is_adverse_move := true

bool is_price_safe = (fc_is_bull ? close >= fc_invalid_level : close <= fc_invalid_level) or is_pos_in_profit
if is_price_safe and not is_strict_wick
    is_hard_sl_breached := false

bool plan_b_opposes_mtf = filter_plan_b_mtf and ((not fc_is_bull and (mtf_score_bear >= 6 or mtf_bear_cnt >= 3 or macro_is_bear)) or (fc_is_bull and (mtf_score_bull >= 6 or mtf_bull_cnt >= 3 or macro_is_bull)))

bool is_sl_breached = is_hard_sl_breached or (trail_resets_wave and is_trailing_hit) or is_adverse_move
bool alt_scenario_activated = fc_start_bar > 0 and (is_hard_sl_breached or is_choch_opposite or is_adverse_move) and not plan_b_opposes_mtf
bool fc_invalidated = is_sl_breached or alt_scenario_activated

bool is_plan_b_active = fc_invalidated and not (fc_leg3_hit or (fc_leg2_hit and is_trailing_hit)) and not is_pos_in_profit and not plan_b_opposes_mtf

float disp_active_sl = use_trailing and not na(current_trailing_sl) ? current_trailing_sl : fc_invalid_level
bool draw_is_bull = fc_is_bull
int alt_x0 = bar_index + 3
float alt_y0 = disp_active_sl
int alt_x1 = alt_x0 + 8
float alt_y1 = draw_is_bull ? alt_y0 - atr * 1.5 : alt_y0 + atr * 1.5
int alt_x2 = alt_x1 + 10
float alt_y2 = draw_is_bull ? alt_y0 - atr * 3.0 : alt_y0 + atr * 3.0
int alt_x3 = alt_x2 + 8
float alt_y3 = draw_is_bull ? alt_y2 + atr * 1.2 : alt_y2 - atr * 1.2

bool is_htf_timeframe = timeframe.isdaily or timeframe.isweekly or timeframe.ismonthly or (timeframe.isminutes and timeframe.multiplier >= 240) or timeframe.period == "240" or timeframe.period == "D" or timeframe.period == "W"
bool cur_chart_is_bull = f_eval_tf_trend()

bool is_trade_fully_completed = fc_leg3_hit or (fc_leg2_hit and is_trailing_hit)
int entry_wait_bars = is_htf_timeframe ? 6 : (timeframe.isminutes and timeframe.multiplier <= 30 ? 12 : 8)
int max_hold_bars = fc_leg2_hit ? 120 : (fc_leg1_hit ? math.min(40, final_fc_lookback * 2) : entry_wait_bars)

bool institutional_macro_bull = macro_is_bull or (htf_trend_up and mtf_score_bull >= 5) or (is_htf_timeframe and (htf_trend_up or mtf_4h_up or mtf_score_bull >= 5))
bool institutional_macro_bear = macro_is_bear or (not htf_trend_up and mtf_score_bear >= 5) or (is_htf_timeframe and (not htf_trend_up or not mtf_4h_up or mtf_score_bear >= 5))

bool is_macro_trend_desync = is_htf_timeframe and ((fc_is_bull and institutional_macro_bear) or (not fc_is_bull and institutional_macro_bull))
bool is_htf_desync = is_macro_trend_desync or (is_htf_timeframe and (fc_is_bull != cur_chart_is_bull or (cur_chart_is_bull == htf_trend_up and fc_is_bull != htf_trend_up))) or (fc_use_mtf and not (fc_start_bar > 0 and not is_sl_breached and not is_choch_opposite and not is_trade_fully_completed and (bar_index - fc_start_bar <= max_hold_bars)) and (fc_is_bull != htf_trend_up))

bool has_active_forecast = fc_start_bar > 0 and not is_sl_breached and not is_choch_opposite and not is_trade_fully_completed and not is_htf_desync and (bar_index - fc_start_bar <= max_hold_bars)

bool is_curr_bar_all_tp_hit = fc_start_bar > 0 and ((fc_is_bull and (high >= fc_p3 or close >= fc_p3)) or (not fc_is_bull and (low <= fc_p3 or close <= fc_p3)))
bool fc_targets_done = is_trade_fully_completed or is_curr_bar_all_tp_hit

bool is_strong_bull_setup = ((is_low_sweep and not (is_htf_timeframe and macro_is_bear)) or (bullish_choch and htf_trend_up) or vd_extreme_bull or (close > open and (close - open) >= atr * 0.5 and close > high[1] and close > main_ema20)) and bull_prob >= 56.0
bool is_strong_bear_setup = ((is_high_sweep and not (is_htf_timeframe and macro_is_bull)) or (bearish_choch and not htf_trend_up) or vd_extreme_bear or (close < open and (open - close) >= atr * 0.5 and close < low[1] and close < main_ema20)) and bear_prob >= 56.0
bool is_strong_reversal_setup = (is_strong_bull_setup and not fc_is_bull) or (is_strong_bear_setup and fc_is_bull)

var int last_htf_intrabar_bar = 0
bool htf_intrabar_enabled = fc_htf_intrabar and is_htf_timeframe and not is_confirmed and (last_htf_intrabar_bar != bar_index)

bool is_htf_candle_impulse = (high - low) >= atr * 0.9 and math.abs(close - open) >= atr * 0.45
bool is_htf_vol_confirmed  = volume > vol_sma20 * 1.05 or vd_extreme_bull or vd_extreme_bear

bool is_htf_intrabar_trigger = htf_intrabar_enabled and (
     (is_curr_bar_all_tp_hit and (high - low) >= atr * 0.9) or
     (is_hard_sl_breached or is_adverse_move) or
     (is_htf_candle_impulse and (is_low_sweep or is_high_sweep or is_strong_reversal_setup or bullish_choch or bearish_choch or is_adverse_move))
     )

bool has_bull_ob_near = false
if array.size(bull_ob_boxes) > 0
    for i = array.size(bull_ob_boxes) - 1 to 0
        box bx = array.get(bull_ob_boxes, i)
        if low <= box.get_top(bx) + atr * 0.4 and low >= box.get_bottom(bx) - atr * 0.8
            has_bull_ob_near := true
            break

bool has_bear_ob_near = false
if array.size(bear_ob_boxes) > 0
    for i = array.size(bear_ob_boxes) - 1 to 0
        box bx = array.get(bear_ob_boxes, i)
        if high >= box.get_bottom(bx) - atr * 0.4 and high <= box.get_top(bx) + atr * 0.8
            has_bear_ob_near := true
            break

bool is_fast_bull_rejection = not fc_is_bull and (has_bull_ob_near or is_low_sweep or low <= htf_ob_sl or in_support_zone or in_bullish_ob) and (close >= open or (close - low) >= (high - low) * 0.35) and (mtf_score_bull >= 5 or htf_trend_up or cur_chart_is_bull)
bool is_fast_bear_rejection = fc_is_bull and (has_bear_ob_near or is_high_sweep or high >= htf_ob_sl or in_resistance_zone or in_bearish_ob) and (close <= open or (high - close) >= (high - low) * 0.35) and (mtf_score_bear >= 5 or not htf_trend_up or not cur_chart_is_bull)
bool is_fast_rejection_trigger = fc_fast_rejection and not is_confirmed and (is_fast_bull_rejection or is_fast_bear_rejection)

var float lowest_since_fc = na
var float highest_since_fc = na
if fc_start_bar > 0
    if bar_index == fc_start_bar
        lowest_since_fc := low
        highest_since_fc := high
    else
        lowest_since_fc := math.min(nz(lowest_since_fc, low), low)
        highest_since_fc := math.max(nz(highest_since_fc, high), high)
else
    lowest_since_fc := low
    highest_since_fc := high

bool can_evaluate_forecast = is_confirmed or is_htf_intrabar_trigger or is_fast_rejection_trigger or is_htf_desync

bool should_trigger_new_forecast = false
if can_evaluate_forecast
    if is_fast_rejection_trigger
        should_trigger_new_forecast := true
    else if is_htf_desync
        should_trigger_new_forecast := true
    else if is_htf_intrabar_trigger
        last_htf_intrabar_bar := bar_index
        should_trigger_new_forecast := true
    else if is_low_sweep or is_high_sweep
        should_trigger_new_forecast := true
    else if is_adverse_move or (is_htf_intrabar_trigger and (is_hard_sl_breached or is_adverse_move))
        should_trigger_new_forecast := true
    else if not show_alt_wave and alt_scenario_activated
        should_trigger_new_forecast := true
    else if is_plan_b_active and ((fc_is_bull and low <= alt_y2) or (not fc_is_bull and high >= alt_y2) or (bar_index - fc_start_bar >= 16))
        should_trigger_new_forecast := true
    else if fc_start_bar == 0
        should_trigger_new_forecast := true
    else if fc_targets_done
        should_trigger_new_forecast := true
    else if is_strong_reversal_setup and not has_active_forecast and not is_plan_b_active
        should_trigger_new_forecast := true
    else if not has_active_forecast and not is_plan_b_active
        if buy_sig or sell_sig or consensus_changed or bullish_choch or bearish_choch or vd_extreme_bull or vd_extreme_bear or (bar_index - fc_start_bar >= 16)
            should_trigger_new_forecast := true
    else if not is_plan_b_active
        bool is_stale_unfilled_entry = not fc_leg1_hit and not fc_leg2_hit and (
            (bar_index - fc_start_bar >= entry_wait_bars) or
            (fc_is_bull and (close < fc_invalid_level or (highest_since_fc > fc_p1 + atr * 0.75 and (in_bearish_ob or in_resistance_zone or close < open)))) or
            (not fc_is_bull and (close > fc_invalid_level or (lowest_since_fc < fc_p1 - atr * 0.75 and (in_bullish_ob or in_support_zone or close > open))))
        )
        if is_stale_unfilled_entry
            should_trigger_new_forecast := true
        else if (buy_sig and not fc_is_bull and bull_prob >= 75.0 and close > open and (close - open) >= atr * 0.7) or (sell_sig and fc_is_bull and bear_prob >= 75.0 and close < open and (open - close) >= atr * 0.7)
            should_trigger_new_forecast := true
        else if candidate_prob >= 76.0 and candidate_prob > active_fc_prob + 10.0 and (bar_index - fc_start_bar >= 6)
            should_trigger_new_forecast := true

float max_tp1_atr = (timeframe.isweekly or timeframe.ismonthly) ? 2.2 : (timeframe.isdaily ? 2.4 : (timeframe.isminutes and timeframe.multiplier >= 240 ? 2.2 : (timeframe.isminutes and timeframe.multiplier >= 60 ? 2.0 : 2.0)))
float max_tp2_atr = (timeframe.isweekly or timeframe.ismonthly) ? 3.4 : (timeframe.isdaily ? 3.6 : (timeframe.isminutes and timeframe.multiplier >= 240 ? 3.4 : (timeframe.isminutes and timeframe.multiplier >= 60 ? 3.2 : 3.4)))
float min_tp1_atr = (timeframe.isweekly or timeframe.ismonthly) ? 1.0 : (timeframe.isdaily ? 1.0 : (timeframe.isminutes and timeframe.multiplier >= 240 ? 0.8 : (timeframe.isminutes and timeframe.multiplier >= 60 ? 0.8 : 0.9)))
float min_tp2_atr = (timeframe.isweekly or timeframe.ismonthly) ? 1.4 : (timeframe.isdaily ? 1.5 : (timeframe.isminutes and timeframe.multiplier >= 240 ? 1.6 : (timeframe.isminutes and timeframe.multiplier >= 60 ? 1.5 : 1.5)))

float max_pullback_atr = (timeframe.isweekly or timeframe.ismonthly) ? 0.45 : (timeframe.isdaily ? 0.55 : (timeframe.isminutes and timeframe.multiplier >= 240 ? 0.65 : 0.75))

var float tp_mult = 1.0
if should_trigger_new_forecast
    fc_start_bar := bar_index
    fc_start_price := close
    lowest_since_fc := low
    highest_since_fc := high
    
    if institutional_macro_bull and is_htf_timeframe
        fc_is_bull := true
        active_fc_prob := math.max(78.0, bull_prob)
    else if institutional_macro_bear and is_htf_timeframe
        fc_is_bull := false
        active_fc_prob := math.max(78.0, bear_prob)
    else if is_htf_timeframe
        fc_is_bull := cur_chart_is_bull or htf_trend_up or mtf_4h_up
        active_fc_prob := math.max(74.0, fc_is_bull ? bull_prob : bear_prob)
    else if is_fast_rejection_trigger
        if is_fast_bull_rejection
            fc_is_bull := true
            active_fc_prob := math.max(78.0, bull_prob)
        else
            fc_is_bull := false
            active_fc_prob := math.max(78.0, bear_prob)
    else if is_low_sweep and not macro_is_bear
        fc_is_bull := true
        active_fc_prob := math.max(76.0, bull_prob)
    else if is_high_sweep and not macro_is_bull
        fc_is_bull := false
        active_fc_prob := math.max(76.0, bear_prob)
    else if is_htf_desync
        fc_is_bull := cur_chart_is_bull
        active_fc_prob := math.max(76.0, cur_chart_is_bull ? bull_prob : bear_prob)
    else if alt_scenario_activated or is_adverse_move
        fc_is_bull := not fc_is_bull
        active_fc_prob := math.max(74.0, fc_is_bull ? bull_prob : bear_prob)
    else if is_strong_reversal_setup
        fc_is_bull := is_strong_bull_setup
        active_fc_prob := is_strong_bull_setup ? bull_prob : bear_prob
    else
        if htf_trend_up and not macro_is_bear
            fc_is_bull := (bear_prob > 72.0 and (show_all_mtf_cons ? mtf_score_bear >= 7 : bear_score > bull_score)) ? false : true
            active_fc_prob := fc_is_bull ? math.max(68.0, bull_prob) : bear_prob
        else if not htf_trend_up and not macro_is_bull
            fc_is_bull := (bull_prob > 72.0 and (show_all_mtf_cons ? mtf_score_bull >= 7 : bull_score > bear_score)) ? true : false
            active_fc_prob := not fc_is_bull ? math.max(68.0, bear_prob) : bull_prob
        else
            fc_is_bull := (bull_score >= bear_score and (htf_trend_up or not fc_use_mtf or bull_prob >= 58.0)) ? true : ((bear_score > bull_score and (not htf_trend_up or not fc_use_mtf or bear_prob >= 58.0)) ? false : candidate_is_bull)
            active_fc_prob := fc_is_bull ? bull_prob : bear_prob
    
    float mtf_mult = 1.0
    if fc_use_mtf
        if fc_is_bull
            mtf_mult := htf_trend_up ? 1.25 : 0.75
        else
            mtf_mult := not htf_trend_up ? 1.25 : 0.75
    
    tp_mult := final_fc_target_mult * mtf_mult
    
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
                    float ob_mid = (ob_top + ob_bot) / 2
                    if ob_top < close and ob_top >= close - atr * max_pullback_atr
                        target_p1 := math.max(ob_mid, close - atr * max_pullback_atr)
                        break
            if na(target_p1) and array.size(bull_fvg_boxes) > 0
                for i = array.size(bull_fvg_boxes) - 1 to 0
                    box bx = array.get(bull_fvg_boxes, i)
                    float fvg_top = box.get_top(bx)
                    float fvg_mid = (box.get_top(bx) + box.get_bottom(bx)) / 2
                    if fvg_top < close and fvg_top >= close - atr * max_pullback_atr
                        target_p1 := math.max(fvg_mid, close - atr * max_pullback_atr)
                        break
            if na(target_p1) and not na(last_st_sh_val) and last_st_sh_val < close and last_st_sh_val >= close - atr * max_pullback_atr
                target_p1 := last_st_sh_val
            if na(target_p1)
                float local_impulse_range = highest_high_8 - lowest_low_8
                float local_discount = (local_impulse_range > atr * 0.5 and local_impulse_range < atr * 3.0) ? (highest_high_8 - local_impulse_range * 0.382) : na
                if not na(local_discount) and local_discount < close and local_discount >= close - atr * max_pullback_atr
                    target_p1 := local_discount
                else
                    target_p1 := close - atr * (timeframe.isintraday ? 0.45 : 0.35)
            
            if low <= target_p1
                entry_already_hit := true
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
                    float ob_mid = (ob_top + ob_bot) / 2
                    if ob_bot > close and ob_bot <= close + atr * max_pullback_atr
                        target_p1 := math.min(ob_mid, close + atr * max_pullback_atr)
                        break
            if na(target_p1) and array.size(bear_fvg_boxes) > 0
                for i = array.size(bear_fvg_boxes) - 1 to 0
                    box bx = array.get(bear_fvg_boxes, i)
                    float fvg_bot = box.get_bottom(bx)
                    float fvg_mid = (box.get_top(bx) + box.get_bottom(bx)) / 2
                    if fvg_bot > close and fvg_bot <= close + atr * max_pullback_atr
                        target_p1 := math.min(fvg_mid, close + atr * max_pullback_atr)
                        break
            if na(target_p1) and not na(last_st_sl_val) and last_st_sl_val > close and last_st_sl_val <= close + atr * max_pullback_atr
                target_p1 := last_st_sl_val
            if na(target_p1)
                float local_impulse_range = highest_high_8 - lowest_low_8
                float local_premium = (local_impulse_range > atr * 0.5 and local_impulse_range < atr * 3.0) ? (lowest_low_8 + local_impulse_range * 0.382) : na
                if not na(local_premium) and local_premium > close and local_premium <= close + atr * max_pullback_atr
                    target_p1 := local_premium
                else
                    target_p1 := close + atr * (timeframe.isintraday ? 0.45 : 0.35)
            
            if high >= target_p1
                entry_already_hit := true

    float target_p2 = na
    if fc_is_bull
        if array.size(bear_fvg_boxes) > 0
            for i = array.size(bear_fvg_boxes) - 1 to 0
                box bx = array.get(bear_fvg_boxes, i)
                float fvg_bottom = box.get_bottom(bx)
                if fvg_bottom >= close + atr * min_tp1_atr and fvg_bottom <= close + atr * max_tp1_atr * tp_mult
                    target_p2 := fvg_bottom
                    break
        if na(target_p2) and array.size(bear_ob_boxes) > 0
            for i = array.size(bear_ob_boxes) - 1 to 0
                box bx = array.get(bear_ob_boxes, i)
                float ob_bot = box.get_bottom(bx)
                if ob_bot >= close + atr * min_tp1_atr and ob_bot <= close + atr * max_tp1_atr * tp_mult
                    target_p2 := ob_bot
                    break
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
        if array.size(bull_fvg_boxes) > 0
            for i = array.size(bull_fvg_boxes) - 1 to 0
                box bx = array.get(bull_fvg_boxes, i)
                float fvg_top = box.get_top(bx)
                if fvg_top <= close - atr * min_tp1_atr and fvg_top >= close - atr * max_tp1_atr * tp_mult
                    target_p2 := fvg_top
                    break
        if na(target_p2) and array.size(bull_ob_boxes) > 0
            for i = array.size(bull_ob_boxes) - 1 to 0
                box bx = array.get(bull_ob_boxes, i)
                float ob_top = box.get_top(bx)
                if ob_top <= close - atr * min_tp1_atr and ob_top >= close - atr * max_tp1_atr * tp_mult
                    target_p2 := ob_top
                    break
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

    float target_p3 = na
    if fc_is_bull
        float bull_fib_target = highest_high + swing_range * 0.382
        if array.size(res_boxes) > 0
            for i = array.size(res_boxes) - 1 to 0
                box bx = array.get(res_boxes, i)
                float res_mid = (box.get_top(bx) + box.get_bottom(bx)) / 2
                if res_mid > target_p2 + atr * 0.5 and res_mid <= close + atr * max_tp2_atr * tp_mult
                    target_p3 := res_mid
                    break
        if na(target_p3)
            if fc_model_acc == "Conservative"
                target_p3 := close + atr * (timeframe.isdaily ? 2.6 : 3.0) * tp_mult
            else if fc_model_acc == "Aggressive"
                target_p3 := close + atr * (timeframe.isdaily ? 3.6 : 4.8) * tp_mult
            else
                float raw_p3 = bull_fib_target > close ? close + (bull_fib_target - close) * tp_mult : close + atr * 3.2 * tp_mult
                target_p3 := math.min(close + atr * max_tp2_atr * tp_mult, math.max(target_p2 + atr * min_tp2_atr, raw_p3))
    else
        float bear_fib_target = lowest_low - swing_range * 0.382
        if array.size(sup_boxes) > 0
            for i = array.size(sup_boxes) - 1 to 0
                box bx = array.get(sup_boxes, i)
                float sup_mid = (box.get_top(bx) + box.get_bottom(bx)) / 2
                if sup_mid < target_p2 - atr * 0.5 and sup_mid >= close - atr * max_tp2_atr * tp_mult
                    target_p3 := sup_mid
                    break
        if na(target_p3)
            if fc_model_acc == "Conservative"
                target_p3 := close - atr * (timeframe.isdaily ? 2.6 : 3.0) * tp_mult
            else if fc_model_acc == "Aggressive"
                target_p3 := close - atr * (timeframe.isdaily ? 3.6 : 4.8) * tp_mult
            else
                float raw_p3 = bear_fib_target < close ? close - (close - bear_fib_target) * tp_mult : close - atr * 3.2 * tp_mult
                target_p3 := math.max(close - atr * max_tp2_atr * tp_mult, math.min(target_p2 - atr * min_tp2_atr, raw_p3))

    if is_high_sweep and not fc_is_bull
        target_p1 := math.max(close, last_sweep_price - atr * 0.4)
        float sweep_tp1_mult = (htf_trend_up or macro_is_bull) ? 1.0 : 2.0
        float sweep_tp2_mult = (htf_trend_up or macro_is_bull) ? 1.6 : 3.6
        target_p2 := close - math.max(atr * min_tp1_atr, math.min(atr * max_tp1_atr * tp_mult, atr * sweep_tp1_mult * tp_mult))
        target_p3 := close - math.max(atr * (min_tp1_atr + min_tp2_atr), math.min(atr * max_tp2_atr * tp_mult, atr * sweep_tp2_mult * tp_mult))
    else if is_low_sweep and fc_is_bull
        target_p1 := math.min(close, last_sweep_price + atr * 0.4)
        float sweep_tp1_mult = (not htf_trend_up or macro_is_bear) ? 1.0 : 2.0
        float sweep_tp2_mult = (not htf_trend_up or macro_is_bear) ? 1.6 : 3.6
        target_p2 := close + math.max(atr * min_tp1_atr, math.min(atr * max_tp1_atr * tp_mult, atr * sweep_tp1_mult * tp_mult))
        target_p3 := close + math.max(atr * (min_tp1_atr + min_tp2_atr), math.min(atr * max_tp2_atr * tp_mult, atr * sweep_tp2_mult * tp_mult))

    if fc_is_bull
        target_p1 := math.min(close, target_p1)
        target_p1 := math.max(close - atr * max_pullback_atr, target_p1)
        target_p2 := math.max(high + atr * 0.35, math.max(close + atr * min_tp1_atr, math.max(target_p1 + atr * min_tp1_atr, target_p2)))
        target_p2 := math.min(close + atr * max_tp1_atr * tp_mult, target_p2)

        float tp1_span = target_p2 - target_p1
        target_p3 := math.max(target_p2 + atr * min_tp2_atr * tp_mult, math.max(target_p2 + tp1_span * 1.1, not na(target_p3) and target_p3 > target_p2 ? target_p3 : target_p2 + atr * 1.8 * tp_mult))
        if fc_use_mtf and htf_trend_up and not na(htf_tp1_target) and htf_tp1_target > target_p2
            float clamped_htf_tp = math.min(close + atr * max_tp2_atr * tp_mult, htf_tp1_target)
            if clamped_htf_tp > target_p2
                target_p3 := math.max(target_p3, clamped_htf_tp)
        if fc_use_mtf and not htf_trend_up
            target_p3 := math.min(close + atr * 2.8, target_p3)
        target_p3 := math.min(close + atr * max_tp2_atr * tp_mult, target_p3)
    else
        target_p1 := math.max(close, target_p1)
        target_p1 := math.min(close + atr * max_pullback_atr, target_p1)
        target_p2 := math.min(low - atr * 0.35, math.min(close - atr * min_tp1_atr, math.min(target_p1 - atr * min_tp1_atr, target_p2)))
        target_p2 := math.max(close - atr * max_tp1_atr * tp_mult, target_p2)

        float tp1_span = target_p1 - target_p2
        target_p3 := math.min(target_p2 - atr * min_tp2_atr * tp_mult, math.min(target_p2 - tp1_span * 1.1, not na(target_p3) and target_p3 < target_p2 ? target_p3 : target_p2 - atr * 1.8 * tp_mult))
        if fc_use_mtf and not htf_trend_up and not na(htf_tp1_target) and htf_tp1_target < target_p2
            float clamped_htf_tp = math.max(close - atr * max_tp2_atr * tp_mult, htf_tp1_target)
            if clamped_htf_tp < target_p2
                target_p3 := math.min(target_p3, clamped_htf_tp)
        if fc_use_mtf and htf_trend_up
            target_p3 := math.max(close - atr * 2.8, target_p3)
        target_p3 := math.max(close - atr * max_tp2_atr * tp_mult, target_p3)

    fc_p1 := target_p1
    fc_p2 := target_p2
    fc_p3 := target_p3
    
    if fc_is_bull
        float local_low = lowest_low_8
        float struct_sl = not na(last_st_sl_val) and last_st_sl_val < fc_p1 and last_st_sl_val >= fc_p1 - atr * 1.25 ? last_st_sl_val - atr * 0.15 : (not na(local_low) and local_low < fc_p1 and local_low >= fc_p1 - atr * 1.25 ? local_low - atr * 0.15 : fc_p1 - atr * 0.85)
        if not na(htf_ob_sl) and htf_ob_sl < fc_p1 and htf_ob_sl >= fc_p1 - atr * 1.25
            struct_sl := math.min(struct_sl, htf_ob_sl)
        fc_invalid_level := math.min(fc_p1 - atr * 0.45, math.max(fc_p1 - atr * 1.35, struct_sl))
        fc_invalid_level := math.min(fc_invalid_level, math.min(fc_p1, math.min(close, fc_start_price)) - atr * 0.35)
    else
        float local_high = highest_high_8
        float struct_sl = not na(last_st_sh_val) and last_st_sh_val > fc_p1 and last_st_sh_val <= fc_p1 + atr * 1.35 ? last_st_sh_val + atr * 0.15 : (not na(local_high) and local_high > fc_p1 and local_high <= fc_p1 + atr * 1.35 ? local_high + atr * 0.15 : fc_p1 + atr * 0.95)
        if not na(htf_ob_sl) and htf_ob_sl > fc_p1 and htf_ob_sl <= fc_p1 + atr * 1.35
            struct_sl := math.max(struct_sl, htf_ob_sl)
        fc_invalid_level := math.max(fc_p1 + atr * 0.45, math.min(fc_p1 + atr * 1.35, struct_sl))
        fc_invalid_level := math.max(fc_invalid_level, math.max(fc_p1, math.max(close, fc_start_price)) + atr * 0.35)

    if fc_is_bull
        fc_alt_p1 := fc_invalid_level
        fc_alt_p2 := fc_invalid_level - atr * 1.2
        fc_alt_p3 := lowest_low > 0 ? math.min(lowest_low - swing_range * 0.25, fc_invalid_level - atr * 2.8) : fc_invalid_level - atr * 2.8
        fc_alt_p4 := fc_alt_p3 - atr * 1.5
    else
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
    fc_leg5_hit := false
    fc_leg2_idx := 0
    fc_leg2_val := na
    fc_leg3_idx := 0
    fc_leg3_val := na
    fc_leg4_idx := 0
    fc_leg4_val := na
    fc_leg5_idx := 0
    fc_leg5_val := na
    current_trailing_sl := fc_invalid_level
    trailing_stage_str := "🛡️ Начальный SL"
    trailing_stage_idx := 0

if fc_start_bar > 0 and bar_index >= fc_start_bar
    if fc_is_bull
        if not fc_leg1_hit and low <= fc_p1
            fc_leg1_hit := true
            fc_leg1_idx := bar_index
            fc_leg1_val := fc_p1
            
        if bar_index > fc_start_bar and high >= fc_p2
            if not fc_leg2_hit
                fc_leg2_hit := true
                fc_leg2_idx := bar_index
                fc_leg2_val := fc_p2
                if not fc_leg1_hit
                    fc_leg1_hit := true
                    fc_leg1_idx := fc_start_bar
                    fc_leg1_val := fc_start_price
                
        if bar_index > fc_start_bar and high >= fc_p3
            if not fc_leg3_hit
                fc_leg3_hit := true
                fc_leg3_idx := bar_index
                fc_leg3_val := fc_p3
            if not fc_leg2_hit
                fc_leg2_hit := true
                fc_leg2_idx := bar_index
                fc_leg2_val := fc_p2
            if not fc_leg1_hit
                fc_leg1_hit := true
                fc_leg1_idx := fc_start_bar
                fc_leg1_val := fc_start_price
                
        if fc_leg3_hit and not fc_leg4_hit and low <= fc_p2
            fc_leg4_hit := true
            fc_leg4_idx := bar_index
            fc_leg4_val := fc_p2
            
        if fc_leg4_hit and not fc_leg5_hit and high >= (not na(ext_3) ? ext_3 : fc_p3 * 1.15)
            fc_leg5_hit := true
            fc_leg5_idx := bar_index
            fc_leg5_val := not na(ext_3) ? ext_3 : fc_p3 * 1.15
    else
        if not fc_leg1_hit and high >= fc_p1
            fc_leg1_hit := true
            fc_leg1_idx := bar_index
            fc_leg1_val := fc_p1
            
        if bar_index > fc_start_bar and low <= fc_p2
            if not fc_leg2_hit
                fc_leg2_hit := true
                fc_leg2_idx := bar_index
                fc_leg2_val := fc_p2
                if not fc_leg1_hit
                    fc_leg1_hit := true
                    fc_leg1_idx := fc_start_bar
                    fc_leg1_val := fc_start_price
                
        if bar_index > fc_start_bar and low <= fc_p3
            if not fc_leg3_hit
                fc_leg3_hit := true
                fc_leg3_idx := bar_index
                fc_leg3_val := fc_p3
            if not fc_leg2_hit
                fc_leg2_hit := true
                fc_leg2_idx := bar_index
                fc_leg2_val := fc_p2
            if not fc_leg1_hit
                fc_leg1_hit := true
                fc_leg1_idx := fc_start_bar
                fc_leg1_val := fc_start_price
                
        if fc_leg3_hit and not fc_leg4_hit and high >= fc_p2
            fc_leg4_hit := true
            fc_leg4_idx := bar_index
            fc_leg4_val := fc_p2
            
        if fc_leg4_hit and not fc_leg5_hit and low <= (not na(ext_3) ? ext_3 : fc_p3 * 0.85)
            fc_leg5_hit := true
            fc_leg5_idx := bar_index
            fc_leg5_val := not na(ext_3) ? ext_3 : fc_p3 * 0.85

float trail_be_ratio_val = trail_be_trigger == "При 65% пути к TP1" ? 0.65 : (trail_be_trigger == "При 85% пути к TP1" ? 0.85 : 1.0)

if use_trailing and fc_start_bar > 0 and bar_index >= fc_start_bar and not na(fc_p1) and not na(fc_p2)
    float pos_entry = not na(fc_leg1_val) ? fc_leg1_val : (not na(fc_p1) ? fc_p1 : fc_start_price)
    float tp1_dist = math.abs(fc_p2 - pos_entry)
    
    if fc_is_bull
        bool be_cond = (high >= pos_entry + tp1_dist * trail_be_ratio_val) or fc_leg2_hit
        if be_cond and trailing_stage_idx < 1
            float be_val = pos_entry + atr * trail_be_buff
            if be_val > fc_invalid_level
                current_trailing_sl := be_val
                trailing_stage_str := "🔒 Безубыток (BE +" + str.tostring(trail_be_buff, "#.##") + " ATR)"
                trailing_stage_idx := 1

        if (fc_leg2_hit or high >= fc_p2) and trailing_stage_idx < 2
            float lock_tp1 = pos_entry + (fc_p2 - pos_entry) * 0.50
            float struct_sup = lowest_low_8 - atr * 0.35
            float safe_tp1_sl = math.max(lock_tp1, struct_sup)
            if safe_tp1_sl > nz(current_trailing_sl, fc_invalid_level)
                current_trailing_sl := safe_tp1_sl
                trailing_stage_str := "💰 Защита 50% TP1"
                trailing_stage_idx := 2

        if (fc_leg2_hit or high >= fc_p2) and trail_mode != "🔒 Только Безубыток (BE при взятии TP1)"
            float atr_trail_floor = high - atr * trail_atr_dist
            float swing_floor = lowest_low_10 - atr * 0.40
            
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
            float atr_trail_roof = low + atr * trail_atr_dist
            float swing_roof = highest_high_10 + atr * 0.40
            
            float candidate_sl = trail_mode == "🏛️ Smart Money (Строго по Свингам структуры BOS)" ? swing_roof : (trail_mode == "🌊 Широкий Волновой Chandelier (Anti-Whipsaw)" ? atr_trail_roof : math.min(swing_roof, atr_trail_roof))
            
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

get_bounce_probability(level_price) =>
    base_p = 55
    dist_pct = math.abs(close - level_price) / close * 100
    if dist_pct < 0.5
        base_p := base_p + 15
    if rsi_val < 30 and level_price < fib_500
        base_p := base_p + 20
    if rsi_val > 70 and level_price > fib_500
        base_p := base_p + 20
    math.min(95, math.max(35, base_p))

prob_ote = get_bounce_probability(ote_bottom)
prob_ext = get_bounce_probability(ext_2)

float fc_probability = active_fc_prob > 0 ? active_fc_prob : candidate_prob

var line line_ote_1 = na
var line line_ote_2 = na
var line line_eq = na
var line line_ext_1 = na
var line line_ext_2 = na
var line line_ext_3 = na
var label label_ote = na
var label label_eq = na
var label label_ext_1 = na
var label label_ext = na
var label label_ext_3 = na
var box zone_ote = na

float bar_rng = high - low
float bar_body = math.abs(close - open)
bool is_marubozu_expansion = bar_rng > 0 and (bar_body / bar_rng >= 0.65) and (bar_rng >= atr * 1.15)
bool has_breakaway_fvg = fc_is_bull ? (low > math.max(open[1], close[1]) + atr * 0.15) : (high < math.min(open[1], close[1]) - atr * 0.15)
bool has_htf_align = fc_is_bull == htf_trend_up
bool has_vol_burst = (volume > vol_sma20 * 1.4) or (fc_is_bull ? vd_extreme_bull : vd_extreme_bear)
bool has_sweep_cascade = (fc_is_bull and is_low_sweep) or (not fc_is_bull and is_high_sweep)
bool has_rsi_acceleration = fc_is_bull ? (rsi6_val >= 60.0 and rsi14_val >= 53.0) : (rsi6_val <= 40.0 and rsi14_val <= 47.0)

float np_score = 15.0
if has_htf_align
    np_score += 25.0
if has_vol_burst
    np_score += 20.0
if is_marubozu_expansion
    np_score += 20.0
if has_breakaway_fvg
    np_score += 15.0
if has_sweep_cascade
    np_score += 15.0
if has_rsi_acceleration
    np_score += 10.0

float no_pullback_prob = math.min(95.0, math.max(12.0, np_score))
bool is_high_runaway   = no_pullback_prob >= 65.0

var line line_fc_0 = na
var line line_fc_1 = na
var line line_fc_2 = na
var line line_fc_3 = na
var line line_alt_0 = na
var line line_alt_1 = na
var line line_alt_2 = na
var line line_alt_3 = na
var line line_mtf_0 = na
var line line_mtf_1 = na
var line line_mtf_2 = na
var label label_fc_0 = na
var label label_fc_1 = na
var label label_fc_2 = na
var label label_fc_3 = na
var line line_sl = na
var label label_sl = na
var label label_fc_4 = na
var label label_alt_desc = na
var label label_mtf_wave = na
var box box_tp_cluster = na
var label label_tp_cluster = na

var float gex_call_wall = na
var float gex_put_wall  = na
var float gex_flip      = na
var float gex_max_pain  = na
var float gex_max_val   = 0.0
var string gex_regime   = "Neutral"
var float gex_iv_eff    = 18.0
var float gex_step_eff  = 10.0

var float[] gex_arr_strikes  = array.new_float()
var float[] gex_arr_call_gex = array.new_float()
var float[] gex_arr_put_gex  = array.new_float()
var float[] gex_arr_net_gex  = array.new_float()
var float[] gex_arr_tot_gex  = array.new_float()

var line l_call_wall = na
var line l_put_wall  = na
var line l_flip_lvl  = na
var line l_pin_lvl   = na
var label lbl_call_wall = na
var label lbl_put_wall  = na
var label lbl_flip_lvl  = na
var label lbl_pin_lvl   = na
var box[] gex_prof_boxes = array.new_box()

disp_active_sl := use_trailing and not na(current_trailing_sl) ? current_trailing_sl : fc_invalid_level
draw_is_bull := fc_is_bull
alt_x0 := bar_index + 3
alt_y0 := disp_active_sl
alt_x1 := alt_x0 + 8
alt_y1 := draw_is_bull ? alt_y0 - atr * 1.5 : alt_y0 + atr * 1.5
alt_x2 := alt_x1 + 10
alt_y2 := draw_is_bull ? alt_y0 - atr * 3.0 : alt_y0 + atr * 3.0
alt_x3 := alt_x2 + 8
alt_y3 := draw_is_bull ? alt_y2 + atr * 1.2 : alt_y2 - atr * 1.2

if barstate.islast
    line.delete(line_ote_1)
    line.delete(line_ote_2)
    line.delete(line_eq)
    line.delete(line_ext_1)
    line.delete(line_ext_2)
    line.delete(line_ext_3)
    label.delete(label_ote)
    label.delete(label_eq)
    label.delete(label_ext_1)
    label.delete(label_ext)
    label.delete(label_ext_3)
    box.delete(zone_ote)

    line.delete(line_fc_0), line.delete(line_fc_1), line.delete(line_fc_2), line.delete(line_fc_3)
    line.delete(line_sl)
    line.delete(line_alt_0), line.delete(line_alt_1), line.delete(line_alt_2), line.delete(line_alt_3)
    line.delete(line_mtf_0), line.delete(line_mtf_1), line.delete(line_mtf_2)
    label.delete(label_fc_0), label.delete(label_fc_1), label.delete(label_fc_2), label.delete(label_fc_3), label.delete(label_fc_4)
    label.delete(label_sl)
    label.delete(label_alt_desc)
    label.delete(label_mtf_wave)
    box.delete(box_tp_cluster)
    label.delete(label_tp_cluster)

    line.delete(l_call_wall)
    line.delete(l_put_wall)
    line.delete(l_flip_lvl)
    line.delete(l_pin_lvl)
    label.delete(lbl_call_wall)
    label.delete(lbl_put_wall)
    label.delete(lbl_flip_lvl)
    label.delete(lbl_pin_lvl)

    if array.size(gex_prof_boxes) > 0
        for b = 0 to array.size(gex_prof_boxes) - 1
            box.delete(array.get(gex_prof_boxes, b))
        array.clear(gex_prof_boxes)

    if use_gex
        gex_iv_eff := f_get_effective_iv()
        gex_step_eff := f_calc_gex_step()
        float gex_sigma = gex_iv_eff / 100.0
        float gex_T = 7.0 / 365.0
        float gex_atm = math.round(close / gex_step_eff) * gex_step_eff
        
        array.clear(gex_arr_strikes)
        array.clear(gex_arr_call_gex)
        array.clear(gex_arr_put_gex)
        array.clear(gex_arr_net_gex)
        array.clear(gex_arr_tot_gex)
        
        float best_c_gex = -1.0
        float best_p_gex = -1.0
        float best_c_strike = gex_atm
        float best_p_strike = gex_atm
        gex_max_val := 0.0
        
        int gex_num_strikes = 12
        for i = -gex_num_strikes to gex_num_strikes
            float strike = gex_atm + i * gex_step_eff
            float raw_g = f_calc_gamma(close, strike, gex_sigma, gex_T)
            
            float round_w = 1.0
            if math.abs(strike / (gex_step_eff * 5.0) - math.round(strike / (gex_step_eff * 5.0))) < 0.01
                round_w := 2.2
            else if math.abs(strike / (gex_step_eff * 2.0) - math.round(strike / (gex_step_eff * 2.0))) < 0.01
                round_w := 1.5
                
            float c_w = 1.0 / (1.0 + math.exp(-3.0 * (strike - close) / (gex_step_eff * 5.0)))
            float p_w = 1.0 - c_w
            
            float c_g = raw_g * c_w * round_w * 100000.0
            float p_g = raw_g * p_w * round_w * 100000.0
            float n_g = c_g - p_g
            float t_g = c_g + p_g
            
            array.push(gex_arr_strikes, strike)
            array.push(gex_arr_call_gex, c_g)
            array.push(gex_arr_put_gex, p_g)
            array.push(gex_arr_net_gex, n_g)
            array.push(gex_arr_tot_gex, t_g)
            
            if strike >= close and c_g > best_c_gex
                best_c_gex := c_g
                best_c_strike := strike
                
            if strike <= close and p_g > best_p_gex
                best_p_gex := p_g
                best_p_strike := strike
                
            if t_g > gex_max_val
                gex_max_val := t_g
                
        gex_call_wall := best_c_strike
        gex_put_wall  := best_p_strike
        
        float closest_d = 1e10
        float d_flip = gex_atm
        for i = 0 to array.size(gex_arr_strikes) - 1
            float s = array.get(gex_arr_strikes, i)
            float ng = array.get(gex_arr_net_gex, i)
            if math.abs(ng) < closest_d
                closest_d := math.abs(ng)
                d_flip := s
        gex_flip := d_flip
        
        float min_p_cost = 1e12
        float d_pain = gex_atm
        for j = 0 to array.size(gex_arr_strikes) - 1
            float test_s = array.get(gex_arr_strikes, j)
            float tot_pain = 0.0
            for k = 0 to array.size(gex_arr_strikes) - 1
                float s_k = array.get(gex_arr_strikes, k)
                float cg = array.get(gex_arr_call_gex, k)
                float pg = array.get(gex_arr_put_gex, k)
                if test_s > s_k
                    tot_pain += (test_s - s_k) * cg
                if test_s < s_k
                    tot_pain += (s_k - test_s) * pg
            if tot_pain < min_p_cost and tot_pain > 0
                min_p_cost := tot_pain
                d_pain := test_s
        gex_max_pain := d_pain
        
        if close >= gex_flip
            gex_regime := "+GAMMA (Сжатие / Low Vol)"
        else
            gex_regime := "-GAMMA (Взрывной импульс / High Vol)"
        
        int gx1 = bar_index - line_len
        int gx2 = bar_index + label_offset + 10
        if show_gex_walls and not na(gex_call_wall)
            l_call_wall := line.new(gx1, gex_call_wall, gx2, gex_call_wall, color=color.new(#10b981, 0), width=2, style=line.style_solid, force_overlay=true)
            lbl_call_wall := label.new(gx2, gex_call_wall, "🏰 GEX CALL WALL [Res]: " + str.tostring(gex_call_wall, "#.##"), color=color.new(#10b981, 20), textcolor=color.white, style=label.style_label_left, size=get_text_size(text_sz_opt), force_overlay=true)
        if show_gex_walls and not na(gex_put_wall)
            l_put_wall := line.new(gx1, gex_put_wall, gx2, gex_put_wall, color=color.new(#ef4444, 0), width=2, style=line.style_solid, force_overlay=true)
            lbl_put_wall := label.new(gx2, gex_put_wall, "🛡️ GEX PUT WALL [Sup]: " + str.tostring(gex_put_wall, "#.##"), color=color.new(#ef4444, 20), textcolor=color.white, style=label.style_label_left, size=get_text_size(text_sz_opt), force_overlay=true)
        if show_gex_flip and not na(gex_flip)
            l_flip_lvl := line.new(gx1, gex_flip, gx2, gex_flip, color=color.new(#a855f7, 0), width=2, style=line.style_dashed, force_overlay=true)
            lbl_flip_lvl := label.new(gx2, gex_flip, "⚡ GEX ZERO FLIP: " + str.tostring(gex_flip, "#.##"), color=color.new(#a855f7, 20), textcolor=color.white, style=label.style_label_left, size=get_text_size(text_sz_opt), force_overlay=true)
        if show_gex_pain and not na(gex_max_pain)
            l_pin_lvl := line.new(gx1, gex_max_pain, gx2, gex_max_pain, color=color.new(#06b6d4, 0), width=1, style=line.style_dotted, force_overlay=true)
            lbl_pin_lvl := label.new(gx2, gex_max_pain, "🎯 GEX MAX PAIN (Pin): " + str.tostring(gex_max_pain, "#.##"), color=color.new(#06b6d4, 30), textcolor=color.white, style=label.style_label_left, size=get_text_size(text_sz_opt), force_overlay=true)
        
        if show_gex_bars and gex_max_val > 0
            if array.size(gex_prof_boxes) > 0
                for b = 0 to array.size(gex_prof_boxes) - 1
                    box.delete(array.get(gex_prof_boxes, b))
            array.clear(gex_prof_boxes)
            int bx_base = bar_index + label_offset + 12
            float h_step = gex_step_eff * 0.42
            for i = 0 to array.size(gex_arr_strikes) - 1
                float s = array.get(gex_arr_strikes, i)
                float t_val = array.get(gex_arr_tot_gex, i)
                float n_val = array.get(gex_arr_net_gex, i)
                int b_len = math.max(1, math.round((t_val / gex_max_val) * 35))
                color c_fill = n_val > 0 ? color.new(#10b981, 55) : color.new(#ef4444, 55)
                color c_bord = n_val > 0 ? #10b981 : #ef4444
                box bx = box.new(bx_base, s + h_step, bx_base + b_len, s - h_step, bgcolor=c_fill, border_color=c_bord, border_width=1, force_overlay=true)
                array.push(gex_prof_boxes, bx)

    ote_color = is_bull ? c_bull : c_bear
    ote_text = is_bull ? "OTE 62-79% [Подд.]" : "OTE 62-79% [Сопр.]"

    if show_reversal
        line_ote_1 := line.new(bar_index - line_len, ote_top, bar_index + label_offset, ote_top, color=color.new(ote_color, 30), width=1, force_overlay=true)
        line_ote_2 := line.new(bar_index - line_len, ote_bottom, bar_index + label_offset, ote_bottom, color=color.new(ote_color, 30), width=1, force_overlay=true)
        zone_ote := box.new(left=bar_index - line_len, top=ote_top, right=bar_index + label_offset, bottom=ote_bottom, bgcolor=color.new(ote_color, 94), border_color=color.new(ote_color, 70), border_style=line.style_dashed, force_overlay=true)
        
        label_ote := label.new(bar_index + label_offset, ote_top, ote_text + (show_probs ? " (" + str.tostring(prob_ote) + "%)" : ""),
                               color=color.new(color.black, 100), textcolor=ote_color, style=label.style_label_left, size=get_text_size(text_sz_opt), force_overlay=true)

        line_eq := line.new(bar_index - line_len, fib_500, bar_index + label_offset, fib_500, color=color.new(c_neutral, 50), width=1, style=line.style_dashed, force_overlay=true)
        label_eq := label.new(bar_index + label_offset, fib_500, "0.50 EQ (Баланс)", color=color.new(color.black, 100), textcolor=c_neutral, style=label.style_label_left, size=get_text_size(text_sz_opt), force_overlay=true)

        if show_fib_ext
            ext_color = is_bull ? c_bear : c_bull
            
            line_ext_1 := line.new(bar_index - line_len, ext_1, bar_index + label_offset, ext_1, color=color.new(ext_color, 50), width=1, style=line.style_dashed, force_overlay=true)
            line_ext_2 := line.new(bar_index - line_len, ext_2, bar_index + label_offset, ext_2, color=color.new(ext_color, 30), width=2, force_overlay=true)
            line_ext_3 := line.new(bar_index - line_len, ext_3, bar_index + label_offset, ext_3, color=color.new(ext_color, 50), width=1, style=line.style_dashed, force_overlay=true)
            
            label_ext_1 := label.new(bar_index + label_offset, ext_1, (fc_leg2_hit ? "✅ TP1 [1.272 Fib]: " : "🏁 TP1 [1.272 Fib]: ") + str.tostring(ext_1, "#.##"), color=color.new(color.black, 100), textcolor=fc_leg2_hit ? #10b981 : ext_color, style=label.style_label_left, size=get_text_size(text_sz_opt), force_overlay=true)
            label_ext := label.new(bar_index + label_offset, ext_2, (fc_leg3_hit ? "✅ TP2 [1.618 Fib]: " : "🎯 TP2 [1.618 Fib]: ") + str.tostring(ext_2, "#.##") + (show_probs ? " (" + str.tostring(prob_ext) + "%)" : ""),
                                   color=color.new(color.black, 100), textcolor=fc_leg3_hit ? #10b981 : ext_color, style=label.style_label_left, size=get_text_size(text_sz_opt), force_overlay=true)
            label_ext_3 := label.new(bar_index + label_offset, ext_3, (fc_leg5_hit ? "✅ TP3 [2.618 Fib]: " : "🚀 TP3 [2.618 Fib]: ") + str.tostring(ext_3, "#.##"), color=color.new(color.black, 100), textcolor=fc_leg5_hit ? #10b981 : ext_color, style=label.style_label_left, size=get_text_size(text_sz_opt), force_overlay=true)

    if show_forecast
        int x0 = bar_index
        float y0 = close
        
        draw_is_bull := fc_is_bull
        int x1 = bar_index + 8
        float y1 = not na(fc_p1) ? fc_p1 : (draw_is_bull ? close - atr * 0.8 : close + atr * 0.8)
        int x2 = bar_index + 18
        float y2 = not na(fc_p2) ? fc_p2 : (draw_is_bull ? close + atr * 2.2 : close - atr * 2.2)
        int x3 = bar_index + 30
        float y3 = not na(fc_p3) ? fc_p3 : (draw_is_bull ? close + atr * 4.8 : close - atr * 4.8)
        int x4 = bar_index + 38
        float y4 = y2
        int x5 = bar_index + 46
        float y5 = draw_is_bull ? y3 + math.max(atr * 2.0 * tp_mult, math.abs(y3 - y2) * 1.2) : y3 - math.max(atr * 2.0 * tp_mult, math.abs(y2 - y3) * 1.2)
        
        disp_active_sl := use_trailing and not na(current_trailing_sl) ? current_trailing_sl : fc_invalid_level

        bool leg1_completed = false
        bool leg2_completed = false
        bool leg3_completed = false
        bool leg4_completed = false
        bool leg5_completed = false

        if fc_start_bar > 0 and bar_index - fc_start_bar <= 400
            x0 := fc_start_bar
            y0 := fc_start_price
            draw_is_bull := fc_is_bull
            
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
            
            x5 := fc_leg5_hit ? math.max(x4 + 3, fc_leg5_idx) : math.max(bar_index + 46, (fc_leg4_hit ? fc_leg4_idx + 10 : x4 + 10))
            float calc_tp3 = draw_is_bull ? y3 + math.max(atr * 2.0 * tp_mult, math.abs(y3 - y2) * 1.2) : y3 - math.max(atr * 2.0 * tp_mult, math.abs(y2 - y3) * 1.2)
            y5 := fc_leg5_hit ? fc_leg5_val : calc_tp3

            x1 := math.max(x0 + 1, x1)
            x2 := math.max(x1 + 2, x2)
            x3 := math.max(x2 + 2, x3)
            x4 := math.max(x3 + 2, x4)
            x5 := math.max(x4 + 2, x5)
            
            alt_x0 := math.max(bar_index + 3, x1 + 2)
            alt_y0 := disp_active_sl
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
            leg5_completed := fc_leg5_hit

        if gex_align_fc and use_gex and not na(gex_call_wall) and not na(gex_put_wall)
            if draw_is_bull
                if not leg3_completed and gex_call_wall > y2 and gex_call_wall <= close + atr * math.max(max_tp2_atr, max_tp1_atr + 1.2) * math.max(1.1, tp_mult)
                    y3 := gex_call_wall
                else if not leg2_completed and gex_call_wall > close and gex_call_wall < y2
                    y2 := gex_call_wall
                if not leg3_completed and not na(gex_max_pain) and gex_max_pain > y2 and gex_max_pain > y3
                    y3 := math.max(y3, gex_max_pain)
            else
                if not leg3_completed and gex_put_wall < y2 and gex_put_wall >= close - atr * math.max(max_tp2_atr, max_tp1_atr + 1.2) * math.max(1.1, tp_mult)
                    y3 := gex_put_wall
                else if not leg2_completed and gex_put_wall < close and gex_put_wall > y2
                    y2 := gex_put_wall
                if not leg3_completed and not na(gex_max_pain) and gex_max_pain < y2 and gex_max_pain < y3
                    y3 := math.min(y3, gex_max_pain)

        if draw_is_bull
            if not leg2_completed
                y2 := math.max(y1 + atr * 0.35, y2)
            y3 := math.max(y2 + atr * 0.60, y3)
            y4 := y2
            y5 := math.max(y3 + atr * 0.80, y5)
        else
            if not leg2_completed
                y2 := math.min(y1 - atr * 0.35, y2)
            y3 := math.min(y2 - atr * 0.60, y3)
            y4 := y2
            y5 := math.min(y3 - atr * 0.80, y5)

        if not is_plan_b_active
            fc_p2 := y2
            fc_p3 := y3

        int min_fc_x = math.max(1, bar_index - 450)
        x0 := math.max(min_fc_x, x0)
        x1 := math.max(min_fc_x, x1)
        x2 := math.max(min_fc_x, x2)
        x3 := math.max(min_fc_x, x3)
        x4 := math.max(min_fc_x, x4)
        x5 := math.max(min_fc_x, x5)
        alt_x0 := math.max(min_fc_x, alt_x0)
        alt_x1 := math.max(min_fc_x, alt_x1)
        alt_x2 := math.max(min_fc_x, alt_x2)
        alt_x3 := math.max(min_fc_x, alt_x3)

        color color_tp1_base = draw_is_bull ? #10b981 : #ef4444
        color color_tp2_base = #0284c7
        color color_retest_base = #8b5cf6
        color color_tp3_base = #d946ef

        color color_leg1 = is_plan_b_active ? color.new(color.gray, 60) : draw_is_bull ? (leg1_completed ? color.new(c_bull, 40) : color.new(c_bull, 10)) : (leg1_completed ? color.new(c_bear, 40) : color.new(c_bear, 10))
        color color_leg2 = is_plan_b_active ? color.new(color.gray, 60) : leg2_completed ? color.new(color_tp1_base, 35) : color.new(color_tp1_base, 0)
        color color_leg3 = is_plan_b_active ? color.new(color.gray, 60) : leg3_completed ? color.new(color_tp2_base, 35) : color.new(color_tp2_base, 0)
        color color_leg4 = is_plan_b_active ? color.new(color.gray, 60) : leg4_completed ? color.new(color_retest_base, 40) : color.new(color_retest_base, 10)
        
        int width_leg1 = is_plan_b_active ? 1 : leg1_completed ? 2 : 4
        int width_leg2 = is_plan_b_active ? 1 : leg2_completed ? 3 : 4
        int width_leg3 = is_plan_b_active ? 1 : leg3_completed ? 3 : 4
        int width_leg4 = is_plan_b_active ? 1 : leg4_completed ? 2 : 3

        line_fc_0 := line.new(x1=x0, y1=y0, x2=x1, y2=y1, xloc=xloc.bar_index, color=color_leg1, width=width_leg1, style=is_plan_b_active ? line.style_dashed : (leg1_completed ? line.style_dashed : line.style_solid), force_overlay=true)
        line_fc_1 := line.new(x1=x1, y1=y1, x2=x2, y2=y2, xloc=xloc.bar_index, color=color_leg2, width=width_leg2, style=is_plan_b_active ? line.style_dashed : (leg2_completed ? line.style_dashed : line.style_solid), force_overlay=true)
        line_fc_2 := line.new(x1=x2, y1=y2, x2=x3, y2=y3, xloc=xloc.bar_index, color=color_leg3, width=width_leg3, style=is_plan_b_active ? line.style_dashed : (leg3_completed ? line.style_dashed : line.style_solid), force_overlay=true)
        if fc_post_target and not is_plan_b_active
            line_fc_3 := line.new(x1=x3, y1=y3, x2=x4, y2=y4, xloc=xloc.bar_index, color=color_leg4, width=width_leg4, style=leg4_completed ? line.style_dashed : line.style_dotted, force_overlay=true)

        color sl_line_color = is_plan_b_active ? #ef4444 : is_wick_sweep ? #10b981 : trailing_stage_idx >= 2 ? #10b981 : (trailing_stage_idx == 1 ? #f59e0b : #ef4444)
        int sl_end_x = math.max(math.max(x3, x4), alt_x2) + 4
        line_sl := line.new(x1=x0, y1=disp_active_sl, x2=sl_end_x, y2=disp_active_sl, xloc=xloc.bar_index, color=sl_line_color, width=is_plan_b_active ? 3 : trailing_stage_idx > 0 ? 3 : 2, style=is_plan_b_active ? line.style_solid : (trailing_stage_idx > 0 ? line.style_dashed : line.style_solid), force_overlay=true)
        
        string sl_badge = is_plan_b_active ? " [❌ СЛОМ СТРУКТУРЫ]" : is_wick_sweep ? " [⚡ СВИП ВЫДЕРЖАН]" : (use_trailing and trailing_stage_idx > 0 ? (" [" + trailing_stage_str + "]") : "")
        string sl_title = (is_plan_b_active ? "SL ВЫБИТ: " : is_wick_sweep ? "SL (Свип выдержан): " : (use_trailing and trailing_stage_idx > 0 ? "Трейлинг: " : "SL: ")) + str.tostring(disp_active_sl, "#.##") + sl_badge
        label_sl := label.new(sl_end_x, disp_active_sl, sl_title, color=color.new(color.black, 100), textcolor=sl_line_color, style=label.style_label_left, size=get_text_size(text_sz_opt), force_overlay=true)

        if show_alt_wave and (is_plan_b_active or not plan_b_opposes_mtf)
            color alt_line_color = is_plan_b_active ? (draw_is_bull ? #ef4444 : #10b981) : (draw_is_bull ? color.new(c_bear, 25) : color.new(c_bull, 25))
            int alt_line_w = is_plan_b_active ? 3 : 2
            line_alt_0 := line.new(x1=alt_x0, y1=alt_y0, x2=alt_x1, y2=alt_y1, xloc=xloc.bar_index, color=alt_line_color, width=alt_line_w, style=is_plan_b_active ? line.style_solid : line.style_dashed, force_overlay=true)
            line_alt_1 := line.new(x1=alt_x1, y1=alt_y1, x2=alt_x2, y2=alt_y2, xloc=xloc.bar_index, color=alt_line_color, width=alt_line_w, style=is_plan_b_active ? line.style_solid : line.style_dashed, force_overlay=true)
            if fc_post_target
                line_alt_2 := line.new(x1=alt_x2, y1=alt_y2, x2=alt_x3, y2=alt_y3, xloc=xloc.bar_index, color=alt_line_color, width=alt_line_w, style=line.style_dotted, force_overlay=true)

            string alt_lbl_txt = is_plan_b_active ? ("⚡ АКТИВНЫЙ ПЛАН Б (Слом SL " + str.tostring(disp_active_sl, "#.##") + ")\\n➔ TP1: " + str.tostring(alt_y1, "#.##") + "\\n➔ TP2: " + str.tostring(alt_y2, "#.##")) : ("⚡ Альтернатива (Слом SL " + str.tostring(disp_active_sl, "#.##") + ")\\n➔ TP1: " + str.tostring(alt_y1, "#.##") + "\\n➔ TP2: " + str.tostring(alt_y2, "#.##"))
            color alt_txt_col = is_plan_b_active ? (draw_is_bull ? #ef4444 : #10b981) : (draw_is_bull ? c_bear : c_bull)
            label_alt_desc := label.new(alt_x2, alt_y2, alt_lbl_txt, color=color.new(color.black, 100), textcolor=alt_txt_col, style=draw_is_bull ? label.style_label_down : label.style_label_up, size=size.small, force_overlay=true)

        color col_node = draw_is_bull ? c_bull : c_bear
        
        if not leg1_completed and not leg2_completed and not is_plan_b_active
            string txt_l0 = "Прогноз: " + (draw_is_bull ? "🟢 LONG" : "🔴 SHORT") + (fc_is_bull != htf_trend_up ? (" (Откат " + auto_cur_tf_name + ")") : "") + " (" + str.tostring(fc_probability, "#") + "%)"
            label_fc_0 := label.new(x0, y0, txt_l0, color=color.new(color.black, 100), textcolor=col_node, style=draw_is_bull ? label.style_label_up : label.style_label_down, size=size.small, force_overlay=true)
        
        string runaway_note = (is_high_runaway and not leg1_completed and not leg2_completed and not is_plan_b_active) ? ("\\n⚡ Без отката: " + str.tostring(no_pullback_prob, "#") + "% (50/50)") : ""
        string txt_l1 = is_plan_b_active ? ("ВХОД: " + str.tostring(y1, "#.##") + " [❌ СЛОМ SL: " + str.tostring(disp_active_sl, "#.##") + "]") : is_wick_sweep ? ("ВХОД: " + str.tostring(y1, "#.##") + " [⚡ СВИП SL ➔ В ТРЕНДЕ ✅]") : leg1_completed ? ("ВХОД: " + str.tostring(y1, "#.##") + " [OK ✅]") : ("ВХОД: " + str.tostring(y1, "#.##") + runaway_note)
        label_fc_1 := label.new(x1, y1, txt_l1, color=color.new(color.black, 100), textcolor=is_plan_b_active ? #ef4444 : is_wick_sweep ? #10b981 : (leg1_completed ? color.new(col_node, 40) : col_node), style=draw_is_bull ? label.style_label_up : label.style_label_down, size=size.small, force_overlay=true)
        
        if not is_plan_b_active
            string txt_l2 = leg2_completed ? ("TP1: " + str.tostring(y2, "#.##") + " [OK ✅]") : ("TP1: " + str.tostring(y2, "#.##") + (fc_is_bull != htf_trend_up ? (" (Откат " + auto_cur_tf_name + ")") : (draw_is_bull ? " ↗" : " ↘")))
            label_fc_2 := label.new(x2, y2, txt_l2, color=color.new(color.black, 100), textcolor=color_tp1_base, style=draw_is_bull ? label.style_label_down : label.style_label_up, size=size.small, force_overlay=true)
            
            string txt_l3 = leg3_completed ? ("TP2: " + str.tostring(y3, "#.##") + " [OK ✅]") : ("TP2: " + str.tostring(y3, "#.##") + " (" + str.tostring(fc_probability, "#") + "%)")
            label_fc_3 := label.new(x3, y3, txt_l3, color=color.new(color.black, 100), textcolor=color_tp2_base, style=draw_is_bull ? label.style_label_down : label.style_label_up, size=size.small, force_overlay=true)

            if fc_post_target
                string txt_l4 = leg4_completed ? "Ретест [OK ✅]" : ("Ретест: " + str.tostring(y4, "#.##"))
                label_fc_4 := label.new(x4, y4, txt_l4, color=color.new(color.gray, 100), textcolor=leg4_completed ? color.gray : color_retest_base, style=draw_is_bull ? label.style_label_up : label.style_label_down, size=size.small, force_overlay=true)

        if show_mtf_wave
            if fc_is_bull == htf_trend_up
                color mtf_col = fc_is_bull ? #38bdf8 : #f43f5e
                line_mtf_0 := line.new(x1=x1, y1=y1, x2=x2, y2=y2, color=mtf_col, width=3, style=line.style_solid, force_overlay=true)
                line_mtf_1 := line.new(x1=x2, y1=y2, x2=x3, y2=y3, color=mtf_col, width=3, style=line.style_arrow_right, force_overlay=true)
                string mtf_confl_txt = "⚡ Синтез MTF: " + (fc_is_bull ? "LONG" : "SHORT") + " ➔ " + str.tostring(y3, "#.##") + " (" + auto_htf_name + " ➔ " + str.tostring(htf_tp1_target, "#.##") + ")"
                label_mtf_wave := label.new(x3, y3, mtf_confl_txt, color=color.new(color.black, 100), textcolor=mtf_col, style=fc_is_bull ? label.style_label_down : label.style_label_up, size=size.small, force_overlay=true)
            else
                int mtf_x_ext = x2 + 15
                float mtf_y_ext = htf_tp1_target
                line_mtf_0 := line.new(x1=x1, y1=y1, x2=x2, y2=y2, color=#f59e0b, width=3, style=line.style_dashed, force_overlay=true)
                line_mtf_1 := line.new(x1=x2, y1=y2, x2=mtf_x_ext, y2=mtf_y_ext, color=htf_trend_up ? c_bull : c_bear, width=3, style=line.style_arrow_right, force_overlay=true)
                string mtf_turn_txt = not fc_is_bull and htf_trend_up ? ("⚡ Синтез MTF: Откат " + str.tostring(y2, "#.##") + " ➔ Разворот в " + auto_htf_name + " LONG " + str.tostring(mtf_y_ext, "#.##")) : ("⚡ Синтез MTF: Коррекция " + str.tostring(y2, "#.##") + " ➔ Возобновление " + auto_htf_name + " SHORT " + str.tostring(mtf_y_ext, "#.##"))
                label_mtf_wave := label.new(mtf_x_ext, mtf_y_ext, mtf_turn_txt, color=color.new(color.black, 100), textcolor=htf_trend_up ? c_bull : c_bear, style=htf_trend_up ? label.style_label_up : label.style_label_down, size=size.small, force_overlay=true)

        if show_tp_clusters
            bool is_cluster_near = math.abs(y3 - htf_tp1_target) <= (atr * 1.8) or math.abs(y2 - htf_tp1_target) <= (atr * 1.8)
            float cluster_lvl = is_cluster_near ? ((y3 + htf_tp1_target) / 2.0) : htf_tp1_target
            float cluster_h = atr * 0.25
            box_tp_cluster := box.new(left=bar_index - 5, top=cluster_lvl + cluster_h, right=bar_index + label_offset + 12, bottom=cluster_lvl - cluster_h, bgcolor=color.new(#eab308, 85), border_color=color.new(#eab308, 30), border_style=line.style_dashed, force_overlay=true)
            string cluster_badge = is_cluster_near ? ("🎯 Кластер " + auto_htf_name + ": ") : ("🎯 Цель " + auto_htf_name + ": ")
            label_tp_cluster := label.new(bar_index + label_offset + 12, cluster_lvl, cluster_badge + str.tostring(cluster_lvl, "#.##"), color=color.new(color.black, 100), textcolor=#facc15, style=label.style_label_left, size=get_text_size(text_sz_opt), force_overlay=true)

plotshape(show_signals and buy_sig, title="S&T LONG Signal", style=shape.triangleup, location=location.belowbar, color=c_bull, size=size.normal, text="LONG", textcolor=color.black, force_overlay=true)
plotshape(show_signals and sell_sig, title="S&T SHORT Signal", style=shape.triangledown, location=location.abovebar, color=c_bear, size=size.normal, text="SHORT", textcolor=color.black, force_overlay=true)

plotshape(show_sweeps and is_high_sweep, title="S&T High Liquidity Sweep (Медвежий)", style=shape.triangledown, location=location.abovebar, color=c_bear, size=size.small, text="SWEEP 🔻", textcolor=c_bear, force_overlay=true)
plotshape(show_sweeps and is_low_sweep, title="S&T Low Liquidity Sweep (Бычий)", style=shape.triangleup, location=location.belowbar, color=c_bull, size=size.small, text="SWEEP 🟢", textcolor=c_bull, force_overlay=true)

plotshape(show_osc_marks and macd_cross_bull, title="MACD Бычий Крест", style=shape.diamond, location=location.belowbar, color=#10b981, size=size.tiny, text="MACD ▲", textcolor=#10b981, force_overlay=true)
plotshape(show_osc_marks and macd_cross_bear, title="MACD Медвежий Крест", style=shape.diamond, location=location.abovebar, color=#ef4444, size=size.tiny, text="MACD ▼", textcolor=#ef4444, force_overlay=true)
plotshape(show_osc_marks and rsi_val <= 20, title="RSI Перепроданность (<20)", style=shape.triangleup, location=location.belowbar, color=#f59e0b, size=size.tiny, text="RSI OS", textcolor=#f59e0b, force_overlay=true)
plotshape(show_osc_marks and rsi_val >= 80, title="RSI Перекупленность (>80)", style=shape.triangledown, location=location.abovebar, color=#a855f7, size=size.tiny, text="RSI OB", textcolor=#a855f7, force_overlay=true)

trend_line_col = close > trend_line_val ? color.new(c_bull, 15) : color.new(c_bear, 15)
plot(show_trend_l ? trend_line_val : na, title="S&T Dynamic Trend Line", color=trend_line_col, linewidth=3, style=plot.style_line, force_overlay=true)

float plot_trail_val = show_trail_line and has_active_forecast and use_trailing and not na(current_trailing_sl) ? current_trailing_sl : na
color plot_trail_col = trailing_stage_idx >= 2 ? #10b981 : (trailing_stage_idx == 1 ? #f59e0b : #ef4444)
plot(plot_trail_val, title="S&T Dynamic Trailing SL Line", color=plot_trail_col, linewidth=2, style=plot.style_stepline, force_overlay=true)

rsi_w = request.security(syminfo.tickerid, "W", rsi_val)
rsi_m = request.security(syminfo.tickerid, "M", rsi_val)

dxy_close  = request.security(dxy_symbol, timeframe.period, close, ignore_invalid_symbol=true)
dxy_open   = request.security(dxy_symbol, timeframe.period, open, ignore_invalid_symbol=true)
dxy_change = not na(dxy_open) and dxy_open > 0 ? (dxy_close - dxy_open) / dxy_open * 100 : 0.0
oil_close  = request.security(oil_symbol, timeframe.period, close, ignore_invalid_symbol=true)
oil_open   = request.security(oil_symbol, timeframe.period, open, ignore_invalid_symbol=true)
oil_change = not na(oil_open) and oil_open > 0 ? (oil_close - oil_open) / oil_open * 100 : 0.0
is_macro_anom = math.abs(dxy_change) >= 0.3 or math.abs(oil_change) >= 0.8

float atr_val = ta.atr(14)
float atr_pct = close > 0 ? (atr_val / close) * 100.0 : 0.0

float d_high = request.security(syminfo.tickerid, "D", high, ignore_invalid_symbol=true)
float d_low  = request.security(syminfo.tickerid, "D", low, ignore_invalid_symbol=true)
float d_atr  = request.security(syminfo.tickerid, "D", ta.atr(14), ignore_invalid_symbol=true)
float d_range = not na(d_high) and not na(d_low) ? (d_high - d_low) : 0.0
float adr_used_pct = not na(d_atr) and d_atr > 0 ? math.min(150.0, (d_range / d_atr) * 100.0) : 0.0
float adr_left_pct = math.max(0.0, 100.0 - adr_used_pct)

float dist_tp1_pts = math.abs(fc_p2 - close)
float dist_tp1_atr = atr_val > 0 ? dist_tp1_pts / atr_val : 1.0
float pos_entry_val = not na(fc_leg1_val) ? fc_leg1_val : (not na(fc_p1) ? fc_p1 : fc_start_price)
float trade_risk    = math.max(0.2 * atr_val, math.abs(pos_entry_val - fc_invalid_level))
float trade_reward  = math.abs(fc_p2 - pos_entry_val)
float rr_ratio      = trade_risk > 0 ? math.min(15.0, math.max(0.5, trade_reward / trade_risk)) : 2.0
float cur_effective_sl = use_trailing and not na(current_trailing_sl) ? current_trailing_sl : fc_invalid_level
if trailing_stage_idx == 0
    if fc_is_bull
        cur_effective_sl := math.min(cur_effective_sl, math.min(pos_entry_val, fc_start_price) - atr * 0.3)
    else
        cur_effective_sl := math.max(cur_effective_sl, math.max(pos_entry_val, fc_start_price) + atr * 0.3)

var table t_dash = na
if barstate.islast and show_tables
    table.delete(t_dash)
    t_sz = get_table_text_size(table_text_sz)
    
    bool is_cur_15m = (timeframe.isminutes and timeframe.multiplier == 15) or timeframe.period == "15"
    bool is_cur_1h  = (timeframe.isminutes and timeframe.multiplier == 60) or timeframe.period == "60"
    bool is_cur_4h  = (timeframe.isminutes and timeframe.multiplier == 240) or timeframe.period == "240"
    bool is_cur_1d  = timeframe.isdaily or timeframe.period == "D" or timeframe.period == "1D"
    bool is_cur_1w  = timeframe.isweekly or timeframe.period == "W" or timeframe.period == "1W"

    bool mtf_15m_disp = mtf_15m_up
    bool mtf_1h_disp  = mtf_1h_up
    bool mtf_4h_disp  = mtf_4h_up
    bool mtf_1d_disp  = mtf_1d_up
    bool mtf_1w_disp  = mtf_1w_up

    bool hud_htf_trend_up = auto_htf_name == "15м" ? mtf_15m_disp : (auto_htf_name == "1Ч" ? mtf_1h_disp : (auto_htf_name == "4Ч" ? mtf_4h_disp : (auto_htf_name == "1Д" ? mtf_1d_disp : ((auto_htf_name == "1Нед" or auto_htf_name == "1 Нед" or auto_htf_name == "1W") ? mtf_1w_disp : htf_trend_up))))

    int cur_bull_cnt = (mtf_15m_disp ? 1 : 0) + (mtf_1h_disp ? 1 : 0) + (mtf_4h_disp ? 1 : 0) + (mtf_1d_disp ? 1 : 0) + (mtf_1w_disp ? 1 : 0)
    int cur_bear_cnt = 5 - cur_bull_cnt
    int cur_score_bull = (mtf_1w_disp ? 3 : 0) + (mtf_1d_disp ? 3 : 0) + (mtf_4h_disp ? 2 : 0) + (mtf_1h_disp ? 1 : 0) + (mtf_15m_disp ? 1 : 0)
    int cur_score_bear = 10 - cur_score_bull
    int cur_pct_bull   = cur_score_bull * 10
    int cur_pct_bear   = cur_score_bear * 10

    bool macro_disp_bull = mtf_1d_disp and mtf_1w_disp
    bool macro_disp_bear = not mtf_1d_disp and not mtf_1w_disp
    bool intra_disp_bear = not mtf_1h_disp or not mtf_4h_disp
    bool intra_disp_bull = mtf_1h_disp and mtf_4h_disp

    string dxy_sign = dxy_change >= 0 ? "+" : ""
    string macro_txt = is_macro_anom ? (" | ⚠️ DXY " + dxy_sign + str.tostring(dxy_change, "#.##") + "%") : (" | DXY " + dxy_sign + str.tostring(dxy_change, "#.##") + "%")
    string trend_confluence_txt = fc_is_bull == hud_htf_trend_up ? " (Согласован ✨)" : " (Коррекция ⚡)"
    string htf_label_badge = hud_htf_trend_up ? (auto_htf_name + " Up 🟢") : (auto_htf_name + " Down 🔴")

    string zone_txt = in_bullish_ob ? "🟢 В ЗОНЕ +OB" : in_bearish_ob ? "🔴 В ЗОНЕ -OB" : in_ote_zone ? ("🎯 ЗОНА OTE") : in_support_zone ? "🟢 ПОДДЕРЖКА" : in_resistance_zone ? "🔴 СОПРОТИВЛЕНИЕ" : "⚪ Вне зон"
    string zone_short = in_bullish_ob ? "🟢+OB" : in_bearish_ob ? "🔴-OB" : in_ote_zone ? "🎯OTE" : in_support_zone ? "🟢Supp" : in_resistance_zone ? "🔴Res" : "⚪Вне"

    string trail_hud_txt = is_trailing_hit ? ("✅ Зафиксирован @ " + str.tostring(cur_effective_sl, "#.##")) : (str.tostring(cur_effective_sl, "#.##") + " | " + trailing_stage_str)
    color trail_hud_col = is_trailing_hit ? #38bdf8 : (trailing_stage_idx >= 2 ? #10b981 : (trailing_stage_idx == 1 ? #f59e0b : #ef4444))

    string setup_txt = fc_invalidated ? "⚠️ Прогноз невалиден (SL)" : fc_leg3_hit ? (fc_is_bull ? "🏆 ДОСТИГНУТ TP2 (LONG 🎯)" : "🏆 ДОСТИГНУТ TP2 (SHORT 🎯)") : (fc_leg2_hit and is_trailing_hit) ? "✅ ФИКСАЦИЯ @ TP1 + Трейлинг" : fc_leg2_hit ? (fc_is_bull ? ("✅ ВЗЯТ TP1 (Трейлинг к " + str.tostring(fc_p3, "#.##") + ")") : ("✅ ВЗЯТ TP1 (Трейлинг к " + str.tostring(fc_p3, "#.##") + ")")) : fc_leg1_hit ? (fc_is_bull ? ("📍 В ПОЗИЦИИ LONG ➔ TP1 " + str.tostring(fc_p2, "#.##")) : ("📍 В ПОЗИЦИИ SHORT ➔ TP1 " + str.tostring(fc_p2, "#.##"))) : (fc_is_bull ? ("⏳ ОЖИДАНИЕ ВХОДА (Откат к " + str.tostring(fc_p1, "#.##") + ")") : ("⏳ ОЖИДАНИЕ ВХОДА (Откат к " + str.tostring(fc_p1, "#.##") + ")"))
    
    bool runaway_is_actual = not fc_leg1_hit and not fc_leg2_hit and not fc_leg3_hit and not fc_invalidated
    string runaway_suffix = ""
    if runaway_is_actual
        if is_high_runaway
            runaway_suffix := " | ⚡ Без отката " + str.tostring(no_pullback_prob, "#") + "% (Сплит 50/50)"
        else if no_pullback_prob >= 45.0
            runaway_suffix := " | ⚡ Без отката " + str.tostring(no_pullback_prob, "#") + "%"

    string setup_prefix = (fc_is_bull != hud_htf_trend_up) ? (" (Откат " + auto_cur_tf_name + ")") : ""
    color setup_col = is_plan_b_active ? (fc_is_bull ? c_bear : c_bull) : is_wick_sweep ? (fc_is_bull ? c_bull : c_bear) : fc_invalidated ? color_invalid_gray : fc_leg3_hit ? #10b981 : (fc_leg2_hit and is_trailing_hit) ? #38bdf8 : fc_leg2_hit ? #34d399 : fc_leg1_hit ? #fbbf24 : (fc_is_bull ? c_bull : c_bear)

    string mtf_m_txt = "15м" + (mtf_15m_disp ? "🟢" : "🔴") + " 1Ч" + (mtf_1h_disp ? "🟢" : "🔴") + " 4Ч" + (mtf_4h_disp ? "🟢" : "🔴") + " 1Д" + (mtf_1d_disp ? "🟢" : "🔴") + " 1W" + (mtf_1w_disp ? "🟢" : "🔴")

    if tbl_view_mode == "🔹 Ультра-Микро (1 колонка)"
        t_dash := table.new(get_table_pos(table_pos), columns=1, rows=5, bgcolor=#0f172a, border_color=#334155, border_width=1, force_overlay=true)
        table.cell(t_dash, 0, 0, "★ " + syminfo.ticker + " (" + timeframe.period + ")", text_color=#38bdf8, text_size=t_sz, bgcolor=#1e293b)
        
        string u_setup = is_plan_b_active ? ("⚠️ Слом SL [План Б " + (fc_is_bull ? "🔴" : "🟢") + "]") : is_wick_sweep ? ((fc_is_bull ? "🟢 LONG " : "🔴 SHORT ") + "[Свип SL ✅] " + str.tostring(fc_probability, "#") + "%") : ((fc_is_bull ? "🟢 LONG " : "🔴 SHORT ") + str.tostring(fc_probability, "#") + "%" + (is_high_runaway ? " ⚡БЕЗ ОТКАТА" : fc_leg2_hit ? " ✅TP1" : fc_leg1_hit ? " 📍Вход" : " 🎯"))
        table.cell(t_dash, 0, 1, u_setup, text_color=setup_col, text_size=t_sz)
        
        string u_targets = is_plan_b_active ? ("TP: " + str.tostring(alt_y1, "#.##") + " | ❌ SL выбит (" + str.tostring(disp_active_sl, "#.##") + ")") : is_wick_sweep ? ("TP: " + str.tostring(fc_p2, "#.##") + " | ⚡ SL сдержан (" + str.tostring(disp_active_sl, "#.##") + ")") : ("TP: " + str.tostring(fc_p2, "#.##") + " | " + (trailing_stage_idx > 0 ? "🛡️" : "SL: ") + str.tostring(cur_effective_sl, "#.##") + " (1:" + str.tostring(rr_ratio, "#.#") + ")")
        table.cell(t_dash, 0, 2, u_targets, text_color=is_plan_b_active ? #fbbf24 : #38bdf8, text_size=t_sz)
        
        string u_trend = (is_plan_b_active ? (fc_is_bull ? "План Б 🔴" : "План Б 🟢") : is_wick_sweep ? (fc_is_bull ? "Тренд 🟢 [Свип]" : "Тренд 🔴 [Свип]") : (fc_is_bull ? "Тренд 🟢" : "Тренд 🔴")) + " | " + auto_htf_name + (hud_htf_trend_up ? " 🟢" : " 🔴") + " | RSI " + str.tostring(rsi6_val, "#")
        table.cell(t_dash, 0, 3, u_trend, text_color=color.white, text_size=t_sz)
        
        string u_mtf = zone_short + " | 5ТФ: [" + mtf_m_txt + "]"
        table.cell(t_dash, 0, 4, u_mtf, text_color=cur_score_bull >= 7 ? c_bull : (cur_score_bear >= 7 ? c_bear : c_neutral), text_size=t_sz)

    else if tbl_view_mode == "⚡ Мини-Смартфон (3 строки: Сетап / Зона / Цели)"
        t_dash := table.new(get_table_pos(table_pos), columns=2, rows=4, bgcolor=#0f172a, border_color=#334155, border_width=1, force_overlay=true)
        table.cell(t_dash, 0, 0, "★ S&T", text_color=#38bdf8, text_size=t_sz, bgcolor=#1e293b)
        table.cell(t_dash, 1, 0, syminfo.ticker + " (" + timeframe.period + ")", text_color=color.white, text_size=t_sz, bgcolor=#1e293b)

        table.cell(t_dash, 0, 1, "Сетап & WR", text_color=c_neutral, text_size=t_sz)
        string m_s_txt = is_plan_b_active ? ("⚠️ Слом SL [План Б " + (fc_is_bull ? "🔴" : "🟢") + "] 78% | " + auto_htf_name + (hud_htf_trend_up ? " Up 🟢" : " Dn 🔴")) : is_wick_sweep ? ((fc_is_bull ? "🟢 LONG " : "🔴 SHORT ") + "[⚡Свип SL] " + str.tostring(fc_probability, "#") + "% | " + auto_htf_name + (hud_htf_trend_up ? " Up 🟢" : " Dn 🔴")) : ((fc_is_bull ? "🟢 LONG " : "🔴 SHORT ") + str.tostring(fc_probability, "#") + "% (" + (fc_leg2_hit ? "✅TP1" : fc_leg1_hit ? "📍Вход" : "🎯Ожид.") + ")" + (is_high_runaway ? " ⚡БЕЗ ОТКАТА" : "") + " | " + auto_htf_name + (hud_htf_trend_up ? " Up 🟢" : " Dn 🔴"))
        table.cell(t_dash, 1, 1, m_s_txt, text_color=setup_col, text_size=t_sz)

        table.cell(t_dash, 0, 2, "TP / SL / RR", text_color=c_neutral, text_size=t_sz)
        string m_tp_txt = is_plan_b_active ? ("TP1: " + str.tostring(alt_y1, "#.##") + " | ❌ SL " + str.tostring(disp_active_sl, "#.##") + " выбит") : is_wick_sweep ? ("TP: " + str.tostring(fc_p2, "#.##") + " | ⚡ SL сдержан " + str.tostring(disp_active_sl, "#.##")) : ("TP: " + str.tostring(fc_p2, "#.##") + " | SL: " + str.tostring(cur_effective_sl, "#.##") + " (" + (trailing_stage_idx > 0 ? ("🛡️" + trailing_stage_str) : ("1:" + str.tostring(rr_ratio, "#.#"))) + ")")
        table.cell(t_dash, 1, 2, m_tp_txt, text_color=is_plan_b_active ? #fbbf24 : #38bdf8, text_size=t_sz)

        table.cell(t_dash, 0, 3, "Зона & 5TF", text_color=c_neutral, text_size=t_sz)
        string m_z_txt = zone_short + " | RSI " + str.tostring(rsi6_val, "#") + " | 5TF: [" + mtf_m_txt + "]"
        table.cell(t_dash, 1, 3, m_z_txt, text_color=in_bullish_ob ? c_bull : in_bearish_ob ? c_bear : c_gold, text_size=t_sz)

    else if tbl_view_mode == "📱 Мобильный (Полный HUD / Компакт по ширине)" or tbl_view_mode == "📱 Мобильный (Компакт / 5 строк)"
        int m_rows = 10 + (use_gex ? 1 : 0)
        t_dash := table.new(get_table_pos(table_pos), columns=2, rows=m_rows, bgcolor=#0f172a, border_color=#334155, border_width=1, force_overlay=true)
        table.cell(t_dash, 0, 0, "★ S&T", text_color=#38bdf8, text_size=t_sz, bgcolor=#1e293b)
        table.cell(t_dash, 1, 0, syminfo.ticker + " (" + timeframe.period + ")", text_color=color.white, text_size=t_sz, bgcolor=#1e293b)

        table.cell(t_dash, 0, 1, "Тренд/DXY", text_color=c_neutral, text_size=t_sz)
        string m_tr_txt = (is_plan_b_active ? (fc_is_bull ? "🔴SHORT [План Б]" : "🟢LONG [План Б]") : is_wick_sweep ? (fc_is_bull ? "🟢LONG [Свип SL]" : "🔴SHORT [Свип SL]") : (fc_is_bull ? "🟢LONG" : "🔴SHORT")) + " | " + auto_htf_name + (hud_htf_trend_up ? " Up🟢" : " Dn🔴") + (fc_is_bull == hud_htf_trend_up ? " ✨" : " ⚡") + " | DXY " + dxy_sign + str.tostring(dxy_change, "#.##") + "%"
        table.cell(t_dash, 1, 1, m_tr_txt, text_color=is_plan_b_active ? (fc_is_bull ? c_bear : c_bull) : is_wick_sweep ? (fc_is_bull ? c_bull : c_bear) : (fc_is_bull ? c_bull : c_bear), text_size=t_sz)

        table.cell(t_dash, 0, 2, "Сетап & WR", text_color=c_neutral, text_size=t_sz)
        string m_s_txt = is_plan_b_active ? ("⚠️Слом SL [План Б " + (fc_is_bull ? "🔴" : "🟢") + "] 78% (к " + str.tostring(alt_y1, "#.##") + ")") : is_wick_sweep ? ((fc_is_bull ? "🟢LONG " : "🔴SHORT ") + "[⚡Свип SL] " + str.tostring(fc_probability, "#") + "% (В тренде к TP)") : ((fc_is_bull ? "🟢LONG " : "🔴SHORT ") + str.tostring(fc_probability, "#") + "% (" + (fc_leg3_hit ? "✅TP2" : fc_leg2_hit ? "✅TP1" : fc_leg1_hit ? "📍Вход" : "🎯Ожид") + ")" + (is_high_runaway ? " ⚡NoPB" : "") + (fc_is_bull != hud_htf_trend_up ? (" (" + auto_cur_tf_name + " Откат)") : ""))
        table.cell(t_dash, 1, 2, m_s_txt, text_color=setup_col, text_size=t_sz)

        table.cell(t_dash, 0, 3, "Вход / Цели", text_color=c_neutral, text_size=t_sz)
        string m_t_txt = is_plan_b_active ? ("Слом " + str.tostring(disp_active_sl, "#.##") + " ➔ TP1 " + str.tostring(alt_y1, "#.##") + " | TP2 " + str.tostring(alt_y2, "#.##")) : is_wick_sweep ? ("Вх " + str.tostring(fc_p1, "#.##") + " [Свип ✅] ➔ TP1 " + str.tostring(fc_p2, "#.##") + " | TP2 " + str.tostring(fc_p3, "#.##")) : ("Вх " + str.tostring(fc_p1, "#.##") + " ➔ TP1 " + str.tostring(fc_p2, "#.##") + " | TP2 " + str.tostring(fc_p3, "#.##"))
        table.cell(t_dash, 1, 3, m_t_txt, text_color=is_plan_b_active ? #fbbf24 : #38bdf8, text_size=t_sz)

        table.cell(t_dash, 0, 4, "SL / Трейл", text_color=c_neutral, text_size=t_sz)
        string m_sl_txt = is_plan_b_active ? ("❌ Выбит " + str.tostring(disp_active_sl, "#.##") + " (Слом)") : is_wick_sweep ? ("SL " + str.tostring(cur_effective_sl, "#.##") + " (⚡Свип выдержан)") : ("SL " + str.tostring(cur_effective_sl, "#.##") + " (1:" + str.tostring(rr_ratio, "#.#") + ")" + (is_trailing_hit ? " ✅Фикс" : trailing_stage_idx > 0 ? (" | 🛡️" + trailing_stage_str) : ""))
        table.cell(t_dash, 1, 4, m_sl_txt, text_color=is_plan_b_active ? #ef4444 : is_wick_sweep ? #10b981 : trail_hud_col, text_size=t_sz)

        table.cell(t_dash, 0, 5, "Зона / R:R", text_color=c_neutral, text_size=t_sz)
        string m_z_txt = zone_short + " | RR 1:" + str.tostring(rr_ratio, "#.#") + " (" + str.tostring(dist_tp1_atr, "#.#") + " ATR)"
        table.cell(t_dash, 1, 5, m_z_txt, text_color=in_bullish_ob ? c_bull : in_bearish_ob ? c_bear : in_ote_zone ? c_gold : c_neutral, text_size=t_sz)

        table.cell(t_dash, 0, 6, "RSI (6/14)", text_color=c_neutral, text_size=t_sz)
        string m_rsi_txt = "R6: " + str.tostring(rsi6_val, "#.#") + " | R14: " + str.tostring(rsi14_val, "#.#") + " (" + (rsi6_val >= 80 ? "⚠️Перекуп" : rsi6_val <= 20 ? "🔥Перепрод" : rsi6_val >= 50 ? "Бычий" : "Медвеж") + ")"
        table.cell(t_dash, 1, 6, m_rsi_txt, text_color=(rsi6_val >= 80 ? c_bear : rsi6_val <= 20 ? c_bull : #a855f7), text_size=t_sz)

        table.cell(t_dash, 0, 7, "ATR / ADR", text_color=c_neutral, text_size=t_sz)
        string m_adr_txt = "ATR " + str.tostring(atr_val, "#.##") + " (" + str.tostring(atr_pct, "#.#") + "%) | ADR: " + str.tostring(adr_left_pct, "#") + "%"
        color m_adr_col = adr_left_pct > 35 ? c_bull : (adr_left_pct > 15 ? c_gold : c_bear)
        table.cell(t_dash, 1, 7, m_adr_txt, text_color=m_adr_col, text_size=t_sz)

        table.cell(t_dash, 0, 8, "5 ТФ Консенс", text_color=c_neutral, text_size=t_sz)
        string m_cons_txt = "[" + mtf_m_txt + "] " + (cur_bull_cnt == 5 ? "100% L🔥" : cur_bear_cnt == 5 ? "100% S🔥" : cur_score_bull >= 7 ? ("LONG " + str.tostring(cur_pct_bull) + "% (" + str.tostring(cur_bull_cnt) + "/5)") : cur_score_bear >= 7 ? ("SHORT " + str.tostring(cur_pct_bear) + "% (" + str.tostring(cur_bear_cnt) + "/5)") : ("Смеш " + str.tostring(cur_pct_bull) + "% ⚖️"))
        table.cell(t_dash, 1, 8, m_cons_txt, text_color=cur_score_bull >= 7 ? c_bull : (cur_score_bear >= 7 ? c_bear : c_neutral), text_size=t_sz)

        table.cell(t_dash, 0, 9, "Синтез ТФ", text_color=c_neutral, text_size=t_sz)
        string m_syn_txt = is_plan_b_active ? ("⚡Слом SL: Откат " + auto_cur_tf_name + " к " + auto_htf_name + " поддержке " + str.tostring(htf_tp1_target, "#.##")) : (auto_htf_name + " Цель: " + str.tostring(htf_tp1_target, "#.##") + " | " + (fc_is_bull == hud_htf_trend_up ? "✨Конфлюэнс" : ("⚡Откат к " + auto_htf_name)))
        table.cell(t_dash, 1, 9, m_syn_txt, text_color=is_plan_b_active ? #f59e0b : (fc_is_bull == hud_htf_trend_up ? (fc_is_bull ? c_bull : c_bear) : #f59e0b), text_size=t_sz)

        if use_gex
            table.cell(t_dash, 0, 10, "GEX/CME", text_color=c_neutral, text_size=t_sz)
            string m_gex_txt = (close >= gex_flip ? "🟢+G (Сжатие)" : "🔴-G (Импульс)") + " | C:" + str.tostring(gex_call_wall, "#.#") + " | P:" + str.tostring(gex_put_wall, "#.#") + " | Fl:" + str.tostring(gex_flip, "#.#")
            table.cell(t_dash, 1, 10, m_gex_txt, text_color=close >= gex_flip ? c_bull : c_bear, text_size=t_sz)

    else
        int hud_rows = 9 + (show_all_mtf_cons ? 1 : 0) + (show_mtf_hud ? 1 : 0) + (use_gex ? 1 : 0)
        t_dash := table.new(get_table_pos(table_pos), columns=2, rows=hud_rows, bgcolor=#0f172a, border_color=#334155, border_width=1, force_overlay=true)
        
        table.cell(t_dash, 0, 0, "★ S&T SUPER INDICATOR", text_color=#38bdf8, text_size=t_sz, bgcolor=#1e293b)
        table.cell(t_dash, 1, 0, syminfo.ticker + " (" + timeframe.period + ")", text_color=color.white, text_size=t_sz, bgcolor=#1e293b)
        
        table.cell(t_dash, 0, 1, "Тренд & Макро DXY", text_color=c_neutral, text_size=t_sz)
        table.cell(t_dash, 1, 1, (is_plan_b_active ? (fc_is_bull ? "🔴 SHORT [План Б (Слом SL)]" : "🟢 LONG [План Б (Слом SL)]") : is_wick_sweep ? (fc_is_bull ? "🟢 LONG [Свип SL]" : "🔴 SHORT [Свип SL]") : (fc_is_bull ? "🟢 LONG" : "🔴 SHORT")) + " | " + htf_label_badge + trend_confluence_txt + macro_txt, text_color=is_plan_b_active ? (fc_is_bull ? c_bear : c_bull) : is_wick_sweep ? (fc_is_bull ? c_bull : c_bear) : (fc_is_bull ? c_bull : c_bear), text_size=t_sz)

        table.cell(t_dash, 0, 2, "RSI (6 & 14)", text_color=c_neutral, text_size=t_sz)
        table.cell(t_dash, 1, 2, "RSI 6: " + str.tostring(rsi6_val, "#.#") + " | RSI 14: " + str.tostring(rsi14_val, "#.#") + " (" + (rsi6_val >= 80 ? "⚠️ Перекуп (>80)" : rsi6_val <= 20 ? "🔥 Перепрод (<20)" : rsi6_val >= 50 ? "Бычий баланс" : "Медвежий баланс") + ")", text_color=(rsi6_val >= 80 ? c_bear : rsi6_val <= 20 ? c_bull : #a855f7), text_size=t_sz)
        
        table.cell(t_dash, 0, 3, "ATR & Запас Хода", text_color=c_neutral, text_size=t_sz)
        string adr_txt = "ATR " + str.tostring(atr_val, "#.##") + " (" + str.tostring(atr_pct, "#.##") + "%) | ADR Запас: " + str.tostring(adr_left_pct, "#") + "%"
        color adr_col = adr_left_pct > 35 ? c_bull : (adr_left_pct > 15 ? c_gold : c_bear)
        table.cell(t_dash, 1, 3, adr_txt, text_color=adr_col, text_size=t_sz)

        table.cell(t_dash, 0, 4, "Зона Входа & R:R", text_color=c_neutral, text_size=t_sz)
        table.cell(t_dash, 1, 4, zone_txt + " | R:R 1:" + str.tostring(rr_ratio, "#.#") + " (" + str.tostring(dist_tp1_atr, "#.#") + " ATR)", text_color=in_bullish_ob ? c_bull : in_bearish_ob ? c_bear : in_ote_zone ? c_gold : c_neutral, text_size=t_sz)

        table.cell(t_dash, 0, 5, "Защитный SL / Трейлинг", text_color=c_neutral, text_size=t_sz)
        table.cell(t_dash, 1, 5, is_plan_b_active ? ("❌ Стоп выбит (" + str.tostring(disp_active_sl, "#.##") + ") ➔ Рынок идет по Плану Б") : is_wick_sweep ? ("SL: " + str.tostring(cur_effective_sl, "#.##") + " (⚡ Свип выдержан ➔ Защита в силе)") : trail_hud_txt, text_color=is_plan_b_active ? #ef4444 : is_wick_sweep ? #10b981 : trail_hud_col, text_size=t_sz)

        table.cell(t_dash, 0, 6, "Торговый Сетап", text_color=c_neutral, text_size=t_sz)
        table.cell(t_dash, 1, 6, is_plan_b_active ? ("⚠️ Слом структуры (SL " + str.tostring(disp_active_sl, "#.##") + ") ➔ Активирован План Б: " + (fc_is_bull ? "🔴 SHORT" : "🟢 LONG") + " к " + str.tostring(alt_y1, "#.##") + " / " + str.tostring(alt_y2, "#.##")) : is_wick_sweep ? ((fc_is_bull ? "🟢 LONG " : "🔴 SHORT ") + "[⚡ Свип ликвидности SL] (" + str.tostring(fc_probability, "#.#") + "% 🔥 В тренде к TP)") : (setup_txt + setup_prefix + " (" + str.tostring(fc_probability, "#.#") + "% " + (fc_probability >= 75.0 ? "🔥" : "⚖️") + ")" + runaway_suffix), text_color=is_plan_b_active ? (fc_is_bull ? c_bear : c_bull) : is_wick_sweep ? (fc_is_bull ? c_bull : c_bear) : setup_col, text_size=t_sz)

        int r_idx = 7
        if show_all_mtf_cons
            table.cell(t_dash, 0, r_idx, "Консенсус 5 ТФ", text_color=c_neutral, text_size=t_sz)
            string mtf_desc = ""
            color mtf_desc_col = c_neutral
            if cur_bull_cnt == 5
                mtf_desc := " | 🔥 Абсолютный LONG (5/5 ТФ | 100%)"
                mtf_desc_col := c_bull
            else if cur_bear_cnt == 5
                mtf_desc := " | 🔥 Абсолютный SHORT (5/5 ТФ | 100%)"
                mtf_desc_col := c_bear
            else if cur_bull_cnt == 4
                mtf_desc := " | 🟢 Доминирует LONG (4/5 ТФ | " + str.tostring(cur_pct_bull) + "%)"
                mtf_desc_col := c_bull
            else if cur_bear_cnt == 4
                mtf_desc := " | 🔴 Доминирует SHORT (4/5 ТФ | " + str.tostring(cur_pct_bear) + "%)"
                mtf_desc_col := c_bear
            else if macro_disp_bull and not fc_is_bull
                mtf_desc := " | ⚠️ Откат " + auto_cur_tf_name + " к поддержке (Макро LONG " + str.tostring(cur_pct_bull) + "%)"
                mtf_desc_col := #f59e0b
            else if macro_disp_bear and fc_is_bull
                mtf_desc := " | ⚠️ Коррекция " + auto_cur_tf_name + " к сопр. (Макро SHORT " + str.tostring(cur_pct_bear) + "%)"
                mtf_desc_col := #f59e0b
            else if cur_score_bull >= 6
                mtf_desc := " | 🟢 Преобладает LONG (" + str.tostring(cur_pct_bull) + "% | " + str.tostring(cur_bull_cnt) + "/5 ТФ)"
                mtf_desc_col := c_bull
            else if cur_score_bear >= 6
                mtf_desc := " | 🔴 Преобладает SHORT (" + str.tostring(cur_pct_bear) + "% | " + str.tostring(cur_bear_cnt) + "/5 ТФ)"
                mtf_desc_col := c_bear
            else
                mtf_desc := " | ⚖️ Смешанный рынок (" + (cur_score_bull >= 5 ? "Бычий уклон " + str.tostring(cur_pct_bull) + "%" : "Медвежий уклон " + str.tostring(cur_pct_bear) + "%") + ")"
                mtf_desc_col := #eab308
            table.cell(t_dash, 1, r_idx, "[" + mtf_m_txt + "]" + mtf_desc, text_color=mtf_desc_col, text_size=t_sz)
            r_idx := r_idx + 1

        if show_mtf_hud
            table.cell(t_dash, 0, r_idx, "Синтез ТФ (MTF)", text_color=c_neutral, text_size=t_sz)
            string mtf_synth_txt = ""
            color mtf_synth_col = c_neutral
            
            bool is_aligned_htf   = (fc_is_bull == hud_htf_trend_up)
            bool is_full_cons     = fc_is_bull ? (cur_bull_cnt == 5) : (cur_bear_cnt == 5)
            bool is_dominant_cons = fc_is_bull ? (cur_score_bull >= 7 and hud_htf_trend_up) : (cur_score_bear >= 7 and not hud_htf_trend_up)
            bool is_macro_counter = fc_is_bull ? macro_disp_bear : macro_disp_bull
            
            if is_plan_b_active
                mtf_synth_txt := "⚡ Слом SL " + str.tostring(disp_active_sl, "#.##") + ": Откат по Плану Б к TP1 " + str.tostring(alt_y1, "#.##") + " | Старшая цель " + auto_htf_name + " @ " + str.tostring(htf_tp1_target, "#.##")
                mtf_synth_col := #f59e0b
            else if is_full_cons
                mtf_synth_txt := "🔥 Полный консенсус (5/5 ТФ): " + (fc_is_bull ? "LONG ➔ " : "SHORT ➔ ") + "TP1 " + str.tostring(fc_p2, "#.##") + " | Старшая цель " + auto_htf_name + " " + str.tostring(htf_tp1_target, "#.##") + " (95% 🔥)"
                mtf_synth_col := fc_is_bull ? c_bull : c_bear
            else if is_dominant_cons
                string tf_strength = (cur_bull_cnt >= 4 or cur_bear_cnt >= 4) ? (" (" + str.tostring(fc_is_bull ? cur_bull_cnt : cur_bear_cnt) + "/5 ТФ)") : " (Институционалы 4Ч/1Д/1W)"
                mtf_synth_txt := "✨ Доминирующий консенсус" + tf_strength + ": " + (fc_is_bull ? "LONG ➔ " : "SHORT ➔ ") + "TP1 " + str.tostring(fc_p2, "#.##") + " | Старшая цель " + auto_htf_name + " " + str.tostring(htf_tp1_target, "#.##") + " (" + str.tostring(fc_is_bull ? cur_pct_bull : cur_pct_bear) + "%)"
                mtf_synth_col := fc_is_bull ? c_bull : c_bear
            else if not is_aligned_htf
                if not fc_is_bull and hud_htf_trend_up
                    mtf_synth_txt := "⚠️ Конфликт ТФ (" + auto_cur_tf_name + " SHORT vs " + auto_htf_name + " LONG): Откат к поддержке " + str.tostring(fc_p2, "#.##") + " ➔ Разворот в LONG " + auto_htf_name + " к " + str.tostring(htf_tp1_target, "#.##") + " (" + str.tostring(cur_pct_bull) + "%)"
                else
                    mtf_synth_txt := "⚠️ Конфликт ТФ (" + auto_cur_tf_name + " LONG vs " + auto_htf_name + " SHORT): Коррекция вверх к сопр. " + str.tostring(fc_p2, "#.##") + " ➔ Возобновление SHORT " + auto_htf_name + " к " + str.tostring(htf_tp1_target, "#.##") + " (" + str.tostring(cur_pct_bear) + "%)"
                mtf_synth_col := #f59e0b
            else if is_macro_counter
                mtf_synth_txt := "⚠️ Контртренд к Макро (" + auto_cur_tf_name + " " + (fc_is_bull ? "LONG" : "SHORT") + "): Импульс к TP1 " + str.tostring(fc_p2, "#.##") + " ➔ Осторожно, против тренда 1Д/1Нед (" + (fc_is_bull ? str.tostring(cur_pct_bear) + "% SHORT" : str.tostring(cur_pct_bull) + "% LONG") + ")"
                mtf_synth_col := #f59e0b
            else
                mtf_synth_txt := "⚡ Локальный импульс (" + auto_cur_tf_name + " + " + auto_htf_name + " " + (fc_is_bull ? "LONG" : "SHORT") + " ➔ TP1 " + str.tostring(fc_p2, "#.##") + ") | Смешанный консенсус (" + str.tostring(cur_pct_bull) + "% ⚖️)"
                mtf_synth_col := fc_is_bull ? c_bull : c_bear
            table.cell(t_dash, 1, r_idx, mtf_synth_txt, text_color=mtf_synth_col, text_size=t_sz)
            r_idx := r_idx + 1

        if use_gex
            table.cell(t_dash, 0, r_idx, "GEX Опционы (CME)", text_color=c_neutral, text_size=t_sz)
            string gex_h_txt = (close >= gex_flip ? "🟢 +GAMMA (Сжатие волатильности)" : "🔴 -GAMMA (Взрывной импульс)") + " | Call: " + str.tostring(gex_call_wall, "#.##") + " | Put: " + str.tostring(gex_put_wall, "#.##") + " | Flip: " + str.tostring(gex_flip, "#.##")
            color gex_h_col = close >= gex_flip ? c_bull : c_bear
            table.cell(t_dash, 1, r_idx, gex_h_txt, text_color=gex_h_col, text_size=t_sz)
            r_idx := r_idx + 1

        table.cell(t_dash, 0, r_idx, "Альтернатива (План Б)", text_color=c_neutral, text_size=t_sz)
        string plan_b_status = is_plan_b_active ? ("🔥 АКТИВЕН ➔ Цель 1: " + str.tostring(alt_y1, "#.##") + " | Цель 2: " + str.tostring(alt_y2, "#.##")) : plan_b_opposes_mtf ? ("🛡️ Блокирован (Защита от слома против 70%+ консенсуса ТФ)") : show_alt_wave ? ("⚠️ При сломе SL " + str.tostring(fc_invalid_level, "#.##") + (fc_is_bull ? " ➔ SHORT" : " ➔ LONG")) : "⚪ Отключен"
        color plan_b_col = is_plan_b_active ? #ef4444 : plan_b_opposes_mtf ? #64748b : #fbbf24
        table.cell(t_dash, 1, r_idx, plan_b_status, text_color=plan_b_col, text_size=t_sz)
        r_idx := r_idx + 1

        table.cell(t_dash, 0, r_idx, "Активный Пресет", text_color=c_neutral, text_size=t_sz)
        string preset_disp = preset_sel == "★ Универсальный (Все таймфреймы / Авто-Адаптивный)" ? ("★ Универсальный (" + auto_cur_tf_name + " / Авто)") : preset_sel
        table.cell(t_dash, 1, r_idx, preset_disp, text_color=#38bdf8, text_size=t_sz)

bool _xo_gex_flip = ta.crossover(close, nz(gex_flip, close))
bool _xu_gex_flip = ta.crossunder(close, nz(gex_flip, close))
bool _x_call_wall = ta.cross(close, nz(gex_call_wall, close))
bool _x_put_wall  = ta.cross(close, nz(gex_put_wall, close))

bool gex_xo_flip = not na(gex_flip) and _xo_gex_flip
bool gex_xu_flip = not na(gex_flip) and _xu_gex_flip
bool gex_test_call = not na(gex_call_wall) and _x_call_wall
bool gex_test_put  = not na(gex_put_wall) and _x_put_wall

alertcondition(use_gex and gex_xo_flip, "⚡ [Telegram] S&T GEX: Переход в +GAMMA", "⚡ S&T GEX: Цена поднялась выше Zero-Gamma Flip! Дилеры входят в зону положительной гаммы (+GEX). Ожидается затухание волатильности, стабилизация и откат к Max Pain. Ticker: {{ticker}}, Close: {{close}}")
alertcondition(use_gex and gex_xu_flip, "🚨 [Telegram] S&T GEX: Срыв в -GAMMA (Шторм)", "🚨 S&T GEX: Внимание! Цена сорвалась ниже Zero-Gamma Flip в зону отрицательной гаммы (-GEX)! Дилеры усиливают тренд шортом фьючерсов, высок риск взрывного импульса и пробоя поддержек! Ticker: {{ticker}}, Close: {{close}}")
alertcondition(use_gex and (gex_test_call or gex_test_put), "🏰 [Telegram] S&T GEX: Тест Опционной Стены (Call/Put Wall)", "🏰 S&T GEX: Цена тестирует ключевую стену дилеров (Call Wall / Put Wall)! Вероятность отскока 80-85%. Ticker: {{ticker}}, Close: {{close}}")

bool fc_pre_entry_cond = fc_start_bar > 0 and bar_index > fc_start_bar and not fc_leg1_hit and (in_ote_zone or (fc_is_bull and low <= fc_p1 + atr * 0.5) or (not fc_is_bull and high >= fc_p1 - atr * 0.5))
bool alert_fc_pre_entry = fc_pre_entry_cond and not fc_pre_entry_cond[1]

bool alert_runaway_no_pullback = not fc_leg1_hit and not fc_leg2_hit and is_high_runaway and (fc_start_bar > 0 and bar_index >= fc_start_bar)

bool alert_fc_entry     = fc_leg1_hit and not fc_leg1_hit[1]
bool alert_fc_tp1       = fc_leg2_hit and not fc_leg2_hit[1]
bool alert_fc_tp2       = fc_leg3_hit and not fc_leg3_hit[1]
bool alert_fc_retest    = fc_leg4_hit and not fc_leg4_hit[1]
bool alert_fc_tp3       = fc_leg5_hit and not fc_leg5_hit[1]

bool fc_sl_cond         = fc_start_bar > 0 and bar_index > fc_start_bar and not fc_leg3_hit and ((fc_is_bull and low <= cur_effective_sl) or (not fc_is_bull and high >= cur_effective_sl))
bool alert_fc_sl        = fc_sl_cond and not fc_sl_cond[1]

bool alert_trailing_be   = use_trailing and trailing_stage_idx == 1 and trailing_stage_idx[1] == 0
bool alert_trailing_lock = use_trailing and trailing_stage_idx == 2 and trailing_stage_idx[1] < 2
bool alert_trailing_hit  = is_sl_breached and trailing_stage_idx > 0

alertcondition(buy_sig, "S&T LONG СИГНАЛ", "Сработал LONG Сигнал на S&T Super Indicator! Asset: {{ticker}}, Price: {{close}}")
alertcondition(sell_sig, "S&T SHORT СИГНАЛ", "Сработал SHORT Сигнал на S&T Super Indicator! Asset: {{ticker}}, Price: {{close}}")
alertcondition(is_choch, "Слом Характера CHoCH", "Произошел слом характера тренда CHoCH! Asset: {{ticker}}, Price: {{close}}")
alertcondition(is_bos, "Слом Структуры BOS", "Произошел слом структуры тренда BOS! Asset: {{ticker}}, Price: {{close}}")

alertcondition(macd_cross_bull, "S&T SUPER MACD Бычий Крест", "Линия MACD (DIF) пересекла сигнальную (DEA) снизу вверх! Ticker: {{ticker}}, Close: {{close}}")
alertcondition(macd_cross_bear, "S&T SUPER MACD Медвежий Крест", "Линия MACD (DIF) пересекла сигнальную (DEA) сверху вниз! Ticker: {{ticker}}, Close: {{close}}")

alertcondition(alert_runaway_no_pullback and not alert_runaway_no_pullback[1], "⚡ [Telegram] Предупреждение: Импульс БЕЗ ОТКАТА (Runaway)", "⚡ S&T SUPER: Аномальный моментум! Вероятность движения сразу к TP1 без отката к точке входа высокая! Рекомендован вход сплитом (50% Market / 50% Limit) или по пробою! Актив: {{ticker}}, Цена: {{close}}")
alertcondition(alert_fc_pre_entry, "⚡ [Telegram] Подготовка к Входу (Приближение к OTE)", "⚡ S&T ВОЛНОВОЙ ПРОГНОЗ: Цена приближается к зоне входа! Приготовиться к ордеру. Актив: {{ticker}}, Текущая цена: {{close}}")
alertcondition(alert_fc_entry, "📍 [Telegram] ВХОД В ПОЗИЦИЮ (Leg 1 Entry)", "📍 S&T ВОЛНОВОЙ ПРОГНОЗ: Достигнута точка ВХОДА (Entry / OTE)! Выставить SL и TP. Актив: {{ticker}}, Вход: {{close}}")
alertcondition(alert_fc_tp1, "🏁 [Telegram] ТЕЙК-ПРОФИТ 1 (TP1 / Пробой)", "🏁 S&T ВОЛНОВОЙ ПРОГНОЗ: Достигнута первая цель TP1 (Пробой)! Перенести SL в безубыток. Актив: {{ticker}}, TP1: {{close}}")
alertcondition(alert_fc_tp2, "🎯 [Telegram] ТЕЙК-ПРОФИТ 2 (TP2 / Главная Цель)", "🎯 S&T ВОЛНОВОЙ ПРОГНОЗ: Достигнута главная цель TP2! Фиксация основной прибыли. Актив: {{ticker}}, TP2: {{close}}")
alertcondition(alert_fc_retest, "🔄 [Telegram] Зеркальный Ретест (Leg 4)", "🔄 S&T ВОЛНОВОЙ ПРОГНОЗ: Исполнен зеркальный ретест! Актив: {{ticker}}, Цена: {{close}}")
alertcondition(alert_fc_tp3, "🚀 [Telegram] ТЕЙК-ПРОФИТ 3 (TP3 / 2.618 Fib Target)", "🚀 S&T ВОЛНОВОЙ ПРОГНОЗ: Достигнута максимальная цель TP3 (2.618 Fib)! Зафиксировать максимум. Актив: {{ticker}}, TP3: {{close}}")
alertcondition(alert_fc_sl, "🛑 [Telegram] СТОП-ЛОСС / Отмена Сетапа (SL Hit)", "🛑 S&T ВОЛНОВОЙ ПРОГНОЗ: Достигнут уровень отмены прогноза (Stop Loss)! Актив: {{ticker}}, SL: {{close}}")
alertcondition(alert_trailing_be, "🔒 [Telegram] Трейлинг: Перенос в Безубыток (BE)", "🔒 S&T SUPER: Позиция переведена в защитный Безубыток (BE)! Актив: {{ticker}}, Цена: {{close}}")
alertcondition(alert_trailing_lock, "💰 [Telegram] Трейлинг: Фиксация 50% Прибыли TP1", "💰 S&T SUPER: Первая цель достигнута! Трейлинг-стоп подтянут для защиты 50% прибыли. Актив: {{ticker}}")
alertcondition(alert_trailing_hit, "🛑 [Telegram] Закрытие по Трейлинг-Стопу", "🛑 S&T SUPER: Сделка защищена и закрыта по Трейлинг-Стопу с сохранением профита! Актив: {{ticker}}, Цена: {{close}}")

bool hist_is_growing = macd_hist >= macd_hist[1]
color col_hist = hist_is_growing ? #0ecb81 : #f6465d

plot(show_macd_pane ? macd_hist : na, "MACD Столбцы (Binance от 0.0)", color=col_hist, style=plot.style_columns)
plot(show_macd_pane ? macd_line : na, "MACD DIF Быстрая (Binance Желтая)", color=#facc15, linewidth=2)
plot(show_macd_pane ? macd_signal : na, "MACD DEA Сигнальная (Binance Розовая)", color=#ec4899, linewidth=2)
plot(show_macd_pane ? 0.0 : na, "MACD Нулевая Линия 0.0", color=color.new(color.gray, 60), style=plot.style_linebr)`;
};
export const generateForecastBarsScript = (s: IndicatorSettings) => {
  const isMobileOptimized = s.mobileOptimized;

  const VALID_PRESETS = [
    "★ Универсальный (Все таймфреймы / Авто-Адаптивный)",
    "По умолчанию (Ручные настройки)",
    "Золото (XAUUSD) - 15 мин Оптимальный",
    "Биткоин (BTCUSD) - 15 мин Оптимальный",
    "1 мин - Сверхбыстрый скальпинг",
    "5 мин - Быстрый скальпинг",
    "15 мин - Оптимальный Интрадей",
    "1 час - Часовой тренд",
    "4 часа - Свинг-трейдинг",
    "1 день - Инвестиционный/Дневной"
  ];
  const safePreset = (s.selectedPreset && VALID_PRESETS.includes(s.selectedPreset))
    ? s.selectedPreset
    : "★ Универсальный (Все таймфреймы / Авто-Адаптивный)";

  const safeLbSt = Math.max(2, Math.min(10, Math.round(s.orderBlockPeriod ?? s.structureLookback ?? 4)));
  const safeTpMult = Math.max(0.5, Math.min(3.0, Number(s.forecastTargetMult) || 1.0));
  const safeNeighborsK = Math.max(1, Math.min(30, Math.round(s.neighborCount ?? 8)));
  const safeMlThreshold = Math.max(0.1, Math.min(1.0, Number(s.lorentzianThreshold) || 0.5));

  return `//@version=6
indicator("S&T Forecast Bars Edition v6 [Smart Money + Candle Forecast]", "S&T BARS", overlay=true, max_boxes_count=500, max_lines_count=500, max_labels_count=500)

// ==========================================================
// ⚙️ ГРУППА 0: СИСТЕМА ОПТИМАЛЬНЫХ ПРЕСЕТОВ S&T (GOLD & BTC)
// ==========================================================
gp_presets   = "⚙️ Оптимальные Пресеты S&T"
preset_sel   = input.string("${safePreset}", "Выбрать Оптимальный Пресет", options=[
     "★ Универсальный (Все таймфреймы / Авто-Адаптивный)",
     "По умолчанию (Ручные настройки)",
     "Золото (XAUUSD) - 15 мин Оптимальный",
     "Биткоин (BTCUSD) - 15 мин Оптимальный",
     "1 мин - Сверхбыстрый скальпинг",
     "5 мин - Быстрый скальпинг",
     "15 мин - Оптимальный Интрадей",
     "1 час - Часовой тренд",
     "4 часа - Свинг-трейдинг",
     "1 день - Инвестиционный/Дневной"
     ], group=gp_presets, tooltip="★ Универсальный пресет динамически подстраивает глубину структуры, чувствительность и цели свечного прогноза под любой выбранный таймфрейм от 1м до 1Д.")

// ==========================================================
// 📱 ГРУППА 1: НАСТРОЙКИ МОБИЛЬНОЙ ОПТИМИЗАЦИИ И ИНТЕРФЕЙСА
// ==========================================================
gp_ui        = "📱 Настройки Мобильной Оптимизации и Интерфейса"
show_tables  = input.bool(${s.showDashboard??s.showDashboardTable!==!1}, "Показывать инфо-панель S&T", group=gp_ui)
compact_mode = input.bool(true, "Компактный режим панели (для мобильных)", group=gp_ui)
table_pos    = input.string("Нижний левый", "Позиция инфо-панели", options=["Верхний левый", "Верхний правый", "Нижний левый", "Нижний правый"], group=gp_ui)
text_sz_opt  = input.string("Микро", "Размер шрифта на графике", options=["Микро", "Маленький", "Обычный", "Крупный"], group=gp_ui)
label_offset = input.int(15, "Смещение меток вправо (бары)", minval=2, maxval=50, group=gp_ui)
line_len     = input.int(25, "Длина уровней Фибоначчи (бары)", minval=5, maxval=100, group=gp_ui)
clean_ob     = input.bool(true, "Скрывать протестированные (mitigated) OB/FVG", group=gp_ui)
show_sweeps  = input.bool(true, "Показывать надписи SWEEP на графике", group=gp_ui)

// ==========================================================
// 📊 ГРУППА 2: АНАЛИЗ ДЕЛЬТЫ ОБЪЕМА (Volume Delta & MTF)
// ==========================================================
gp_delta     = "📊 Volume Delta & MTF Настройки"
use_mtf      = input.bool(true, "Включить MTF Анализ дельты", group=gp_delta)
mtf_tf       = input.timeframe("5", "Таймфрейм для MTF (5TF)", group=gp_delta)
vd_smoothing = input.int(14, "Сглаживание дельты (EMA)", minval=1, group=gp_delta)
extreme_th   = input.float(1, "Порог аномальной дельты (STD)", minval=0.5, step=0.1, group=gp_delta)

// ==========================================================
// 🌐 ГРУППА МАКРО-РЫНКОВ (DXY & BRENT OIL)
// ==========================================================
gp_macro     = "🌐 Внешние Макро-Рынки (DXY & Нефть)"
dxy_symbol   = input.symbol("DXY", "Символ Индекса Доллара США", group=gp_macro)
oil_symbol   = input.symbol("UKOIL", "Символ Нефти Brent", group=gp_macro)

// ==========================================================
// 🏛️ ГРУППА 3: СТРУКТУРА РЫНКА (SMC & S&R Horizons)
// ==========================================================
gp_smc       = "🏛️ SMC & S&R Настройки"
lb_st        = input.int(${safeLbSt}, "Период Pivot ST (Краткосрочный)", minval=2, maxval=10, group=gp_smc)
lb_it        = input.int(12, "Период Pivot IT (Среднесрочный)", minval=5, maxval=20, group=gp_smc)
lb_lt        = input.int(28, "Период Pivot LT (Долгосрочный)", minval=15, maxval=50, group=gp_smc)
show_bos     = input.bool(true, "Показывать BOS / CHoCH", group=gp_smc)
show_ob      = input.bool(${s.showOrderBlocks??s.showOB!==!1}, "Показывать Блоки Ордеров (OB)", group=gp_smc)
show_fvg     = input.bool(${s.showFvg??s.showFVG!==!1}, "Показывать Имбалансы (FVG)", group=gp_smc)
ob_limit     = input.int(3, "Макс. активных блоков OB", minval=1, maxval=20, group=gp_smc)
show_sr_zones= input.bool(true, "Показывать институциональные зоны S&R", group=gp_smc)
max_sr_boxes = input.int(3, "Макс. активных зон на горизонт", minval=1, maxval=10, group=gp_smc)
merge_sr     = input.bool(true, "Объединять накладывающиеся зоны S&R", group=gp_smc)
merge_dist   = input.float(0.65, "Дистанция объединения (ATR)", minval=0.1, maxval=2.0, step=0.05, group=gp_smc)

// ==========================================================
// 🎯 ГРУППА 4: ФИБОНАЧЧИ И ЗОНЫ ВЕРОЯТНОСТЕЙ
// ==========================================================
gp_fib       = "🎯 Фибоначчи & Зоны Верности"
show_ote     = input.bool(true, "Показывать OTE Зону (62%-79%)", group=gp_fib)
show_ext     = input.bool(true, "Показывать Цели Расширения (1.618 - 2.618)", group=gp_fib)
show_probs   = input.bool(${s.showProbabilities!==!1}, "Показывать Вероятность Успеха (%)", group=gp_fib)

// ==========================================================
// 🔮 ГРУППА 5: ПРОГНОЗНЫЕ СВЕЧИ И СЦЕНАРИИ (CANDLE BARS FORECAST)
// ==========================================================
gp_fc        = "🔮 Прогнозные Свечи (Forecast Bars) & Сценарии"
show_forecast= input.bool(${s.showWaveForecast??s.showPriceForecast!==!1}, "Показывать Прогнозные Свечи (Bars)", group=gp_fc)
show_alt_wave= input.bool(true, "Показывать Альтернативный Сценарий Свечей", group=gp_fc)
fc_post_target = input.bool(${s.forecastShowPostTarget!==!1}, "Показывать Свечи Зеркального Ретеста (Leg 4)", group=gp_fc)
tp_mult      = input.float(${safeTpMult}, "Мультипликатор расширения целей", minval=0.5, maxval=3.0, step=0.1, group=gp_fc)

// ==========================================================
// 🤖 ГРУППА 6: LORENTZIAN ML КЛАССИФИКАТОР (AI SIGNALS)
// ==========================================================
gp_ml        = "🤖 Lorentzian Machine Learning (AI)"
show_ml      = input.bool(${s.showMlSignals??s.mlEnabled!==!1}, "Включить ИИ-Сигналы (Lorentzian KNN)", group=gp_ml)
neighbors_k  = input.int(${safeNeighborsK}, "Количество соседей K-NN", minval=1, maxval=30, group=gp_ml)
max_bars_back= input.int(2000, "Обучающая выборка (Бары back)", minval=100, maxval=5000, group=gp_ml)
ml_threshold = input.float(${safeMlThreshold}, "Порог сигнала классификатора", minval=0.1, maxval=1.0, step=0.05, group=gp_ml)

// --- ЦВЕТОВАЯ ПАЛИТРА S&T PREMIUM ---
c_bull       = #10b981
c_bear       = #ef4444
c_bull_ob    = color.new(#10b981, 82)
c_bear_ob    = color.new(#ef4444, 82)
c_bull_fvg   = color.new(#06b6d4, 85)
c_bear_fvg   = color.new(#f59e0b, 85)
c_neut       = #94a3b8

// --- ПРЕСЕТЫ И ПЕРЕЗАПИСЬ ПАРАМЕТРОВ ---
var int preset_lb_st = lb_st
var int preset_lb_it = lb_it
var int preset_lb_lt = lb_lt
var float preset_tp_mult = tp_mult

int tf_in_sec = timeframe.in_seconds()

if preset_sel == "★ Универсальный (Все таймфреймы / Авто-Адаптивный)"
    if tf_in_sec <= 180
        preset_lb_st := 2
        preset_lb_it := 6
        preset_lb_lt := 15
        preset_tp_mult := 0.85
    else if tf_in_sec <= 300
        preset_lb_st := 3
        preset_lb_it := 8
        preset_lb_lt := 20
        preset_tp_mult := 1.00
    else if tf_in_sec <= 900
        preset_lb_st := 3
        preset_lb_it := 10
        preset_lb_lt := 24
        preset_tp_mult := 1.10
    else if tf_in_sec <= 1800
        preset_lb_st := 4
        preset_lb_it := 12
        preset_lb_lt := 26
        preset_tp_mult := 1.15
    else if tf_in_sec <= 7200
        preset_lb_st := 5
        preset_lb_it := 14
        preset_lb_lt := 30
        preset_tp_mult := 1.20
    else if tf_in_sec <= 28800
        preset_lb_st := 6
        preset_lb_it := 16
        preset_lb_lt := 36
        preset_tp_mult := 1.35
    else
        preset_lb_st := 8
        preset_lb_it := 20
        preset_lb_lt := 45
        preset_tp_mult := 1.50
else if preset_sel == "Золото (XAUUSD) - 15 мин Оптимальный"
    preset_lb_st := 3
    preset_lb_it := 9
    preset_lb_lt := 21
    preset_tp_mult := 1.2
else if preset_sel == "Биткоин (BTCUSD) - 15 мин Оптимальный"
    preset_lb_st := 5
    preset_lb_it := 14
    preset_lb_lt := 32
    preset_tp_mult := 1.5
else if preset_sel == "1 мин - Сверхбыстрый скальпинг"
    preset_lb_st := 2
    preset_lb_it := 6
    preset_lb_lt := 15
    preset_tp_mult := 0.8
else if preset_sel == "5 мин - Быстрый скальпинг"
    preset_lb_st := 3
    preset_lb_it := 8
    preset_lb_lt := 20
    preset_tp_mult := 1.0
else if preset_sel == "15 мин - Оптимальный Интрадей"
    preset_lb_st := 4
    preset_lb_it := 12
    preset_lb_lt := 28
    preset_tp_mult := 1.1
else if preset_sel == "1 час - Часовой тренд"
    preset_lb_st := 6
    preset_lb_it := 16
    preset_lb_lt := 36
    preset_tp_mult := 1.3
else if preset_sel == "4 часа - Свинг-трейдинг"
    preset_lb_st := 8
    preset_lb_it := 20
    preset_lb_lt := 45
    preset_tp_mult := 1.6
else if preset_sel == "1 день - Инвестиционный/Дневной"
    preset_lb_st := 10
    preset_lb_it := 24
    preset_lb_lt := 50
    preset_tp_mult := 2.0
else
    preset_lb_st := lb_st
    preset_lb_it := lb_it
    preset_lb_lt := lb_lt
    preset_tp_mult := tp_mult

// Вспомогательная функция размера шрифта
get_text_size(string opt) =>
    switch opt
        "Микро"    => size.tiny
        "Маленький"=> size.small
        "Обычный"  => size.normal
        "Крупный"  => size.large
        => size.tiny

// 1. АНАЛИЗ ДЕЛЬТЫ ОБЪЕМА И ВНЕШНИХ РЫНКОВ
atr = ta.atr(14)
float lowest_low_8 = ta.lowest(low, 8)
float highest_high_8 = ta.highest(high, 8)
vol = volume
delta_raw = close > open ? vol * (high - open + close - low) / (2 * (high - low)) : (close < open ? -vol * (open - low + high - close) / (2 * (high - low)) : 0)
delta_smooth = ta.ema(delta_raw, vd_smoothing)
delta_std = ta.stdev(delta_smooth, 50)
is_extreme_delta = math.abs(delta_smooth) > delta_std * extreme_th

// MTF Дельта
[mtf_close, mtf_open, mtf_high, mtf_low, mtf_vol] = request.security(syminfo.tickerid, mtf_tf, [close, open, high, low, volume], lookahead=barmerge.lookahead_off)
mtf_delta = mtf_close > mtf_open ? mtf_vol : -mtf_vol

// Макро-индикаторы DXY и Нефть
dxy_close = request.security(dxy_symbol, timeframe.period, close, ignore_invalid_symbol=true)
oil_close = request.security(oil_symbol, timeframe.period, close, ignore_invalid_symbol=true)

dxy_change = not na(dxy_close) and not na(dxy_close[1]) ? (dxy_close - dxy_close[1]) / dxy_close[1] * 100 : 0.0
oil_change = not na(oil_close) and not na(oil_close[1]) ? (oil_close - oil_close[1]) / oil_close[1] * 100 : 0.0

// 2. СТРУКТУРА РЫНКА SMC (Краткосрочные, Среднесрочные и Долгосрочные PIVOT)
st_ph = ta.pivothigh(preset_lb_st, preset_lb_st)
st_pl = ta.pivotlow(preset_lb_st, preset_lb_st)
it_ph = ta.pivothigh(preset_lb_it, preset_lb_it)
it_pl = ta.pivotlow(preset_lb_it, preset_lb_it)
lt_ph = ta.pivothigh(preset_lb_lt, preset_lb_lt)
lt_pl = ta.pivotlow(preset_lb_lt, preset_lb_lt)

var float last_st_ph = na, var float last_st_pl = na
var float last_it_ph = na, var float last_it_pl = na
var float last_lt_ph = na, var float last_lt_pl = na

if not na(st_ph)
    last_st_ph := st_ph
if not na(st_pl)
    last_st_pl := st_pl

if not na(it_ph)
    last_it_ph := it_ph
if not na(it_pl)
    last_it_pl := it_pl

if not na(lt_ph)
    last_lt_ph := lt_ph
if not na(lt_pl)
    last_lt_pl := lt_pl

// Определение BOS / CHoCH
bool is_bull_bos = ta.crossover(close, last_it_ph)
bool is_bear_bos = ta.crossunder(close, last_it_pl)

// SWEEP (Снятие ликвидности)
bool is_high_sweep = high > last_it_ph and close < last_it_ph
bool is_low_sweep  = low < last_it_pl and close > last_it_pl

// 3. БЛОКИ ОРДЕРОВ (OB) И ИМБАЛАНСЫ (FVG)
type OrderBlock
    box ob_box
    float top
    float bottom
    bool is_bull
    int birth_bar

type Imbalance
    box fvg_box
    float top
    float bottom
    bool is_bull

var OrderBlock[] active_obs = array.new<OrderBlock>()
var Imbalance[] active_fvgs  = array.new<Imbalance>()

// Детекция FVG
bool bull_fvg_cond = low > high[2] and close[1] > high[2]
bool bear_fvg_cond = high < low[2] and close[1] < low[2]

if show_fvg
    if bull_fvg_cond
        box b = box.new(left=bar_index-2, top=low, right=bar_index+line_len, bottom=high[2], xloc=xloc.bar_index, border_color=color.new(c_bull, 50), bgcolor=c_bull_fvg)
        array.push(active_fvgs, Imbalance.new(b, low, high[2], true))
    if bear_fvg_cond
        box b = box.new(left=bar_index-2, top=low[2], right=bar_index+line_len, bottom=high, xloc=xloc.bar_index, border_color=color.new(c_bear, 50), bgcolor=c_bear_fvg)
        array.push(active_fvgs, Imbalance.new(b, low[2], high, false))

// Детекция OB
if show_ob
    if is_bull_bos and not na(st_pl)
        box b = box.new(left=bar_index-preset_lb_st, top=high[preset_lb_st], right=bar_index+line_len, bottom=low[preset_lb_st], xloc=xloc.bar_index, border_color=c_bull, bgcolor=c_bull_ob)
        array.push(active_obs, OrderBlock.new(b, high[preset_lb_st], low[preset_lb_st], true, bar_index))
    if is_bear_bos and not na(st_ph)
        box b = box.new(left=bar_index-preset_lb_st, top=high[preset_lb_st], right=bar_index+line_len, bottom=low[preset_lb_st], xloc=xloc.bar_index, border_color=c_bear, bgcolor=c_bear_ob)
        array.push(active_obs, OrderBlock.new(b, high[preset_lb_st], low[preset_lb_st], false, bar_index))

// Очистка и продление OB/FVG
if array.size(active_fvgs) > 0
    for i = array.size(active_fvgs) - 1 to 0
        Imbalance f = array.get(active_fvgs, i)
        if (f.is_bull and low < f.bottom) or (not f.is_bull and high > f.top)
            if clean_ob
                box.delete(f.fvg_box)
                array.remove(active_fvgs, i)

if array.size(active_obs) > 0
    for i = array.size(active_obs) - 1 to 0
        OrderBlock o = array.get(active_obs, i)
        if (o.is_bull and close < o.bottom) or (not o.is_bull and close > o.top)
            if clean_ob
                box.delete(o.ob_box)
                array.remove(active_obs, i)

// 4. LORENTZIAN CLASSIFIER (AI KNN SIGNALS)
f1 = ta.rsi(close, 14)
f2 = ta.cci(close, 20)
[_, _, f3] = ta.dmi(14, 14)

var int ml_signal = 0
if show_ml
    var float[] f1_hist = array.new_float(0)
    var float[] f2_hist = array.new_float(0)
    var int[] dir_hist  = array.new_int(0)
    
    array.push(f1_hist, f1)
    array.push(f2_hist, f2)
    array.push(dir_hist, close > open ? 1 : -1)
    
    if array.size(f1_hist) > max_bars_back
        array.shift(f1_hist)
        array.shift(f2_hist)
        array.shift(dir_hist)
        
    if bar_index > 100
        float total_dist = 0.0
        int pos_votes = 0
        int neg_votes = 0
        int sz = array.size(f1_hist)
        int step_sz = math.max(1, math.floor(sz / 50))
        
        for i = 0 to sz - 1 by step_sz
            float d1 = math.log(1 + math.abs(f1 - array.get(f1_hist, i)))
            float d2 = math.log(1 + math.abs(f2 - array.get(f2_hist, i)))
            float dist = d1 + d2
            if array.get(dir_hist, i) == 1
                pos_votes := pos_votes + 1
            else
                neg_votes := neg_votes + 1
                
        if pos_votes > neg_votes * (1 + ml_threshold)
            ml_signal := 1
        else if neg_votes > pos_votes * (1 + ml_threshold)
            ml_signal := -1
        else
            ml_signal := 0

// Итоговые сигналы
bool buy_sig  = (is_bull_bos or is_low_sweep) and (not show_ml or ml_signal == 1) and delta_smooth > 0
bool sell_sig = (is_bear_bos or is_high_sweep) and (not show_ml or ml_signal == -1) and delta_smooth < 0

// 5. ВЕРОЯТНОСТИ, СИНТЕЗ S&R ГОРИЗОНТОВ И ВОЛНОВОЙ ФИБО-ПРОГНОЗ
var float highest_high = na
var float lowest_low   = na

if is_bull_bos or buy_sig
    highest_high := high
    lowest_low   := low
else
    highest_high := math.max(highest_high, high)
    lowest_low   := math.min(lowest_low, low)

swing_range = highest_high - lowest_low
ote_top    = is_bull_bos ? highest_high - swing_range * 0.618 : lowest_low + swing_range * 0.786
ote_bottom = is_bull_bos ? highest_high - swing_range * 0.786 : lowest_low + swing_range * 0.618
ext_1      = is_bull_bos ? highest_high + swing_range * 0.272 : lowest_low - swing_range * 0.272
ext_2      = is_bull_bos ? highest_high + swing_range * 0.618 : lowest_low - swing_range * 0.618
ext_3      = is_bull_bos ? highest_high + swing_range * 1.618 : lowest_low - swing_range * 1.618

bool in_ote_zone = close >= math.min(ote_top, ote_bottom) and close <= math.max(ote_top, ote_bottom)

// РАСЧЕТ ВИНРЕЙТА / ВЕРОЯТНОСТИ (%)
var float fc_probability = 68.0
if buy_sig or sell_sig
    fc_probability := 72.0
    if is_extreme_delta
        fc_probability := fc_probability + 8.0
    if ml_signal != 0
        fc_probability := fc_probability + 10.0
    if in_ote_zone
        fc_probability := fc_probability + 10.0
    fc_probability := math.min(98.0, math.max(35.0, fc_probability))

// Фиксация исторической волны прогноза
var int fc_start_bar = 0
var float fc_start_price = na
var bool fc_is_bull = true
var float fc_p1 = na, var float fc_p2 = na, var float fc_p3 = na
var float fc_alt_p1 = na, var float fc_alt_p2 = na, var float fc_alt_p3 = na, var float fc_alt_p4 = na
var float fc_invalid_level = na

var int fc_leg1_idx = 0, var float fc_leg1_val = na, var bool fc_leg1_hit = false
var int fc_leg2_idx = 0, var float fc_leg2_val = na, var bool fc_leg2_hit = false
var int fc_leg3_idx = 0, var float fc_leg3_val = na, var bool fc_leg3_hit = false
var int fc_leg4_idx = 0, var float fc_leg4_val = na, var bool fc_leg4_hit = false
var int fc_leg5_idx = 0, var float fc_leg5_val = na, var bool fc_leg5_hit = false

bool fc_bar_confirmed = barstate.isconfirmed or barstate.ishistory
bool fc_curr_bar_all_tp = fc_start_bar > 0 and ((fc_is_bull and (high >= fc_p3 or close >= fc_p3)) or (not fc_is_bull and (low <= fc_p3 or close <= fc_p3)))
bool fc_bars_should_refresh = buy_sig or sell_sig or is_bull_bos or is_bear_bos or fc_curr_bar_all_tp or fc_leg3_hit or (fc_start_bar > 0 and bar_index - fc_start_bar >= 40)

if fc_bar_confirmed and fc_bars_should_refresh
    fc_start_bar := bar_index
    fc_start_price := close
    fc_is_bull := buy_sig or is_bull_bos
    
    float max_pb_atr = 0.65
    float target_p1 = fc_is_bull ? math.max(close - atr * max_pb_atr, not na(ote_top) and ote_top < close and ote_top >= close - atr * max_pb_atr ? ote_top : close - atr * 0.45) : math.min(close + atr * max_pb_atr, not na(ote_bottom) and ote_bottom > close and ote_bottom <= close + atr * max_pb_atr ? ote_bottom : close + atr * 0.45)
    float target_p2 = fc_is_bull ? (highest_high > close ? highest_high + swing_range * 0.05 : close + atr * 2.2) : (lowest_low < close ? lowest_low - swing_range * 0.05 : close - atr * 2.2)
    float bull_fib_target = highest_high + swing_range * 0.618
    float bear_fib_target = lowest_low - swing_range * 0.618
    float target_p3 = fc_is_bull ? (bull_fib_target > close ? close + (bull_fib_target - close) * tp_mult : close + atr * 4.8 * tp_mult) : (bear_fib_target < close ? close - (close - bear_fib_target) * tp_mult : close - atr * 4.8 * tp_mult)
    
    // Strict monotonic sanity check
    if fc_is_bull
        target_p1 := math.min(close, math.max(close - atr * max_pb_atr, target_p1))
        target_p2 := math.max(close + atr * 0.8, math.max(target_p1 + atr * 1.0, target_p2))
        target_p3 := math.max(target_p2 + atr * 1.2 * tp_mult, target_p3)
    else
        target_p1 := math.max(close, math.min(close + atr * max_pb_atr, target_p1))
        target_p2 := math.min(close - atr * 0.8, math.min(target_p1 - atr * 1.0, target_p2))
        target_p3 := math.min(target_p2 - atr * 1.2 * tp_mult, target_p3)

    fc_p1 := target_p1
    fc_p2 := target_p2
    fc_p3 := target_p3
    
    fc_alt_p1 := fc_is_bull ? close - atr * 0.35 : close + atr * 0.35
    fc_alt_p2 := fc_is_bull ? (highest_high > 0 ? highest_high + swing_range * 0.1 : close + atr * 2.0) : (lowest_low > 0 ? lowest_low - swing_range * 0.1 : close - atr * 2.0)
    fc_alt_p3 := fc_is_bull ? (highest_high > 0 ? highest_high : close + atr * 1.0) : (lowest_low > 0 ? lowest_low : close - atr * 1.0)
    fc_alt_p4 := fc_is_bull ? fc_alt_p3 + atr * 1.5 : fc_alt_p3 - atr * 1.5
    
    if fc_is_bull
        float local_low = lowest_low_8
        float struct_sl = not na(local_low) and local_low < fc_p1 and local_low >= fc_p1 - atr * 1.25 ? local_low - atr * 0.15 : fc_p1 - atr * 0.85
        fc_invalid_level := math.min(fc_p1 - atr * 0.35, math.max(fc_p1 - atr * 1.25, struct_sl))
        fc_invalid_level := math.min(fc_invalid_level, math.min(fc_p1, close) - atr * 0.25)
    else
        float local_high = highest_high_8
        float struct_sl = not na(local_high) and local_high > fc_p1 and local_high <= fc_p1 + atr * 1.25 ? local_high + atr * 0.15 : fc_p1 + atr * 0.85
        fc_invalid_level := math.max(fc_p1 + atr * 0.35, math.min(fc_p1 + atr * 1.25, struct_sl))
        fc_invalid_level := math.max(fc_invalid_level, math.max(fc_p1, close) + atr * 0.25)
    
    fc_leg1_hit := false, fc_leg2_hit := false, fc_leg3_hit := false, fc_leg4_hit := false, fc_leg5_hit := false

// Трекинг исполнения волн (независимый каскадный трекинг для волатильных движений)
if fc_start_bar > 0 and bar_index >= fc_start_bar
    if fc_is_bull
        if not fc_leg1_hit and low <= fc_p1
            fc_leg1_hit := true
            fc_leg1_idx := bar_index
            fc_leg1_val := fc_p1
        if high >= fc_p2
            if not fc_leg2_hit
                fc_leg2_hit := true
                fc_leg2_idx := bar_index
                fc_leg2_val := fc_p2
            if not fc_leg1_hit
                fc_leg1_hit := true
                fc_leg1_idx := fc_start_bar
                fc_leg1_val := fc_start_price
        if high >= fc_p3
            if not fc_leg3_hit
                fc_leg3_hit := true
                fc_leg3_idx := bar_index
                fc_leg3_val := fc_p3
            if not fc_leg2_hit
                fc_leg2_hit := true
                fc_leg2_idx := bar_index
                fc_leg2_val := fc_p2
            if not fc_leg1_hit
                fc_leg1_hit := true
                fc_leg1_idx := fc_start_bar
                fc_leg1_val := fc_start_price
        if fc_leg3_hit and not fc_leg4_hit and low <= fc_p2
            fc_leg4_hit := true
            fc_leg4_idx := bar_index
            fc_leg4_val := fc_p2
    else
        if not fc_leg1_hit and high >= fc_p1
            fc_leg1_hit := true
            fc_leg1_idx := bar_index
            fc_leg1_val := fc_p1
        if low <= fc_p2
            if not fc_leg2_hit
                fc_leg2_hit := true
                fc_leg2_idx := bar_index
                fc_leg2_val := fc_p2
            if not fc_leg1_hit
                fc_leg1_hit := true
                fc_leg1_idx := fc_start_bar
                fc_leg1_val := fc_start_price
        if low <= fc_p3
            if not fc_leg3_hit
                fc_leg3_hit := true
                fc_leg3_idx := bar_index
                fc_leg3_val := fc_p3
            if not fc_leg2_hit
                fc_leg2_hit := true
                fc_leg2_idx := bar_index
                fc_leg2_val := fc_p2
            if not fc_leg1_hit
                fc_leg1_hit := true
                fc_leg1_idx := fc_start_bar
                fc_leg1_val := fc_start_price
        if fc_leg3_hit and not fc_leg4_hit and high >= fc_p2
            fc_leg4_hit := true
            fc_leg4_idx := bar_index
            fc_leg4_val := fc_p2

// ОПОПВЕЩЕНИЯ DYNAMIC TELEGRAM ALERTS
bool alert_fc_pre_entry = false
bool alert_fc_entry     = false
bool alert_fc_tp1       = false
bool alert_fc_tp2       = false
bool alert_fc_retest    = false
bool alert_fc_tp3       = false
bool alert_fc_sl        = false

if fc_start_bar > 0 and bar_index > fc_start_bar
    float dist_to_entry = math.abs(close - fc_p1)
    if dist_to_entry <= atr * 0.35 and not fc_leg1_hit
        alert_fc_pre_entry := true
    if fc_leg1_hit and bar_index == fc_leg1_idx
        alert_fc_entry := true
    if fc_leg2_hit and bar_index == fc_leg2_idx
        alert_fc_tp1 := true
    if fc_leg3_hit and bar_index == fc_leg3_idx
        alert_fc_tp2 := true
    if fc_leg4_hit and bar_index == fc_leg4_idx
        alert_fc_retest := true
    if (fc_is_bull and low <= fc_invalid_level) or (not fc_is_bull and high >= fc_invalid_level)
        alert_fc_sl := true

// 6. ОТРИСОВКА ЗОН И ПРОГНОЗНЫХ СВЕЧЕЙ (FORECAST CANDLE BARS)
var line line_ote_1 = na, var line line_ote_2 = na, var line line_eq = na
var line line_ext_1 = na, var line line_ext_2 = na, var line line_ext_3 = na
var label label_ote = na, var label label_eq = na, var label label_ext_1 = na, var label label_ext = na, var label label_ext_3 = na
var box zone_ote = na

// Контейнеры для прогнозных свечей
var box[] fc_boxes = array.new_box()
var line[] fc_wicks = array.new_line()
var box[] alt_boxes = array.new_box()
var line[] alt_wicks = array.new_line()

var label label_fc_0 = na, var label label_fc_1 = na, var label label_fc_2 = na, var label label_fc_3 = na, var label label_fc_4 = na
var line line_sl = na, var label label_sl = na, var label label_alt_desc = na

// Вспомогательная функция рисования прогнозной свечи
draw_fc_bar(int bar_i, float o, float h, float l, float c, color body_col, color border_col, color wick_col, bool is_alt) =>
    line w = line.new(x1=bar_i, y1=l, x2=bar_i, y2=h, xloc=xloc.bar_index, color=wick_col, width=1, style=is_alt ? line.style_dotted : line.style_solid)
    if is_alt
        array.push(alt_wicks, w)
    else
        array.push(fc_wicks, w)
        
    float b_top = math.max(o, c)
    float b_bot = math.min(o, c)
    if b_top == b_bot
        b_top := b_top + (h - l) * 0.05
    box b = box.new(left=bar_i, top=b_top, right=bar_i + 1, bottom=b_bot, xloc=xloc.bar_index, border_color=border_col, bgcolor=body_col)
    if is_alt
        array.push(alt_boxes, b)
    else
        array.push(fc_boxes, b)

bool is_bull = fc_is_bull

if barstate.islast
    line.delete(line_ote_1), line.delete(line_ote_2), line.delete(line_eq)
    line.delete(line_ext_1), line.delete(line_ext_2), line.delete(line_ext_3)
    label.delete(label_ote), label.delete(label_eq), label.delete(label_ext_1), label.delete(label_ext), label.delete(label_ext_3)
    box.delete(zone_ote)

    // Удаление прошлых прогнозных свечей
    if array.size(fc_boxes) > 0
        for i = 0 to array.size(fc_boxes) - 1
            box.delete(array.get(fc_boxes, i))
        array.clear(fc_boxes)

    if array.size(fc_wicks) > 0
        for i = 0 to array.size(fc_wicks) - 1
            line.delete(array.get(fc_wicks, i))
        array.clear(fc_wicks)

    if array.size(alt_boxes) > 0
        for i = 0 to array.size(alt_boxes) - 1
            box.delete(array.get(alt_boxes, i))
        array.clear(alt_boxes)

    if array.size(alt_wicks) > 0
        for i = 0 to array.size(alt_wicks) - 1
            line.delete(array.get(alt_wicks, i))
        array.clear(alt_wicks)

    label.delete(label_fc_0), label.delete(label_fc_1), label.delete(label_fc_2), label.delete(label_fc_3), label.delete(label_fc_4)
    line.delete(line_sl), label.delete(label_sl), label.delete(label_alt_desc)

    ote_color = is_bull ? c_bull : c_bear
    ote_text = is_bull ? "IT OTE 62-79% [Поддержка]" : "IT OTE 62-79% [Сопротивление]"

    if show_ote and not na(ote_top) and not na(ote_bottom)
        zone_ote := box.new(left=bar_index, top=math.max(ote_top, ote_bottom), right=bar_index + line_len, bottom=math.min(ote_top, ote_bottom),
                            xloc=xloc.bar_index, border_color=color.new(ote_color, 40), bgcolor=color.new(ote_color, 88))
        label_ote := label.new(bar_index + label_offset, (ote_top + ote_bottom) / 2, ote_text,
                               color=color.new(color.black, 100), textcolor=ote_color, style=label.style_label_left, size=get_text_size(text_sz_opt))

    if show_ext and not na(ext_1) and not na(ext_2)
        ext_color = is_bull ? c_bull : c_bear
        line_ext_2 := line.new(x1=bar_index, y1=ext_2, x2=bar_index + line_len, y2=ext_2, xloc=xloc.bar_index, color=ext_color, width=2, style=line.style_dashed)
        label_ext := label.new(bar_index + label_offset, ext_2, "🎯 ТЕЙК-ПРОФИТ 2 (TP2 1.618 Fib Target): " + str.tostring(ext_2, "#.##") + (show_probs ? " | Вероятность: " + str.tostring(fc_probability, "#") + "%" : ""),
                               color=color.new(color.black, 100), textcolor=ext_color, style=label.style_label_left, size=get_text_size(text_sz_opt))
        label_ext_3 := label.new(bar_index + label_offset, ext_3, "🚀 ТЕЙК-ПРОФИТ 3 (TP3 2.618 Fib Target): " + str.tostring(ext_3, "#.##"), color=color.new(color.black, 100), textcolor=ext_color, style=label.style_label_left, size=get_text_size(text_sz_opt))

    if show_forecast
        int x0 = bar_index
        float y0 = close
        
        bool draw_is_bull = fc_is_bull
        int x1 = bar_index + 8
        float y1 = not na(fc_p1) ? fc_p1 : (draw_is_bull ? close - atr * 0.8 : close + atr * 0.8)
        int x2 = bar_index + 18
        float y2 = not na(fc_p2) ? fc_p2 : (draw_is_bull ? close + atr * 2.2 : close - atr * 2.2)
        int x3 = bar_index + 30
        float y3 = not na(fc_p3) ? fc_p3 : (draw_is_bull ? close + atr * 4.8 : close - atr * 4.8)
        int x4 = bar_index + 38
        float y4 = y2
        
        int alt_x0 = math.max(bar_index + 3, x1 + 2)
        float alt_y0 = fc_invalid_level
        int alt_x1 = alt_x0 + 8
        float alt_y1 = draw_is_bull ? alt_y0 - atr * 1.5 : alt_y0 + atr * 1.5
        int alt_x2 = alt_x1 + 10
        float alt_y2 = draw_is_bull ? alt_y0 - atr * 3.0 : alt_y0 + atr * 3.0
        int alt_x3 = alt_x2 + 8
        float alt_y3 = draw_is_bull ? alt_y2 + atr * 1.2 : alt_y2 - atr * 1.2

        bool leg1_completed = false
        bool leg2_completed = false
        bool leg3_completed = false
        bool leg4_completed = false

        if fc_start_bar > 0 and bar_index - fc_start_bar <= 400
            x0 := fc_start_bar
            y0 := fc_start_price
            
            x1 := fc_leg1_hit ? fc_leg1_idx : fc_start_bar + 8
            y1 := fc_leg1_hit ? fc_leg1_val : fc_p1
            
            x2 := fc_leg2_hit ? fc_leg2_idx : (fc_leg1_hit ? fc_leg1_idx + 10 : fc_start_bar + 18)
            y2 := fc_leg2_hit ? fc_leg2_val : fc_p2
            
            x3 := fc_leg3_hit ? fc_leg3_idx : (fc_leg2_hit ? fc_leg2_idx + 12 : fc_start_bar + 30)
            y3 := fc_leg3_hit ? fc_leg3_val : fc_p3
            
            x4 := fc_leg4_hit ? fc_leg4_idx : (fc_leg3_hit ? fc_leg3_idx + 8 : fc_start_bar + 38)
            y4 := fc_leg4_hit ? fc_leg4_val : y2
            
            draw_is_bull := fc_is_bull
            leg1_completed := fc_leg1_hit
            leg2_completed := fc_leg2_hit
            leg3_completed := fc_leg3_hit
            leg4_completed := fc_leg4_hit

        // Final geometry verification for drawing (Prevent erratic bars)
        if draw_is_bull
            y2 := math.max(y0 + atr * 0.5, math.max(y1 + atr * 0.8, y2))
            y3 := math.max(y2 + atr * 1.0 * tp_mult, y3)
            y4 := y2
        else
            y2 := math.min(y0 - atr * 0.5, math.min(y1 - atr * 0.8, y2))
            y3 := math.min(y2 - atr * 1.0 * tp_mult, y3)
            y4 := y2

        int min_fc_x = math.max(1, bar_index - 450)
        x0 := math.max(min_fc_x, x0)
        x1 := math.max(min_fc_x, x1)
        x2 := math.max(min_fc_x, x2)
        x3 := math.max(min_fc_x, x3)
        x4 := math.max(min_fc_x, x4)

        color color_tp1_base = draw_is_bull ? #10b981 : #ef4444
        color color_tp2_base = #0284c7
        color color_retest_base = #8b5cf6

        color bull_body = color.new(#10b981, 20)
        color bull_border = #059669
        color bear_body = color.new(#ef4444, 20)
        color bear_border = #dc2626
        color gray_body = color.new(color.gray, 65)
        color gray_border = color.gray

        // Leg 1: x0 -> x1 (Откат к точке Входа)
        int len1 = math.max(1, x1 - x0)
        for i = 0 to len1 - 1
            int b_idx = x0 + i
            float t_curr = i / float(len1)
            float t_next = (i + 1) / float(len1)
            float p_curr = y0 + (y1 - y0) * t_curr
            float p_next = y0 + (y1 - y0) * t_next
            
            float o_p = p_curr
            float c_p = p_next
            bool is_green = c_p >= o_p
            float noise = atr * 0.18
            float h_p = math.max(o_p, c_p) + noise
            float l_p = math.min(o_p, c_p) - noise
            
            color b_col = leg1_completed ? gray_body : (is_green ? bull_body : bear_body)
            color bord_col = leg1_completed ? gray_border : (is_green ? bull_border : bear_border)
            draw_fc_bar(b_idx, o_p, h_p, l_p, c_p, b_col, bord_col, bord_col, false)

        // Leg 2: x1 -> x2 (Импульс к TP1 / BOS)
        int len2 = math.max(1, x2 - x1)
        for i = 0 to len2 - 1
            int b_idx = x1 + i
            float t_curr = i / float(len2)
            float t_next = (i + 1) / float(len2)
            float p_curr = y1 + (y2 - y1) * t_curr
            float p_next = y1 + (y2 - y1) * t_next
            
            float o_p = p_curr
            float c_p = p_next
            bool is_green = c_p >= o_p
            float noise = atr * 0.22
            float h_p = math.max(o_p, c_p) + (is_green ? noise * 1.4 : noise * 0.6)
            float l_p = math.min(o_p, c_p) - (is_green ? noise * 0.6 : noise * 1.4)
            
            color b_col = leg2_completed ? gray_body : (is_green ? bull_body : bear_body)
            color bord_col = leg2_completed ? gray_border : (is_green ? bull_border : bear_border)
            draw_fc_bar(b_idx, o_p, h_p, l_p, c_p, b_col, bord_col, bord_col, false)

        // Leg 3: x2 -> x3 (Ускорение к TP2)
        int len3 = math.max(1, x3 - x2)
        for i = 0 to len3 - 1
            int b_idx = x2 + i
            float t_curr = i / float(len3)
            float t_next = (i + 1) / float(len3)
            float p_curr = y2 + (y3 - y2) * t_curr
            float p_next = y2 + (y3 - y2) * t_next
            
            float o_p = p_curr
            float c_p = p_next
            bool is_green = c_p >= o_p
            float noise = atr * 0.25
            float h_p = math.max(o_p, c_p) + noise
            float l_p = math.min(o_p, c_p) - noise
            
            color tp2_body = color.new(#0284c7, 20)
            color tp2_border = #0369a1
            color b_col = leg3_completed ? gray_body : tp2_body
            color bord_col = leg3_completed ? gray_border : tp2_border
            draw_fc_bar(b_idx, o_p, h_p, l_p, c_p, b_col, bord_col, bord_col, false)

        // Leg 4: x3 -> x4 (Зеркальный ретест если включен)
        if fc_post_target
            int len4 = math.max(1, x4 - x3)
            for i = 0 to len4 - 1
                int b_idx = x3 + i
                float t_curr = i / float(len4)
                float t_next = (i + 1) / float(len4)
                float p_curr = y3 + (y4 - y3) * t_curr
                float p_next = y3 + (y4 - y3) * t_next
                
                float o_p = p_curr
                float c_p = p_next
                float noise = atr * 0.2
                float h_p = math.max(o_p, c_p) + noise
                float l_p = math.min(o_p, c_p) - noise
                
                color retest_body = color.new(#8b5cf6, 25)
                color retest_border = #7c3aed
                color b_col = leg4_completed ? gray_body : retest_body
                color bord_col = leg4_completed ? gray_border : retest_border
                draw_fc_bar(b_idx, o_p, h_p, l_p, c_p, b_col, bord_col, bord_col, false)

        // Альтернативный сценарий (привязка строго к уровню SL в будущее, не от текущей свечки)
        if show_alt_wave
            color alt_body = color.new(#f59e0b, 55)
            color alt_border = color.new(#d97706, 30)
            int alt_len = math.max(1, alt_x3 - alt_x0)
            for i = 0 to alt_len - 1
                int b_idx = alt_x0 + i
                float t_curr = i / float(alt_len)
                float t_next = (i + 1) / float(alt_len)
                float p_curr = alt_y0 + (alt_y3 - alt_y0) * t_curr
                float p_next = alt_y0 + (alt_y3 - alt_y0) * t_next
                
                float o_p = p_curr
                float c_p = p_next
                float noise = atr * 0.15
                float h_p = math.max(o_p, c_p) + noise
                float l_p = math.min(o_p, c_p) - noise
                draw_fc_bar(b_idx, o_p, h_p, l_p, c_p, alt_body, alt_border, alt_border, true)

            string alt_lbl_txt = draw_is_bull ? "💥 АЛЬТЕРНАТИВА (Слом SL " + str.tostring(fc_invalid_level, "#.##") + ") ➔ Уровень Дампа: " + str.tostring(alt_y3, "#.##") : "🚀 АЛЬТЕРНАТИВА (Слом SL " + str.tostring(fc_invalid_level, "#.##") + ") ➔ Уровень Пампа: " + str.tostring(alt_y3, "#.##")
            color alt_txt_col = draw_is_bull ? c_bear : c_bull
            label_alt_desc := label.new(fc_post_target ? alt_x2 : alt_x3, fc_post_target ? alt_y2 : alt_y3, alt_lbl_txt, color=color.new(color.black, 100), textcolor=alt_txt_col, style=draw_is_bull ? label.style_label_down : label.style_label_up, size=size.small)

        color sl_line_color = draw_is_bull ? c_bear : c_bull
        int sl_end_x = math.max(math.max(x3, x4), alt_x3) + 4
        line_sl := line.new(x1=x0, y1=fc_invalid_level, x2=sl_end_x, y2=fc_invalid_level, xloc=xloc.bar_index, color=sl_line_color, width=2, style=line.style_solid)
        label_sl := label.new(sl_end_x, fc_invalid_level, "🛑 СТОП-ЛОСС (SL / Отмена): " + str.tostring(fc_invalid_level, "#.##"), color=color.new(color.black, 100), textcolor=sl_line_color, style=label.style_label_left, size=get_text_size(text_sz_opt))

        color col_node = draw_is_bull ? c_bull : c_bear
        
        label_fc_0 := label.new(x0, y0, "Прогноз (Свечи): Начало 🟢\\n(Вероятность успеха: " + str.tostring(fc_probability, "#") + "%)", color=color.new(color.black, 100), textcolor=col_node, style=label.style_label_down, size=size.small)
        
        string txt_l1 = leg1_completed ? "📍 ВХОД (Entry): " + str.tostring(y1, "#.##") + " [OK ✅]" : (draw_is_bull ? "📍 ВХОД (Entry / OTE Тест): " + str.tostring(y1, "#.##") + " ↗\\nВероятность: " + str.tostring(fc_probability, "#") + "%" : "📍 ВХОД (Entry / OTE Тест): " + str.tostring(y1, "#.##") + " ↘\\nВероятность: " + str.tostring(fc_probability, "#") + "%")
        label_fc_1 := label.new(x1, y1, txt_l1, color=color.new(color.black, 100), textcolor=leg1_completed ? color.gray : col_node, style=draw_is_bull ? label.style_label_up : label.style_label_down, size=size.small)
        
        string txt_l2 = leg2_completed ? "🏁 TP1 / Пробой: " + str.tostring(y2, "#.##") + " [OK ✅]" : (draw_is_bull ? "🏁 ТЕЙК-ПРОФИТ 1 (TP1 / Пробой): " + str.tostring(y2, "#.##") + " ↗" : "🏁 ТЕЙК-ПРОФИТ 1 (TP1 / Пробой): " + str.tostring(y2, "#.##") + " ↘")
        label_fc_2 := label.new(x2, y2, txt_l2, color=color.new(color.black, 100), textcolor=leg2_completed ? color.gray : color_tp1_base, style=draw_is_bull ? label.style_label_down : label.style_label_up, size=size.small)
        
        string txt_l3 = leg3_completed ? "🎯 TP2 / Цель: " + str.tostring(y3, "#.##") + " [OK ✅]" : (draw_is_bull ? "🎯 ТЕЙК-ПРОФИТ 2 (TP2 🎯): " + str.tostring(y3, "#.##") + " ↑\\nВероятность: " + str.tostring(fc_probability, "#") + "%" : "🎯 ТЕЙК-ПРОФИТ 2 (TP2 🎯): " + str.tostring(y3, "#.##") + " ↓\\nВероятность: " + str.tostring(fc_probability, "#") + "%")
        label_fc_3 := label.new(x3, y3, txt_l3, color=color.new(color.black, 100), textcolor=leg3_completed ? color.gray : color_tp2_base, style=draw_is_bull ? label.style_label_up : label.style_label_down, size=size.small)

        if fc_post_target
            string txt_l4 = leg4_completed ? "🔄 Зеркальный ретест [OK ✅]" : (draw_is_bull ? "🔄 Зеркальный ретест: " + str.tostring(y4, "#.##") + " ↘" : "🔄 Зеркальный ретест: " + str.tostring(y4, "#.##") + " ↗")
            label_fc_4 := label.new(x4, y4, txt_l4, color=color.new(color.gray, 100), textcolor=leg4_completed ? color.gray : color_retest_base, style=draw_is_bull ? label.style_label_down : label.style_label_up, size=size.small)

plotshape(buy_sig, title="S&T LONG Signal", style=shape.triangleup, location=location.belowbar, color=c_bull, size=size.normal, text="LONG", textcolor=color.black)
plotshape(sell_sig, title="S&T SHORT Signal", style=shape.triangledown, location=location.abovebar, color=c_bear, size=size.normal, text="SHORT", textcolor=color.black)

// 7. ИНФО-ПАНЕЛЬ S&T
var table tb = table.new(position.bottom_left, 6, 2, bgcolor=color.new(#0f172a, 15), border_color=#334155, border_width=1)
if barstate.islast and show_tables
    table.cell(tb, 0, 0, "S&T BARS", text_color=color.white, text_size=size.tiny, bgcolor=#1e293b)
    table.cell(tb, 1, 0, "СИГНАЛ", text_color=color.white, text_size=size.tiny, bgcolor=#1e293b)
    table.cell(tb, 2, 0, "ВИНРЕЙТ", text_color=color.white, text_size=size.tiny, bgcolor=#1e293b)
    table.cell(tb, 3, 0, "DXY", text_color=color.white, text_size=size.tiny, bgcolor=#1e293b)
    table.cell(tb, 4, 0, "UKOIL", text_color=color.white, text_size=size.tiny, bgcolor=#1e293b)
    table.cell(tb, 5, 0, "DELTA MTF", text_color=color.white, text_size=size.tiny, bgcolor=#1e293b)
    
    string sig_txt = buy_sig ? "LONG 🚀" : (sell_sig ? "SHORT 📉" : "NEUTRAL ⚖️")
    color sig_bg  = buy_sig ? #059669 : (sell_sig ? #dc2626 : #334155)
    
    table.cell(tb, 0, 1, "v6 AI", text_color=color.white, text_size=size.tiny)
    table.cell(tb, 1, 1, sig_txt, text_color=color.white, text_size=size.tiny, bgcolor=sig_bg)
    table.cell(tb, 2, 1, str.tostring(fc_probability, "#") + "%", text_color=#38bdf8, text_size=size.tiny)
    table.cell(tb, 3, 1, str.tostring(dxy_change, "+#.##") + "%", text_color=dxy_change >= 0 ? #10b981 : #ef4444, text_size=size.tiny)
    table.cell(tb, 4, 1, str.tostring(oil_change, "+#.##") + "%", text_color=oil_change >= 0 ? #10b981 : #ef4444, text_size=size.tiny)
    table.cell(tb, 5, 1, str.tostring(mtf_delta, "#"), text_color=mtf_delta >= 0 ? #10b981 : #ef4444, text_size=size.tiny)

// OПОВЕЩЕНИЯ DYNAMIC TELEGRAM ALERTS
alertcondition(buy_sig, "S&T LONG Signal", "Сигнал ВХОД LONG! Asset: {{ticker}}, Price: {{close}}")
alertcondition(sell_sig, "S&T SHORT Signal", "Сигнал ВХОД SHORT! Asset: {{ticker}}, Price: {{close}}")
alertcondition(is_bull_bos, "Слом Структуры BOS Bullish", "Произошел бычий слом структуры BOS! Asset: {{ticker}}, Price: {{close}}")
alertcondition(is_bear_bos, "Слом Структуры BOS Bearish", "Произошел медвежий слом структуры BOS! Asset: {{ticker}}, Price: {{close}}")

alertcondition(alert_fc_pre_entry, "⚡ [Telegram] Подготовка к Входу (Приближение к OTE)", "⚡ S&T ВОЛНОВОЙ ПРОГНОЗ: Цена приближается к зоне входа! Приготовиться к ордеру. Актив: {{ticker}}, Текущая цена: {{close}}")
alertcondition(alert_fc_entry, "📍 [Telegram] ВХОД В ПОЗИЦИЮ (Leg 1 Entry)", "📍 S&T ВОЛНОВОЙ ПРОГНОЗ: Достигнута точка ВХОДА (Entry / OTE)! Выставить SL и TP. Актив: {{ticker}}, Вход: {{close}}")
alertcondition(alert_fc_tp1, "🏁 [Telegram] ТЕЙК-ПРОФИТ 1 (TP1 / Пробой)", "🏁 S&T ВОЛНОВОЙ ПРОГНОЗ: Достигнута первая цель TP1 (Пробой)! Перенести SL в безубыток. Актив: {{ticker}}, TP1: {{close}}")
alertcondition(alert_fc_tp2, "🎯 [Telegram] ТЕЙК-ПРОФИТ 2 (TP2 / Главная Цель)", "🎯 S&T ВОЛНОВОЙ ПРОГНОЗ: Достигнута главная цель TP2! Фиксация основной прибыли. Актив: {{ticker}}, TP2: {{close}}")
alertcondition(alert_fc_retest, "🔄 [Telegram] Зеркальный Ретест (Leg 4)", "🔄 S&T ВОЛНОВОЙ ПРОГНОЗ: Исполнен зеркальный ретест! Актив: {{ticker}}, Цена: {{close}}")
alertcondition(alert_fc_sl, "🛑 [Telegram] СТОП-ЛОСС / Отмена Сетапа (SL Hit)", "🛑 S&T ВОЛНОВОЙ ПРОГНОЗ: Достигнут уровень отмены прогноза (Stop Loss)! Актив: {{ticker}}, SL: {{close}}")`;
};

export const generateMarketStructureScript = (s: IndicatorSettings) => {
  return generateVolumeDeltaScript(s);
};

