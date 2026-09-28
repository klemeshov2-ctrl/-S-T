import { IndicatorSettings } from "../types";

export const generateWaveInvalidationAdaptiveScript = (s: IndicatorSettings) => {
  const isMobileOptimized = s.mobileOptimized;
  return `//@version=6
indicator("S&T Wave Invalidation & Adaptive Risk Engine [v6]", "S&T Inval", overlay=true, max_lines_count=500, max_boxes_count=500, max_labels_count=500, max_bars_back=500)

// ==============================================================================
// 🚀 1. БЫСТРЫЙ ВЫБОР АКТИВА (ASSET PRESET) & РЫНОЧНЫЙ РЕЖИМ
// ==============================================================================
gp_preset = "🚀 БЫСТРЫЙ ВЫБОР АКТИВА (ПРЕСЕТ)"
asset_preset = input.string("🥇 Золото (XAUUSD)", "Режим актива (Quick Preset)", options=["🥇 Золото (XAUUSD)", "⚡ Биткоин (BTC / Crypto)", "🇷🇺 Российские акции (MOEX)", "⚙️ Пользовательский (Custom)"], group=gp_preset, tooltip="Автоматически настраивает чувствительность, длину свингов, период Хёрста и множитель стоп-лосса под специфику рынка")

// ==============================================================================
// 🧠 2. ПАРАМЕТРЫ АДАПТИВНОГО ДВИГАТЕЛЯ & ЭКСПОНЕНТА ХЁРСТА (H)
// ==============================================================================
gp_engine = "🧠 Адаптивный двигатель & Экспонента Хёрста (H)"
auto_adapt_h = input.bool(true, "Динамическая адаптация чувствительности по H", group=gp_engine)
custom_hurst_len = input.int(100, "Базовый период расчета Хёрста", minval=20, maxval=300, group=gp_engine)
custom_swing_len = input.int(6, "Базовая длина поиска свингов (Swing Length)", minval=3, maxval=25, group=gp_engine)
custom_sl_mult = input.float(2.2, "Множитель ATR для Stop-Loss невалидации", minval=1.0, maxval=5.0, step=0.1, group=gp_engine)

// Автоматический маппинг параметров под выбранный класс активов
int base_hurst_len = asset_preset == "🥇 Золото (XAUUSD)" ? 50 : asset_preset == "⚡ Биткоин (BTC / Crypto)" ? 200 : asset_preset == "🇷🇺 Российские акции (MOEX)" ? 100 : custom_hurst_len
int base_swing_len = asset_preset == "🥇 Золото (XAUUSD)" ? 5 : asset_preset == "⚡ Биткоин (BTC / Crypto)" ? 9 : asset_preset == "🇷🇺 Российские акции (MOEX)" ? 7 : custom_swing_len
float base_sl_mult = asset_preset == "🥇 Золото (XAUUSD)" ? 1.8 : asset_preset == "⚡ Биткоин (BTC / Crypto)" ? 2.8 : asset_preset == "🇷🇺 Российские акции (MOEX)" ? 2.2 : custom_sl_mult
float base_tp_mult = asset_preset == "🥇 Золото (XAUUSD)" ? 1.25 : asset_preset == "⚡ Биткоин (BTC / Crypto)" ? 1.60 : asset_preset == "🇷🇺 Российские акции (MOEX)" ? 1.35 : 1.30

// ==============================================================================
// ⚖️ 3. СИСТЕМА УСЛОВНОЙ НЕВАЛИДАЦИИ & ПРАВИЛА ЭЛЛИОТТА
// ==============================================================================
gp_rules = "⚖️ Правила Валидации Эллиотта & Невалидация"
enable_golden_rules = input.bool(true, "Строгая проверка Золотых Правил (Golden Rules)", group=gp_rules, tooltip="Правило 1: Волна 2 <= 100% волны 1. Правило 2: Волна 3 не самая короткая. Правило 3: Волна 4 не перекрывает волну 1")
enable_alternation = input.bool(true, "Учет Правила Альтернативы (Rule of Alternation)", group=gp_rules)
show_alt_count = input.bool(true, "Показывать Альтернативный прогноз (План Б)", group=gp_rules)
show_invalidation_lbl = input.bool(true, "Отображать метки отмены [Прогноз НЕВАЛИДЕН]", group=gp_rules)

// ==============================================================================
// 📊 4. СТАТИСТИЧЕСКИЕ ПРОЕКЦИИ И ЦЕЛЕВЫЕ ЗОНЫ (Q1, MEDIAN, P90)
// ==============================================================================
gp_proj = "📊 Статистические Проекции Целей (TP Zones)"
show_tp_zones = input.bool(true, "Отрисовывать целевые зоны (TP1, TP2, TP3)", group=gp_proj)
show_wave_trajectory = input.bool(true, "Отрисовывать волновую траекторию прогноза", group=gp_proj)
show_price_labels = input.bool(true, "Отображать ценовые метки (Тейки, Стоп-лосс)", group=gp_proj)
tp_zone_transp = input.int(75, "Прозрачность целевых боксов TP", minval=10, maxval=95, group=gp_proj)

// ==============================================================================
// 🏛️ 5. SMART MONEY CONFLICT & CONFLUENCE (SMC & VOLUME)
// ==============================================================================
gp_smc = "🏛️ Активные Зоны SMC (OB, FVG, OTE)"
show_order_blocks = input.bool(true, "Определять активные Order Blocks", group=gp_smc)
show_fvg_zones = input.bool(true, "Определять незаполненные Fair Value Gaps (FVG)", group=gp_smc)
show_ote_zone = input.bool(true, "Определять зону оптимального входа (OTE 61.8%-78.6%)", group=gp_smc)
use_vol_filter = input.bool(true, "Фильтр подтверждения объема на импульсах", group=gp_smc)
use_momentum_filter = input.bool(true, "Фильтр сонаправленности моментума (RSI)", group=gp_smc)

// ==============================================================================
// 📱 6. ИНТЕРФЕЙС И HUD-ПАНЕЛЬ
// ==============================================================================
gp_ui = "📱 Настройки Графического Интерфейса & HUD"
show_hud_table = input.bool(true, "Показывать аналитическую панель (HUD Table)", group=gp_ui)
hud_position = input.string("${isMobileOptimized ? "Нижний левый" : "Верхний правый"}", "Позиция HUD-панели", options=["Верхний левый", "Верхний правый", "Нижний левый", "Нижний правый"], group=gp_ui)
hud_text_size = input.string("${isMobileOptimized ? "Микро" : "Маленький"}", "Размер шрифта HUD", options=["Микро", "Маленький", "Обычный"], group=gp_ui)

// Цветовые константы (Каждый тейк имеет свой контрастный цвет)
c_tp1_cyan = color.new(#06b6d4, 0)      // Тейк 1 - Неоновый Циан (Q1)
c_tp2_emerald = color.new(#10b981, 0)   // Тейк 2 - Изумрудный Зеленый (Median)
c_tp3_purple = color.new(#a855f7, 0)    // Тейк 3 - Фиолетовый / Пурпурный (P90)
c_sl_red = color.new(#ef4444, 0)        // Стоп-лосс Невалидации - Ярко-красный
c_alt_path = color.new(#f59e0b, 0)      // Альтернативный прогноз (План Б) - Янтарный
c_invalid_gray = color.new(#64748b, 0)  // Невалидный прогноз - Серый (Slate)

// Глобальные расчеты индикаторов для предотвращения CW10002
vol_sma20 = ta.sma(volume, 20)
rsi_val = ta.rsi(close, 14)
atr_val = ta.atr(14)
highest_high_5 = ta.highest(high, 5)[1]
lowest_low_5 = ta.lowest(low, 5)[1]

// ==============================================================================
// 🧮 7. ВЫЧИСЛЕНИЕ ЭКСПОНЕНТЫ ХЁРСТА (HURST EXPONENT H) В РЕАЛЬНОМ ВРЕМЕНИ
// ==============================================================================
calc_hurst_exponent(int len) =>
    int safe_len = math.max(20, math.min(len, 200))
    float sum_ret = 0.0
    for k = 0 to safe_len - 1
        sum_ret += math.log(close[k] / math.max(close[k + 1], 0.000001))
    float mean_ret = sum_ret / safe_len
    
    float sum_sq_diff = 0.0
    for k = 0 to safe_len - 1
        float diff = math.log(close[k] / math.max(close[k + 1], 0.000001)) - mean_ret
        sum_sq_diff += diff * diff
    float s_std = math.sqrt(sum_sq_diff / safe_len)
    
    float max_dev = -999999.0
    float min_dev = 999999.0
    for i = 0 to safe_len - 1
        float dev = 0.0
        for j = 0 to i
            dev += (math.log(close[j] / math.max(close[j + 1], 0.000001)) - mean_ret)
        max_dev := math.max(max_dev, dev)
        min_dev := math.min(min_dev, dev)
    
    float r_range = max_dev - min_dev
    float rs = s_std > 0.000001 ? (r_range / s_std) : 1.0
    float h_val = rs > 0 and safe_len > 1 ? math.log(rs) / math.log(safe_len) : 0.5
    math.max(0.1, math.min(0.95, h_val))

float hurst_h = calc_hurst_exponent(base_hurst_len)

// Режим рынка на основе H
string market_regime_str = hurst_h > 0.55 ? "ТРЕНДОВЫЙ (Persistent)" : hurst_h < 0.45 ? "ДИАПАЗОННЫЙ (Anti-Persistent)" : "ХАОТИЧНЫЙ (Random Walk)"
color regime_color = hurst_h > 0.55 ? color.teal : hurst_h < 0.45 ? color.orange : color.yellow

// Динамическая адаптация длины свингов от H
int active_swing_len = base_swing_len
if auto_adapt_h
    if hurst_h > 0.55
        active_swing_len := math.max(3, base_swing_len - 1)
    else if hurst_h < 0.45
        active_swing_len := base_swing_len + 2

// ==============================================================================
// 📐 8. МОДУЛЬ ПОИСКА ЭКСТРЕМУМОВ И СТРУКТУРНЫХ ТОЧЕК (PIVOTS)
// ==============================================================================
float ph = ta.pivothigh(high, active_swing_len, active_swing_len)
float pl = ta.pivotlow(low, active_swing_len, active_swing_len)

var int ph_idx0 = 0
var float ph_val0 = 0.0
var int ph_idx1 = 0
var float ph_val1 = 0.0
var int ph_idx2 = 0
var float ph_val2 = 0.0

var int pl_idx0 = 0
var float pl_val0 = 0.0
var int pl_idx1 = 0
var float pl_val1 = 0.0
var int pl_idx2 = 0
var float pl_val2 = 0.0

if not na(ph)
    ph_idx2 := ph_idx1
    ph_val2 := ph_val1
    ph_idx1 := ph_idx0
    ph_val1 := ph_val0
    ph_idx0 := bar_index - active_swing_len
    ph_val0 := ph

if not na(pl)
    pl_idx2 := pl_idx1
    pl_val2 := pl_val1
    pl_idx1 := pl_idx0
    pl_val1 := pl_val0
    pl_idx0 := bar_index - active_swing_len
    pl_val0 := pl

// ==============================================================================
// 🏛️ 9. МОДУЛЬ АКТИВНЫХ ЗОН SMC (ORDER BLOCKS, FVG, OTE)
// Отображаются ТОЛЬКО те зоны, которые еще не были полностью пробиты/поглощены ценой
// ==============================================================================
var box active_bull_ob = na
var box active_bear_ob = na
var box active_bull_fvg = na
var box active_bear_fvg = na
var box active_ote_box = na

// Детекция активного FVG
bool is_bull_fvg = low > high[2] and close[1] > high[2]
bool is_bear_fvg = high < low[2] and close[1] < low[2]

if show_fvg_zones and is_bull_fvg
    box.delete(active_bull_fvg)
    active_bull_fvg := box.new(bar_index - 2, low, bar_index + 16, high[2], 
        border_color=color.new(#06b6d4, 50), bgcolor=color.new(#06b6d4, 90),
        text="FVG Bull (Дисбаланс)", text_size=size.tiny, text_color=color.new(#06b6d4, 0))

if show_fvg_zones and is_bear_fvg
    box.delete(active_bear_fvg)
    active_bear_fvg := box.new(bar_index - 2, low[2], bar_index + 16, high, 
        border_color=color.new(#f97316, 50), bgcolor=color.new(#f97316, 90),
        text="FVG Bear (Дисбаланс)", text_size=size.tiny, text_color=color.new(#f97316, 0))

// Детекция активного Order Block
bool is_bull_ob_trigger = close > highest_high_5 and volume > vol_sma20 * 1.15
bool is_bear_ob_trigger = close < lowest_low_5 and volume > vol_sma20 * 1.15

if show_order_blocks and is_bull_ob_trigger
    box.delete(active_bull_ob)
    active_bull_ob := box.new(bar_index - 4, math.max(open[1], close[1]), bar_index + 20, math.min(open[1], low[1]), 
        border_color=color.new(#10b981, 40), bgcolor=color.new(#10b981, 88),
        text="OB Bull (Блок Заказов)", text_size=size.tiny, text_color=color.new(#10b981, 0))

if show_order_blocks and is_bear_ob_trigger
    box.delete(active_bear_ob)
    active_bear_ob := box.new(bar_index - 4, math.max(open[1], high[1]), bar_index + 20, math.min(open[1], close[1]), 
        border_color=color.new(#ef4444, 40), bgcolor=color.new(#ef4444, 88),
        text="OB Bear (Блок Заказов)", text_size=size.tiny, text_color=color.new(#ef4444, 0))

// Автоматическое удаление отработанных / пробитых зон SMC для чистоты графика
if not na(active_bull_fvg) and close < box.get_bottom(active_bull_fvg)
    box.delete(active_bull_fvg)
if not na(active_bear_fvg) and close > box.get_top(active_bear_fvg)
    box.delete(active_bear_fvg)
if not na(active_bull_ob) and close < box.get_bottom(active_bull_ob)
    box.delete(active_bull_ob)
if not na(active_bear_ob) and close > box.get_top(active_bear_ob)
    box.delete(active_bear_ob)

// ==============================================================================
// 🎯 10. МОДУЛЬ ВАЛИДАЦИИ СТРУКТУРЫ & ЗОЛОТЫХ ПРАВИЛ ЭЛЛИОТТА
// ==============================================================================
bool is_bullish_structure = pl_val0 > pl_val1 and ph_val0 > ph_val1
bool is_bearish_structure = ph_val0 < ph_val1 and pl_val0 < pl_val1

float w0 = is_bullish_structure ? pl_val1 : ph_val1
float w1 = is_bullish_structure ? ph_val1 : pl_val1
float w2 = is_bullish_structure ? pl_val0 : ph_val0
float w3 = is_bullish_structure ? ph_val0 : pl_val0

float wave1_len = math.abs(w1 - w0)
float wave2_ret = math.abs(w2 - w1)
float wave3_len = math.abs(w3 - w2)

// Отрисовка зоны оптимального входа (OTE 61.8% - 78.6%) на текущем свинге
if show_ote_zone and wave3_len > 0
    box.delete(active_ote_box)
    float ote_top = is_bullish_structure ? (w3 - wave3_len * 0.618) : (w3 + wave3_len * 0.786)
    float ote_bot = is_bullish_structure ? (w3 - wave3_len * 0.786) : (w3 + wave3_len * 0.618)
    active_ote_box := box.new(bar_index, math.max(ote_top, ote_bot), bar_index + 16, math.min(ote_top, ote_bot),
        border_color=color.new(#8b5cf6, 50), bgcolor=color.new(#8b5cf6, 90),
        text="OTE Зона (61.8%-78.6%)", text_size=size.tiny, text_color=color.new(#8b5cf6, 0))

// Проверка Золотых Правил (Golden Rules)
string inval_reason = ""
bool is_struct_valid = true

if is_bullish_structure
    if enable_golden_rules and (w2 <= w0 or (wave1_len > 0 and wave2_ret >= wave1_len))
        is_struct_valid := false
        inval_reason := "Волна 2 глубже 100% Волны 1"
    else if enable_golden_rules and (wave1_len > 0 and wave3_len < wave1_len * 0.618)
        is_struct_valid := false
        inval_reason := "Волна 3 самая короткая"
    else if enable_golden_rules and (low <= w1)
        is_struct_valid := false
        inval_reason := "Волна 4 перекрывает Волну 1"

else if is_bearish_structure
    if enable_golden_rules and (w2 >= w0 or (wave1_len > 0 and wave2_ret >= wave1_len))
        is_struct_valid := false
        inval_reason := "Волна 2 глубже 100% Волны 1"
    else if enable_golden_rules and (wave1_len > 0 and wave3_len < wave1_len * 0.618)
        is_struct_valid := false
        inval_reason := "Волна 3 самая короткая"
    else if enable_golden_rules and (high >= w1)
        is_struct_valid := false
        inval_reason := "Волна 4 перекрывает Волну 1"
else
    is_struct_valid := false
    inval_reason := "Нет чистого импульса"

// ==============================================================================
// 🏆 11. КОНФЛЮЭНСНЫЙ БАЛЛ (0-100%) & КОНФИДЕНС-СКОР (A+, A, B, C)
// ==============================================================================
int confluence_score = 0

// 1. Соответствие правилам Эллиотта (+20)
if is_struct_valid
    confluence_score += 20

// 2. Соответствие историческому поведению / Фибо-пропорциям волны 3 (+15)
if wave1_len > 0 and wave3_len >= wave1_len * 1.382 and wave3_len <= wave1_len * 2.618
    confluence_score += 15
else if wave1_len > 0 and wave3_len >= wave1_len * 1.0
    confluence_score += 10

// 3. Подтверждение моментума (RSI alignment) (+15)
bool rsi_aligned = is_bullish_structure ? (rsi_val > 50 and rsi_val < 72) : (rsi_val < 50 and rsi_val > 28)
if rsi_aligned
    confluence_score += 15

// 4. Подтверждение объемом (+15)
bool vol_expansion = volume > vol_sma20
if vol_expansion
    confluence_score += 15

// 5. Подтверждение Smart Money Concepts (Order Block / Breaker / FVG) (+25)
bool smc_confirmed = (is_bullish_structure and not na(active_bull_ob)) or (is_bearish_structure and not na(active_bear_ob))
if smc_confirmed
    confluence_score += 25

// 6. Стандартная глубина отката волны 2/4 (50-61.8% OTE) (+10)
if wave1_len > 0 and wave2_ret >= wave1_len * 0.45 and wave2_ret <= wave1_len * 0.75
    confluence_score += 10

// Определение категории уверенности (Grade)
string confidence_grade = "C"
color grade_color = color.red
if confluence_score >= 70
    confidence_grade := "A+ (Очень высокая)"
    grade_color := color.green
else if confluence_score >= 55
    confidence_grade := "A (Высокая)"
    grade_color := color.teal
else if confluence_score >= 40
    confidence_grade := "B (Удовлетворительная)"
    grade_color := color.yellow
else
    confidence_grade := "C (Опасный / Низкая)"
    grade_color := color.red

// ==============================================================================
// 🎯 12. АДАПТИВНЫЕ СТАТИСТИЧЕСКИЕ ПРОЕКЦИИ (TP1, TP2, TP3 & INVALIDATION SL)
// ==============================================================================
float swing_depth = math.max(atr_val * 2.0, math.abs(w3 - w2))
float primary_inval_sl = is_bullish_structure ? (w1 - atr_val * base_sl_mult) : (w1 + atr_val * base_sl_mult)

if is_bullish_structure
    primary_inval_sl := math.min(close - atr_val * 1.0, primary_inval_sl)
else if is_bearish_structure
    primary_inval_sl := math.max(close + atr_val * 1.0, primary_inval_sl)

float target_tp1 = na
float target_tp2 = na
float target_tp3 = na

if is_bullish_structure
    target_tp1 := w3 + swing_depth * 0.25 * base_tp_mult
    target_tp2 := w3 + swing_depth * 0.618 * base_tp_mult
    target_tp3 := w3 + swing_depth * 1.000 * base_tp_mult
    target_tp1 := math.max(close + atr_val * 0.8, target_tp1)
    target_tp2 := math.max(target_tp1 + atr_val * 1.0, target_tp2)
    target_tp3 := math.max(target_tp2 + atr_val * 1.5, target_tp3)
else if is_bearish_structure
    target_tp1 := w3 - swing_depth * 0.25 * base_tp_mult
    target_tp2 := w3 - swing_depth * 0.618 * base_tp_mult
    target_tp3 := w3 - swing_depth * 1.000 * base_tp_mult
    target_tp1 := math.min(close - atr_val * 0.8, target_tp1)
    target_tp2 := math.min(target_tp1 - atr_val * 1.0, target_tp2)
    target_tp3 := math.min(target_tp2 - atr_val * 1.5, target_tp3)

float alt_target_p1 = is_bullish_structure ? (primary_inval_sl - atr_val * 1.2) : (primary_inval_sl + atr_val * 1.2)
float alt_target_p2 = is_bullish_structure ? (primary_inval_sl - atr_val * 2.5) : (primary_inval_sl + atr_val * 2.5)
float alt_inval_sl  = is_bullish_structure ? (w3 + atr_val * 1.5) : (w3 - atr_val * 1.5)

// Глобальный расчет триггеров достижения цели TP2 для стабильности алертов
bool cross_tp2_up = ta.crossover(high, target_tp2)
bool cross_tp2_down = ta.crossunder(low, target_tp2)
bool is_tp2_hit = cross_tp2_up or cross_tp2_down

// ==============================================================================
// 📉 13. ОТРИСОВКА ВОЛНОВЫХ ЛИНИЙ, НЕВАЛИДАЦИИ И МЕТОК
// Прогнозные линии фиксируются на той свече, где сформировался прогноз (anchor_bar),
// и переносятся ТОЛЬКО при появлении НОВОГО прогноза.
// Если прогноз становится невалидным (пробит SL или правило) — линии окрашиваются в СЕРЫЙ цвет.
// ==============================================================================
var line primary_line1 = na
var line primary_line2 = na
var line primary_line3 = na
var line alt_line1 = na
var line alt_line2 = na
var line alt_sl_line = na
var line sl_line = na
var box  tp_zone_box = na
var label inval_lbl = na

var label tp1_lbl = na
var label tp2_lbl = na
var label tp3_lbl = na
var label sl_lbl = na

var label alt_tp1_lbl = na
var label alt_tp2_lbl = na
var label alt_sl_lbl = na

// Переменные состояния текущего прогноза
var int  forecast_origin_bar = 0
var float forecast_entry_price = 0.0
var float saved_tp1 = 0.0
var float saved_tp2 = 0.0
var float saved_tp3 = 0.0
var float saved_sl  = 0.0
var float saved_alt1 = 0.0
var float saved_alt2 = 0.0
var float saved_alt_sl = 0.0
var float saved_high = 0.0
var bool  saved_is_bull = true
var bool  has_active_forecast = false

// Детекция появления нового прогноза (нового структурного свинга)
bool is_new_pivot = not na(ph) or not na(pl)
bool new_forecast_triggered = is_new_pivot and (is_bullish_structure or is_bearish_structure)

if new_forecast_triggered
    forecast_origin_bar := bar_index
    forecast_entry_price := close
    saved_tp1 := target_tp1
    saved_tp2 := target_tp2
    saved_tp3 := target_tp3
    saved_sl  := primary_inval_sl
    saved_alt1 := alt_target_p1
    saved_alt2 := alt_target_p2
    saved_alt_sl := alt_inval_sl
    saved_high := high
    saved_is_bull := is_bullish_structure
    has_active_forecast := true

// Проверка невалидации сохраненного прогноза
bool is_sl_breached = has_active_forecast and (saved_is_bull ? (low <= saved_sl) : (high >= saved_sl))
bool current_forecast_valid = is_struct_valid and not is_sl_breached
string current_inval_text = is_sl_breached ? "ПРОБОЙ УРОВНЯ НЕВАЛИДАЦИИ (SL)" : inval_reason

// Определение текущих отображаемых значений прогноза
int anchor_bar = forecast_origin_bar > 0 ? forecast_origin_bar : bar_index
float anchor_price = forecast_origin_bar > 0 ? forecast_entry_price : close
float disp_tp1 = forecast_origin_bar > 0 ? saved_tp1 : target_tp1
float disp_tp2 = forecast_origin_bar > 0 ? saved_tp2 : target_tp2
float disp_tp3 = forecast_origin_bar > 0 ? saved_tp3 : target_tp3
float disp_sl  = forecast_origin_bar > 0 ? saved_sl  : primary_inval_sl
float disp_alt1 = forecast_origin_bar > 0 ? saved_alt1 : alt_target_p1
float disp_alt2 = forecast_origin_bar > 0 ? saved_alt2 : alt_target_p2
float disp_alt_sl = forecast_origin_bar > 0 ? saved_alt_sl : alt_inval_sl
float disp_high = forecast_origin_bar > 0 ? saved_high : high

if barstate.islast
    line.delete(primary_line1)
    line.delete(primary_line2)
    line.delete(primary_line3)
    line.delete(alt_line1)
    line.delete(alt_line2)
    line.delete(alt_sl_line)
    line.delete(sl_line)
    box.delete(tp_zone_box)
    label.delete(inval_lbl)
    label.delete(tp1_lbl)
    label.delete(tp2_lbl)
    label.delete(tp3_lbl)
    label.delete(sl_lbl)
    label.delete(alt_tp1_lbl)
    label.delete(alt_tp2_lbl)
    label.delete(alt_sl_lbl)
    
    if show_wave_trajectory and (has_active_forecast or is_struct_valid)
        // Если прогноз валиден — разноцветные линии, если невалиден — серый цвет
        color col_tp1 = current_forecast_valid ? c_tp1_cyan : c_invalid_gray
        color col_tp2 = current_forecast_valid ? c_tp2_emerald : c_invalid_gray
        color col_tp3 = current_forecast_valid ? c_tp3_purple : c_invalid_gray
        color col_sl  = current_forecast_valid ? c_sl_red : c_invalid_gray
        
        int b_step1 = math.max(anchor_bar + 4, anchor_bar + (bar_index - anchor_bar) / 2 + 3)
        int b_step2 = math.max(anchor_bar + 8, bar_index + 6)
        int b_step3 = math.max(anchor_bar + 14, bar_index + 16)
        
        primary_line1 := line.new(anchor_bar, anchor_price, b_step1, disp_tp1, color=col_tp1, width=2, style=line.style_solid)
        primary_line2 := line.new(b_step1, disp_tp1, b_step2, disp_tp2, color=col_tp2, width=3, style=line.style_solid)
        primary_line3 := line.new(b_step2, disp_tp2, b_step3, disp_tp3, color=col_tp3, width=2, style=line.style_arrow_right)
        sl_line := line.new(anchor_bar, disp_sl, b_step3, disp_sl, color=col_sl, width=2, style=line.style_dashed)
        
        // Отображение ценовых меток Тейков и Стоп-лосса прямо на графике
        if show_price_labels
            string tp1_txt = (current_forecast_valid ? "🎯 Тейк 1 (Q1): " : "⚠️ Невалиден ТП1: ") + str.tostring(disp_tp1, "#.##")
            string tp2_txt = (current_forecast_valid ? "🎯 Тейк 2 (Median): " : "⚠️ Невалиден ТП2: ") + str.tostring(disp_tp2, "#.##")
            string tp3_txt = (current_forecast_valid ? "🎯 Тейк 3 (P90): " : "⚠️ Невалиден ТП3: ") + str.tostring(disp_tp3, "#.##")
            string sl_txt  = (current_forecast_valid ? "🛑 Стоп-лосс: " : "🛑 Пробит SL: ") + str.tostring(disp_sl, "#.##")
            
            tp1_lbl := label.new(b_step1, disp_tp1, tp1_txt, color=color.new(col_tp1, 20), textcolor=color.white, style=label.style_label_left, size=size.tiny)
            tp2_lbl := label.new(b_step2, disp_tp2, tp2_txt, color=color.new(col_tp2, 20), textcolor=color.white, style=label.style_label_left, size=size.tiny)
            tp3_lbl := label.new(b_step3, disp_tp3, tp3_txt, color=color.new(col_tp3, 20), textcolor=color.white, style=label.style_label_left, size=size.tiny)
            sl_lbl  := label.new(b_step3, disp_sl, sl_txt, color=color.new(col_sl, 20), textcolor=color.white, style=label.style_label_left, size=size.tiny)
        
        if show_tp_zones and current_forecast_valid
            tp_zone_box := box.new(b_step1, disp_tp3, b_step3 + 4, disp_tp1, border_color=color.new(c_tp2_emerald, 40), bgcolor=color.new(c_tp2_emerald, tp_zone_transp))
        
        if show_alt_count
            int b_alt0 = math.max(anchor_bar + 3, bar_index + 3)
            int b_alt1 = b_alt0 + 6
            int b_alt2 = b_alt1 + 8
            // Альтернативная волна (План Б) привязывается к уровню SL (disp_alt_sl), а не к свечке (anchor_price)
            alt_line1 := line.new(b_alt0, disp_alt_sl, b_alt1, disp_alt1, color=c_alt_path, width=1, style=line.style_dashed)
            alt_line2 := line.new(b_alt1, disp_alt1, b_alt2, disp_alt2, color=c_alt_path, width=1, style=line.style_arrow_right)
            alt_sl_line := line.new(b_alt0, disp_alt_sl, b_alt2, disp_alt_sl, color=c_alt_path, width=1, style=line.style_dotted)
            
            if show_price_labels
                string alt_tp1_txt = "⚡ Альт. Тейк 1: " + str.tostring(disp_alt1, "#.##")
                string alt_tp2_txt = "⚡ Альт. Тейк 2: " + str.tostring(disp_alt2, "#.##")
                string alt_sl_txt  = "🛑 Альт. Стоп: " + str.tostring(disp_alt_sl, "#.##")
                alt_tp1_lbl := label.new(b_alt1, disp_alt1, alt_tp1_txt, color=color.new(c_alt_path, 20), textcolor=color.white, style=label.style_label_left, size=size.tiny)
                alt_tp2_lbl := label.new(b_alt2, disp_alt2, alt_tp2_txt, color=color.new(c_alt_path, 20), textcolor=color.white, style=label.style_label_left, size=size.tiny)
                alt_sl_lbl  := label.new(b_alt2, disp_alt_sl, alt_sl_txt, color=color.new(c_alt_path, 20), textcolor=color.white, style=label.style_label_left, size=size.tiny)

    if not current_forecast_valid and show_invalidation_lbl
        inval_lbl := label.new(anchor_bar, disp_high + atr_val * 0.5, "❌ Прогноз НЕВАЛИДЕН\\nСвеча входа: #" + str.tostring(anchor_bar) + "\\nПричина: " + current_inval_text, color=color.new(color.maroon, 15), textcolor=color.white, style=label.style_label_down, size=size.small)

// ==============================================================================
// 📋 14. ИНФОРМАЦИОННЫЙ HUD ДАШБОРД В РЕАЛЬНОМ ВРЕМЕНИ
// ==============================================================================
get_hud_pos(pos_str) =>
    pos_str == "Верхний левый" ? position.top_left : pos_str == "Верхний правый" ? position.top_right : pos_str == "Нижний левый" ? position.bottom_left : position.bottom_right

get_hud_size(sz_str) =>
    sz_str == "Микро" ? size.tiny : sz_str == "Маленький" ? size.small : size.normal

var table hud = table.new(get_hud_pos(hud_position), 2, 8, bgcolor=color.new(#0b0f19, 10), border_color=color.new(#1e293b, 40), border_width=1)

if barstate.islast and show_hud_table
    var sz = get_hud_size(hud_text_size)
    table.cell(hud, 0, 0, "S&T INVALIDATION ENGINE", bgcolor=color.new(#1e293b, 20), text_color=color.white, text_size=sz)
    table.cell(hud, 1, 0, asset_preset, bgcolor=color.new(#1e293b, 20), text_color=color.yellow, text_size=sz)
    table.cell(hud, 0, 1, "Экспонента Хёрста (H)", text_color=color.gray, text_size=sz)
    table.cell(hud, 1, 1, str.tostring(hurst_h, "#.##") + " | " + market_regime_str, text_color=regime_color, text_size=sz)
    table.cell(hud, 0, 2, "Статус волнового прогноза", text_color=color.gray, text_size=sz)
    table.cell(hud, 1, 2, current_forecast_valid ? "✅ ВАЛИДЕН (Active)" : "❌ НЕВАЛИДЕН (" + current_inval_text + ")", text_color=current_forecast_valid ? color.green : color.red, text_size=sz)
    table.cell(hud, 0, 3, "Конфлюэнс & Уверенность", text_color=color.gray, text_size=sz)
    table.cell(hud, 1, 3, str.tostring(confluence_score) + "/100 (" + confidence_grade + ")", text_color=grade_color, text_size=sz)
    table.cell(hud, 0, 4, "Стоп-лосс невалидации (SL)", text_color=color.gray, text_size=sz)
    table.cell(hud, 1, 4, str.tostring(disp_sl, "#.##"), text_color=color.red, text_size=sz)
    table.cell(hud, 0, 5, "Тейк 1 (Q1) / Тейк 2 (Median)", text_color=color.gray, text_size=sz)
    table.cell(hud, 1, 5, str.tostring(disp_tp1, "#.##") + " / " + str.tostring(disp_tp2, "#.##"), text_color=color.teal, text_size=sz)
    table.cell(hud, 0, 6, "Тейк 3 (P90 Максимум)", text_color=color.gray, text_size=sz)
    table.cell(hud, 1, 6, str.tostring(disp_tp3, "#.##"), text_color=color.purple, text_size=sz)
    table.cell(hud, 0, 7, "Альт. Прогноз (План Б)", text_color=color.gray, text_size=sz)
    table.cell(hud, 1, 7, "TP1: " + str.tostring(disp_alt1, "#.##") + " | SL: " + str.tostring(disp_alt_sl, "#.##"), text_color=color.orange, text_size=sz)

// ==============================================================================
// 🔔 15. СИСТЕМА ОПОВЕЩЕНИЙ (ALERTS)
// ==============================================================================
alertcondition(is_sl_breached, "Пробой уровня невалидации (SL)", "Внимание! Прогноз НЕВАЛИДЕН: Пробит уровень стоп-лосса невалидации!")
alertcondition(confluence_score >= 70 and is_struct_valid, "Сигнал Высокой Уверенности (Grade A+)", "Сформирован новый волновой сетап A+ с высокой вероятностью!")
alertcondition(is_tp2_hit, "Достижение медианной цели TP2", "Цена достигла медианного уровня тейк-профита TP2!")
`;
};

