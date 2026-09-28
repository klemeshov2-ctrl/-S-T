import { IndicatorSettings } from "../types";

export const generateNeuraLibAdaptiveScript = (s: IndicatorSettings) => {
  const isMobileOptimized = s.mobileOptimized;
  return `//@version=6
indicator("S&T Neural AI: Deep Ensemble & Adaptive Trajectory Engine [NeuraLib Deep ML v6]", "ST NEURAL", overlay=true, max_boxes_count=500, max_lines_count=500, max_labels_count=500)

// ==============================================================================
// 🧠 S&T NEURAL AI DEEP ENSEMBLE (PINE SCRIPT v6)
// ==============================================================================
// 1. Архитектура: Ансамбль из 3 независимых 2-слойных нейросетей (10 -> 8 -> 1).
//    - Скрытый слой: 8 нейронов с функцией активации ReLU.
//    - Выходной слой: 1 нейрон с функцией активации Tanh.
//    - Онлайн-обучение: SGD с моментумом + L2-регуляризация (weight decay λ = 0.001).
//    - Мультигоризонтная оптимизация ошибки: усреднение таргетов на 3, 5 и 8 баров.
// 2. Вектор из 10 признаков (Features):
//    - F1: RSI(14) | F2: Объемная дельта | F3: WaveTrend | F4: Дистанция до EMA(50) | F5: HTF MTF Консенсус
//    - F6: ROC(5) | F7: ROC(10) | F8: Отношение волатильности ATR(14)/ATR(50)
//    - F9: Дистанция до Pivot Support/Resistance | F10: Сила тренда ADX(14) (нативный ta.dmi)
// 3. Адаптивная динамика: Волатильно-зависимые TP1/TP2 и расчетные горизонты баров.
// 4. Быстрый динамический порог срабатывания O(1) (μ + 1.5σ ≈ 85-й перцентиль).
// 5. Трейлинг-стоп (1.5 ATR) после взятия TP1 и перевода в БУ.
// 6. Оптимизация: Кольцевые буферы фиксированной длины (Ring Buffers).
// 7. Визуализация: Полоса уверенности ансамбля, метки старта, пунктиры исполнения, HUD.
// ==============================================================================

// ==============================================================================
// ⚙️ ГРУППА 1: НАСТРОЙКИ НЕЙРОСЕТИ И АНСАМБЛЯ
// ==============================================================================
gp_ml          = "🧠 Настройки Нейросети и Ансамбля"
use_ensemble   = input.bool(true, "Использовать ансамбль из 3 моделей (Deep Ensemble)", group=gp_ml)
learning_rate  = input.float(0.035, "Скорость обучения SGD (Learning Rate η)", minval=0.001, maxval=0.2, step=0.005, group=gp_ml)
momentum_term  = input.float(0.80, "Инерция градиента (Momentum γ)", minval=0.0, maxval=0.95, step=0.05, group=gp_ml)
l2_reg_lambda  = input.float(0.001, "L2-регуляризация (Weight Decay λ)", minval=0.0, maxval=0.05, step=0.001, group=gp_ml)
htf_custom     = input.timeframe("", "Старший таймфрейм HTF (Пусто = Авто)", group=gp_ml)
train_window   = input.int(150, "Окно оценки точности (Evaluation Window)", minval=30, maxval=300, group=gp_ml)

// ==============================================================================
// 📊 ГРУППА 2: СИГНАЛЫ И ДИНАМИЧЕСКИЙ ПОРОГ
// ==============================================================================
gp_thresh      = "📊 Сигналы и Пороги Активации"
use_dyn_thresh = input.bool(true, "Быстрый динамический порог (μ + 1.5σ ≈ 85%)", group=gp_thresh)
thresh_sens    = input.float(1.0, "Чувствительность динамического порога", minval=0.5, maxval=2.0, step=0.1, group=gp_thresh)
static_thresh  = input.float(0.25, "Фиксированный порог (если дин. выключен)", minval=0.1, maxval=0.8, step=0.05, group=gp_thresh)

// ==============================================================================
// 🎯 ГРУППА 3: ТОРГОВЫЙ СЕТАП И АДАПТИВНЫЙ РИСК-МЕНЕДЖМЕНТ
// ==============================================================================
gp_risk        = "🎯 Торговый Сетап и Адаптивный Риск"
use_adapt_risk = input.bool(true, "Адаптивные множители TP и горизонтов к волатильности", group=gp_risk)
entry_pull_atr = input.float(0.35, "Глубина отката к точке входа (ATR)", minval=0.0, maxval=1.5, step=0.05, group=gp_risk)
base_sl_mult   = input.float(1.5, "Базовый Стоп-Лосс (SL ATR)", minval=0.5, maxval=4.0, step=0.1, group=gp_risk)
base_tp1_mult  = input.float(2.0, "Базовый Тейк 1 (TP1 ATR, 50%)", minval=1.0, maxval=6.0, step=0.1, group=gp_risk)
base_tp2_mult  = input.float(3.8, "Базовый Тейк 2 (TP2 ATR, 100%)", minval=1.5, maxval=10.0, step=0.1, group=gp_risk)
use_trailing   = input.bool(true, "Активировать Трейлинг-Стоп (1.5 ATR) после TP1", group=gp_risk)
trailing_atr   = input.float(1.5, "Отступ Трейлинг-Стопа (ATR)", minval=0.5, maxval=3.0, step=0.1, group=gp_risk)
auto_rebuild   = input.bool(true, "Авто-перестройка при сломе SL или завершении цели TP2", group=gp_risk)

// ==============================================================================
// ⏱️ ГРУППА 4: ГОРИЗОНТЫ ПРОГНОЗА В БАРАХ
// ==============================================================================
gp_schedule    = "⏱️ Базовые Горизонты Прогноза (в Барах)"
base_bars_entry= input.int(3, "Ожидаемый откат к точке входа (баров)", minval=1, maxval=15, group=gp_schedule)
base_bars_tp1  = input.int(7, "Ожидаемый горизонт TP1 (баров)", minval=2, maxval=40, group=gp_schedule)
base_bars_tp2  = input.int(16, "Ожидаемый горизонт TP2 (баров)", minval=4, maxval=80, group=gp_schedule)
show_alt_wave  = input.bool(true, "Показывать Альтернативную волну (План Б)", group=gp_schedule)

// ==============================================================================
// 📱 ГРУППА 5: ОТОБРАЖЕНИЕ И ИНТЕРФЕЙС
// ==============================================================================
gp_ui          = "📱 Отображение и Интерфейс"
show_forecast  = input.bool(true, "Рисовать Волновые Траектории и Прогноз", group=gp_ui)
show_ribbon    = input.bool(true, "Показывать полосу уверенности ансамбля (Ribbon)", group=gp_ui)
show_target_lvl= input.bool(true, "Показывать Горизонтальные Уровни Entry / SL / TP1 / TP2", group=gp_ui)
show_dashboard = input.bool(true, "Показывать Компактную Инфо-панель HUD", group=gp_ui)
table_pos      = input.string("${isMobileOptimized ? "Нижний левый" : "Нижний правый"}", "Позиция инфо-панели", options=["Верхний левый", "Верхний правый", "Нижний левый", "Нижний правый"], group=gp_ui)
color_bars     = input.bool(true, "Окрашивать свечи по прогнозу ИИ", group=gp_ui)

// ==============================================================================
// 🎨 ЦВЕТОВАЯ ПАЛИТРА
// ==============================================================================
c_bull         = color.rgb(34, 197, 94)
c_bear         = color.rgb(239, 68, 68)
c_cyan         = color.rgb(56, 189, 248)
c_gold         = color.rgb(234, 179, 8)
c_purple       = color.rgb(168, 85, 247)
c_neutral      = color.rgb(148, 163, 184)
c_bg_dark      = color.rgb(15, 23, 42)

f_nz(float val, float fallback) => na(val) ? fallback : val

f_feature_name(int idx) =>
    idx == 0 ? "RSI" : idx == 1 ? "Delta" : idx == 2 ? "WaveTrend" : idx == 3 ? "EMA50" : idx == 4 ? "HTF" : idx == 5 ? "ROC5" : idx == 6 ? "ROC10" : idx == 7 ? "VolRatio" : idx == 8 ? "Pivot" : "ADX"

// ==============================================================================
// 🧮 1. МУЛЬТИ-ТАЙМФРЕЙМ (HTF) АНАЛИЗ
// ==============================================================================
f_auto_htf() =>
    if timeframe.isdaily or timeframe.isweekly
        "W"
    else if timeframe.isintraday and (timeframe.multiplier >= 60 or timeframe.period == "60" or timeframe.period == "240")
        "D"
    else if timeframe.isintraday and timeframe.multiplier >= 15
        "240"
    else
        "60"

selected_htf = htf_custom == "" ? f_auto_htf() : htf_custom

htf_close   = request.security(syminfo.tickerid, selected_htf, close, gaps=barmerge.gaps_off, lookahead=barmerge.lookahead_off)
htf_ema50   = request.security(syminfo.tickerid, selected_htf, ta.ema(close, 50), gaps=barmerge.gaps_off, lookahead=barmerge.lookahead_off)
htf_rsi_raw = request.security(syminfo.tickerid, selected_htf, ta.rsi(close, 14), gaps=barmerge.gaps_off, lookahead=barmerge.lookahead_off)
htf_rsi     = f_nz(htf_rsi_raw, 50.0)

float f_htf_trend = (htf_close > htf_ema50 ? 0.5 : -0.5) + ((htf_rsi - 50.0) / 100.0)
f_htf_trend := math.max(-1.0, math.min(1.0, f_htf_trend))

// ==============================================================================
// 🔬 2. ИЗВЛЕЧЕНИЕ 10 ПРИЗНАКОВ (FEATURES 1..10)
// ==============================================================================
atr14_raw = ta.atr(14)
atr50_raw = ta.atr(50)
atr14 = f_nz(atr14_raw, high - low > 0 ? (high - low) : close * 0.005)
atr50 = f_nz(atr50_raw, atr14)
vol_ratio = atr50 > 0 ? (atr14 / atr50) : 1.0

// F1: RSI(14) [-1.0, 1.0]
rsi_val = f_nz(ta.rsi(close, 14), 50.0)
f1_rsi  = (rsi_val - 50.0) / 50.0

// F2: Объемная Дельта [-1.0, 1.0]
vol_val = f_nz(volume, 1.0)
hl_diff = high - low == 0 ? syminfo.mintick : high - low
up_vol = vol_val * (close >= open ? (close - open) / hl_diff : 0.2)
down_vol = vol_val * (open > close ? (open - close) / hl_diff : 0.2)
delta_bar = f_nz(up_vol - down_vol, 0.0)
delta_ema = f_nz(ta.ema(delta_bar, 14), delta_bar)
delta_std = f_nz(ta.stdev(delta_bar, 14), 1.0)
f2_delta = delta_std > 0 ? math.max(-1.0, math.min(1.0, delta_ema / (delta_std * 2.0))) : 0.0

// F3: WaveTrend [-1.0, 1.0]
ap = hlc3
esa = f_nz(ta.ema(ap, 10), ap)
d_wt = f_nz(ta.ema(math.abs(ap - esa), 10), 1.0)
ci = d_wt != 0 ? (ap - esa) / (0.015 * d_wt) : 0.0
wt1 = f_nz(ta.ema(ci, 21), 0.0)
f3_wt = math.max(-1.0, math.min(1.0, wt1 / 60.0))

// F4: Отклонение от EMA(50) [-1.0, 1.0]
base_ema = f_nz(ta.ema(close, 50), close)
f4_dist = atr14 > 0 ? math.max(-1.0, math.min(1.0, (close - base_ema) / (atr14 * 3.0))) : 0.0

// F5: HTF MTF Trend [-1.0, 1.0]
f5_htf = f_htf_trend

// F6: ROC(5) [-1.0, 1.0]
roc5_raw = ta.roc(close, 5)
roc5_norm = atr14 > 0 and close > 0 ? roc5_raw / ((atr14 * 2.0 / close) * 100.0) : 0.0
f6_roc5 = math.max(-1.0, math.min(1.0, f_nz(roc5_norm, 0.0)))

// F7: ROC(10) [-1.0, 1.0]
roc10_raw = ta.roc(close, 10)
roc10_norm = atr14 > 0 and close > 0 ? roc10_raw / ((atr14 * 3.5 / close) * 100.0) : 0.0
f7_roc10 = math.max(-1.0, math.min(1.0, f_nz(roc10_norm, 0.0)))

// F8: Волатильность ATR(14)/ATR(50) [-1.0, 1.0]
f8_vol = math.max(-1.0, math.min(1.0, (vol_ratio - 1.0) * 2.0))

// F9: Дистанция до ближайшего Pivot High/Low [-1.0, 1.0]
p_high = ta.pivothigh(high, 5, 5)
p_low  = ta.pivotlow(low, 5, 5)
var float last_ph = na
var float last_pl = na
if not na(p_high)
    last_ph := p_high
if not na(p_low)
    last_pl := p_low

dist_ph = not na(last_ph) and atr14 > 0 ? (last_ph - close) / (atr14 * 3.0) : 1.0
dist_pl = not na(last_pl) and atr14 > 0 ? (close - last_pl) / (atr14 * 3.0) : 1.0
f9_pivot = math.max(-1.0, math.min(1.0, dist_pl - dist_ph))

// F10: Быстрый нативный ADX(14)
[di_plus, di_minus, adx_val_raw] = ta.dmi(14, 14)
f10_adx = math.max(-1.0, math.min(1.0, (f_nz(adx_val_raw, 25.0) - 25.0) / 25.0))

// ==============================================================================
// 🧠 3. ДВУХСЛОЙНАЯ НЕЙРОСЕТЬ (10 -> 8 -> 1) И АНСАМБЛЬ ИЗ 3 МОДЕЛЕЙ
// ==============================================================================
f_relu(float x) => math.max(0.0, x)
f_d_relu(float x) => x > 0.0 ? 1.0 : 0.0

f_tanh(float x) =>
    if na(x)
        0.0
    else
        float cx = math.max(-10.0, math.min(10.0, x))
        float exp2x = math.exp(2.0 * cx)
        (exp2x - 1.0) / (exp2x + 1.0)

f_d_tanh(float out) => math.max(0.01, 1.0 - math.pow(out, 2))

var float[] m1_w1 = array.new_float(80, 0.0)
var float[] m1_dw1 = array.new_float(80, 0.0)
var float[] m1_w2 = array.new_float(8, 0.0)
var float[] m1_dw2 = array.new_float(8, 0.0)
var float m1_bias = 0.0
var float m1_dbias = 0.0

var float[] m2_w1 = array.new_float(80, 0.0)
var float[] m2_dw1 = array.new_float(80, 0.0)
var float[] m2_w2 = array.new_float(8, 0.0)
var float[] m2_dw2 = array.new_float(8, 0.0)
var float m2_bias = 0.0
var float m2_dbias = 0.0

var float[] m3_w1 = array.new_float(80, 0.0)
var float[] m3_dw1 = array.new_float(80, 0.0)
var float[] m3_w2 = array.new_float(8, 0.0)
var float[] m3_dw2 = array.new_float(8, 0.0)
var float m3_bias = 0.0
var float m3_dbias = 0.0

if bar_index == 0
    for i = 0 to 79
        float seed1 = math.sin(i * 1.337) * 0.25
        float seed2 = math.cos(i * 2.718) * 0.25
        float seed3 = math.sin(i * 3.141) * 0.25
        array.set(m1_w1, i, seed1)
        array.set(m2_w1, i, seed2)
        array.set(m3_w1, i, seed3)
    for j = 0 to 7
        array.set(m1_w2, j, math.sin(j * 0.77) * 0.3)
        array.set(m2_w2, j, math.cos(j * 0.88) * 0.3)
        array.set(m3_w2, j, math.sin(j * 0.99) * 0.3)

f_forward_pass(float[] feat, float[] w1, float[] w2, float bias) =>
    float[] h_act = array.new_float(8, 0.0)
    for j = 0 to 7
        float sum = 0.0
        int offset = j * 10
        for i = 0 to 9
            sum := sum + (array.get(feat, i) * array.get(w1, offset + i))
        array.set(h_act, j, f_relu(sum))
    
    float out_sum = bias
    for j = 0 to 7
        out_sum := out_sum + (array.get(h_act, j) * array.get(w2, j))
    float out = f_tanh(out_sum)
    [out, h_act]

f_train_model(float[] old_feat, float old_out, float[] old_h_act, float target_label, float[] w1, float[] dw1, float[] w2, float[] dw2, float bias, float dbias, float lr, float mom, float l2_decay) =>
    float err = target_label - old_out
    float d_out = err * f_d_tanh(old_out)
    
    float new_dbias = (lr * d_out) + (mom * dbias)
    float new_bias = math.max(-1.5, math.min(1.5, bias + new_dbias))
    
    for j = 0 to 7
        float h_val = array.get(old_h_act, j)
        float cur_w2 = array.get(w2, j)
        float grad2 = (d_out * h_val) - (l2_decay * cur_w2)
        float step2 = (lr * grad2) + (mom * array.get(dw2, j))
        array.set(dw2, j, step2)
        array.set(w2, j, math.max(-2.5, math.min(2.5, cur_w2 + step2)))
        
        float d_h = (d_out * cur_w2) * f_d_relu(h_val)
        int offset = j * 10
        for i = 0 to 9
            int idx = offset + i
            float in_val = array.get(old_feat, i)
            float cur_w1 = array.get(w1, idx)
            float grad1 = (d_h * in_val) - (l2_decay * cur_w1)
            float step1 = (lr * grad1) + (mom * array.get(dw1, idx))
            array.set(dw1, idx, step1)
            array.set(w1, idx, math.max(-2.5, math.min(2.5, cur_w1 + step1)))
            
    [new_bias, new_dbias]

current_feats = array.new_float(10, 0.0)
array.set(current_feats, 0, f1_rsi)
array.set(current_feats, 1, f2_delta)
array.set(current_feats, 2, f3_wt)
array.set(current_feats, 3, f4_dist)
array.set(current_feats, 4, f5_htf)
array.set(current_feats, 5, f6_roc5)
array.set(current_feats, 6, f7_roc10)
array.set(current_feats, 7, f8_vol)
array.set(current_feats, 8, f9_pivot)
array.set(current_feats, 9, f10_adx)

[p1_out, p1_h] = f_forward_pass(current_feats, m1_w1, m1_w2, m1_bias)
[p2_out, p2_h] = f_forward_pass(current_feats, m2_w1, m2_w2, m2_bias)
[p3_out, p3_h] = f_forward_pass(current_feats, m3_w1, m3_w2, m3_bias)

float ensemble_pred = use_ensemble ? ((p1_out + p2_out + p3_out) / 3.0) : p1_out
float ens_std = use_ensemble ? math.sqrt((math.pow(p1_out - ensemble_pred, 2) + math.pow(p2_out - ensemble_pred, 2) + math.pow(p3_out - ensemble_pred, 2)) / 3.0) : 0.0
float model_confidence = math.max(10.0, (1.0 - (ens_std * 1.5)) * 100.0)

// ==============================================================================
// 🔄 4. КОЛЬЦЕВЫЕ БУФЕРЫ (RING BUFFERS) И МУЛЬТИГОРИЗОНТНОЕ ОБУЧЕНИЕ
// ==============================================================================
int RING_SIZE = 100
var float[] rb_prices = array.new_float(RING_SIZE, 0.0)
var float[] rb_f0 = array.new_float(RING_SIZE, 0.0)
var float[] rb_f1 = array.new_float(RING_SIZE, 0.0)
var float[] rb_f2 = array.new_float(RING_SIZE, 0.0)
var float[] rb_f3 = array.new_float(RING_SIZE, 0.0)
var float[] rb_f4 = array.new_float(RING_SIZE, 0.0)
var float[] rb_f5 = array.new_float(RING_SIZE, 0.0)
var float[] rb_f6 = array.new_float(RING_SIZE, 0.0)
var float[] rb_f7 = array.new_float(RING_SIZE, 0.0)
var float[] rb_f8 = array.new_float(RING_SIZE, 0.0)
var float[] rb_f9 = array.new_float(RING_SIZE, 0.0)

var float[] rb_p1_out = array.new_float(RING_SIZE, 0.0)
var float[] rb_p2_out = array.new_float(RING_SIZE, 0.0)
var float[] rb_p3_out = array.new_float(RING_SIZE, 0.0)
var float[] rb_ens_out = array.new_float(RING_SIZE, 0.0)

var int ring_head = 0
var int total_samples = 0

array.set(rb_prices, ring_head, close)
array.set(rb_f0, ring_head, f1_rsi)
array.set(rb_f1, ring_head, f2_delta)
array.set(rb_f2, ring_head, f3_wt)
array.set(rb_f3, ring_head, f4_dist)
array.set(rb_f4, ring_head, f5_htf)
array.set(rb_f5, ring_head, f6_roc5)
array.set(rb_f6, ring_head, f7_roc10)
array.set(rb_f7, ring_head, f8_vol)
array.set(rb_f8, ring_head, f9_pivot)
array.set(rb_f9, ring_head, f10_adx)
array.set(rb_p1_out, ring_head, p1_out)
array.set(rb_p2_out, ring_head, p2_out)
array.set(rb_p3_out, ring_head, p3_out)
array.set(rb_ens_out, ring_head, ensemble_pred)

var int[] hist_outcomes = array.new_int(0)
var int total_trained_bars = 0

if total_samples >= 10 and bar_index > 25
    int idx_8 = (ring_head - 8 + RING_SIZE) % RING_SIZE
    int idx_5 = (ring_head - 5 + RING_SIZE) % RING_SIZE
    int idx_3 = (ring_head - 3 + RING_SIZE) % RING_SIZE
    
    float old_price = array.get(rb_prices, idx_8)
    float ret_8 = (close - old_price) / (atr14 * 2.0)
    float ret_5 = (close - array.get(rb_prices, idx_5)) / (atr14 * 1.5)
    float ret_3 = (close - array.get(rb_prices, idx_3)) / (atr14 * 1.0)
    
    float multi_target = math.max(-1.0, math.min(1.0, (ret_8 * 0.45) + (ret_5 * 0.35) + (ret_3 * 0.20)))
    
    past_feats = array.new_float(10, 0.0)
    array.set(past_feats, 0, array.get(rb_f0, idx_8))
    array.set(past_feats, 1, array.get(rb_f1, idx_8))
    array.set(past_feats, 2, array.get(rb_f2, idx_8))
    array.set(past_feats, 3, array.get(rb_f3, idx_8))
    array.set(past_feats, 4, array.get(rb_f4, idx_8))
    array.set(past_feats, 5, array.get(rb_f5, idx_8))
    array.set(past_feats, 6, array.get(rb_f6, idx_8))
    array.set(past_feats, 7, array.get(rb_f7, idx_8))
    array.set(past_feats, 8, array.get(rb_f8, idx_8))
    array.set(past_feats, 9, array.get(rb_f9, idx_8))
    
    float past_p1 = array.get(rb_p1_out, idx_8)
    float past_p2 = array.get(rb_p2_out, idx_8)
    float past_p3 = array.get(rb_p3_out, idx_8)
    
    [b1, db1] = f_train_model(past_feats, past_p1, p1_h, multi_target, m1_w1, m1_dw1, m1_w2, m1_dw2, m1_bias, m1_dbias, learning_rate, momentum_term, l2_reg_lambda)
    m1_bias := b1
    m1_dbias := db1
    
    [b2, db2] = f_train_model(past_feats, past_p2, p2_h, multi_target, m2_w1, m2_dw1, m2_w2, m2_dw2, m2_bias, m2_dbias, learning_rate * 1.05, momentum_term, l2_reg_lambda)
    m2_bias := b2
    m2_dbias := db2
    
    [b3, db3] = f_train_model(past_feats, past_p3, p3_h, multi_target, m3_w1, m3_dw1, m3_w2, m3_dw2, m3_bias, m3_dbias, learning_rate * 0.95, momentum_term, l2_reg_lambda)
    m3_bias := b3
    m3_dbias := db3
    
    float past_ens = array.get(rb_ens_out, idx_8)
    bool is_correct = (past_ens >= 0.1 and multi_target > 0) or (past_ens <= -0.1 and multi_target < 0) or (math.abs(past_ens) < 0.1 and math.abs(multi_target) < 0.15)
    array.push(hist_outcomes, is_correct ? 1 : 0)
    if array.size(hist_outcomes) > train_window
        array.shift(hist_outcomes)
    total_trained_bars := total_trained_bars + 1

ring_head := (ring_head + 1) % RING_SIZE
total_samples := total_samples + 1

float current_accuracy = 50.0
if array.size(hist_outcomes) > 0
    int wins = 0
    for i = 0 to array.size(hist_outcomes) - 1
        wins := wins + array.get(hist_outcomes, i)
    current_accuracy := (wins / float(array.size(hist_outcomes))) * 100.0

// ==============================================================================
// 📈 5. БЫСТРЫЙ ДИНАМИЧЕСКИЙ ПОРОГ СИГНАЛА O(1) (Без тяжелой сортировки)
// ==============================================================================
abs_ensemble_pred = math.abs(ensemble_pred)
mean_abs_pred     = f_nz(ta.sma(abs_ensemble_pred, 50), 0.20)
std_abs_pred      = f_nz(ta.stdev(abs_ensemble_pred, 50), 0.05)
approx_p85        = math.max(0.12, math.min(0.70, mean_abs_pred + 1.5 * std_abs_pred))

dyn_threshold_val = use_dyn_thresh ? (approx_p85 * thresh_sens) : static_thresh
float model_prob  = math.min(88.0, math.max(35.0, 50.0 + (abs_ensemble_pred * 35.0) + (current_accuracy >= 55.0 ? 5.0 : 0.0)))

var string top_drivers_str = "RSI, Delta, HTF"
if barstate.islast
    var float[] feat_impact = array.new_float(10, 0.0)
    for i = 0 to 9
        float imp = 0.0
        for j = 0 to 7
            imp := imp + math.abs(array.get(m1_w1, (j * 10) + i)) + math.abs(array.get(m2_w1, (j * 10) + i)) + math.abs(array.get(m3_w1, (j * 10) + i))
        array.set(feat_impact, i, imp * math.abs(array.get(current_feats, i)))
    
    int i1 = 0, int i2 = 1, int i3 = 2
    float v1 = -1.0, float v2 = -1.0, float v3 = -1.0
    for i = 0 to 9
        float v = array.get(feat_impact, i)
        if v > v1
            v3 := v2
            i3 := i2
            v2 := v1
            i2 := i1
            v1 := v
            i1 := i
        else if v > v2
            v3 := v2
            i3 := i2
            v2 := v
            i2 := i
        else if v > v3
            v3 := v
            i3 := i
            
    top_drivers_str := f_feature_name(i1) + ": " + str.tostring(array.get(current_feats, i1), "+#.##") + " | " + f_feature_name(i2) + ": " + str.tostring(array.get(current_feats, i2), "+#.##") + " | " + f_feature_name(i3) + ": " + str.tostring(array.get(current_feats, i3), "+#.##")

// ==============================================================================
// ⚡ 6. АДАПТИВНЫЕ ПАРАМЕТРЫ СЕТАПА И ТРЕЙЛИНГ-СТОП
// ==============================================================================
float effective_tp1_mult   = use_adapt_risk ? math.max(1.0, math.min(6.0, base_tp1_mult * vol_ratio)) : base_tp1_mult
float effective_tp2_mult   = use_adapt_risk ? math.max(2.0, math.min(10.0, base_tp2_mult * vol_ratio)) : base_tp2_mult
int   effective_bars_entry = use_adapt_risk ? math.max(1, math.round(base_bars_entry / math.max(0.5, vol_ratio))) : base_bars_entry
int   effective_bars_tp1   = use_adapt_risk ? math.max(2, math.round(base_bars_tp1 / math.max(0.5, vol_ratio))) : base_bars_tp1
int   effective_bars_tp2   = use_adapt_risk ? math.max(4, math.round(base_bars_tp2 / math.max(0.5, vol_ratio))) : base_bars_tp2

// Переменные состояния торгового сетапа
var int   fc_start_bar     = 0
var float fc_start_price   = na
var float active_entry     = na
var float initial_sl       = na
var float active_sl        = na
var float active_tp1       = na
var float active_tp2       = na
var bool  is_ai_long       = false

// Этапы исполнения (Legs)
var bool  fc_leg1_hit      = false
var int   fc_leg1_idx      = 0
var float fc_leg1_val      = na

var bool  fc_leg2_hit      = false
var int   fc_leg2_idx      = 0
var float fc_leg2_val      = na

var bool  fc_leg3_hit      = false
var int   fc_leg3_idx      = 0
var float fc_leg3_val      = na

var string setup_status    = "Ожидание"
var string active_reason   = ""
var float  active_prob     = 50.0

// Безусловные триггеры пересечений (без предупреждения CW10002)
bool pred_cross_up   = ta.crossover(ensemble_pred, dyn_threshold_val)
bool pred_cross_dn   = ta.crossunder(ensemble_pred, -dyn_threshold_val)
bool buy_trigger     = ensemble_pred > dyn_threshold_val and pred_cross_up
bool sell_trigger    = ensemble_pred < -dyn_threshold_val and pred_cross_dn

// Авто-старт при первой загрузке (гарантирует немедленную отрисовку сетапа)
bool need_bootstrap_init = na(active_entry) and bar_index >= 15
bool init_long  = need_bootstrap_init and (ensemble_pred >= 0)
bool init_short = need_bootstrap_init and (ensemble_pred < 0)

// Проверка выбивания стоп-лосса (Invalidation)
bool sl_hit_long    = is_ai_long  and not na(active_sl) and low <= active_sl
bool sl_hit_short   = not is_ai_long and not na(active_sl) and high >= active_sl
bool is_invalidated = (sl_hit_long or sl_hit_short) and not na(active_entry)

// Трейлинг-стоп и проверка уровней
if fc_start_bar > 0 and bar_index >= fc_start_bar and not na(active_entry) and not is_invalidated
    if is_ai_long
        // 1. Точка входа
        if not fc_leg1_hit and low <= active_entry
            fc_leg1_hit := true
            fc_leg1_idx := bar_index
            fc_leg1_val := low
            setup_status := "📍 ВХОД ИСПОЛНЕН (LONG)"
        
        // 2. Достижение TP1
        if fc_leg1_hit and not fc_leg2_hit and high >= active_tp1
            fc_leg2_hit := true
            fc_leg2_idx := bar_index
            fc_leg2_val := high
            active_sl := active_entry
            setup_status := "🎯 TP1 ВЗЯТ (50%) | Стоп в БУ"
        
        // Трейлинг-стоп после TP1
        if fc_leg2_hit and use_trailing
            float trail_lvl = high - (atr14 * trailing_atr)
            if trail_lvl > active_sl
                active_sl := trail_lvl
                setup_status := "⚡ ТРЕЙЛИНГ-СТОП: " + str.tostring(active_sl, "#.##")
        
        // 3. Достижение TP2
        if fc_leg2_hit and not fc_leg3_hit and high >= active_tp2
            fc_leg3_hit := true
            fc_leg3_idx := bar_index
            fc_leg3_val := high
            setup_status := "🏁 ЦЕЛЬ TP2 ИСПОЛНЕНА"
    else
        // 1. Точка входа
        if not fc_leg1_hit and high >= active_entry
            fc_leg1_hit := true
            fc_leg1_idx := bar_index
            fc_leg1_val := high
            setup_status := "📍 ВХОД ИСПОЛНЕН (SHORT)"
        
        // 2. Достижение TP1
        if fc_leg1_hit and not fc_leg2_hit and low <= active_tp1
            fc_leg2_hit := true
            fc_leg2_idx := bar_index
            fc_leg2_val := low
            active_sl := active_entry
            setup_status := "🎯 TP1 ВЗЯТ (50%) | Стоп в БУ"
        
        // Трейлинг-стоп после TP1
        if fc_leg2_hit and use_trailing
            float trail_lvl = low + (atr14 * trailing_atr)
            if trail_lvl < active_sl
                active_sl := trail_lvl
                setup_status := "⚡ ТРЕЙЛИНГ-СТОП: " + str.tostring(active_sl, "#.##")
        
        // 3. Достижение TP2
        if fc_leg2_hit and not fc_leg3_hit and low <= active_tp2
            fc_leg3_hit := true
            fc_leg3_idx := bar_index
            fc_leg3_val := low
            setup_status := "🏁 ЦЕЛЬ TP2 ИСПОЛНЕНА"

// Авто-ролловер / перестройка
bool need_fresh_long  = buy_trigger or init_long or (is_invalidated and ensemble_pred > 0) or (fc_leg3_hit and ensemble_pred > dyn_threshold_val and auto_rebuild)
bool need_fresh_short = sell_trigger or init_short or (is_invalidated and ensemble_pred < 0) or (fc_leg3_hit and ensemble_pred < -dyn_threshold_val and auto_rebuild)

if need_fresh_long and (auto_rebuild or na(active_entry))
    fc_start_bar     := bar_index
    fc_start_price   := close
    active_entry     := math.min(close, close - (atr14 * entry_pull_atr))
    initial_sl       := active_entry - (atr14 * base_sl_mult)
    active_sl        := initial_sl
    active_tp1       := active_entry + (atr14 * effective_tp1_mult)
    active_tp2       := active_entry + (atr14 * effective_tp2_mult)
    is_ai_long       := true
    fc_leg1_hit      := false
    fc_leg2_hit      := false
    fc_leg3_hit      := false
    fc_leg1_idx      := 0
    fc_leg2_idx      := 0
    fc_leg3_idx      := 0
    fc_leg1_val      := na
    fc_leg2_val      := na
    fc_leg3_val      := na
    active_prob      := model_prob
    active_reason    := top_drivers_str
    setup_status     := is_invalidated ? "🔄 Перестройка: LONG" : fc_leg3_hit ? "🚀 Новая волна: LONG" : "🟢 Активен LONG"

if need_fresh_short and (auto_rebuild or na(active_entry))
    fc_start_bar     := bar_index
    fc_start_price   := close
    active_entry     := math.max(close, close + (atr14 * entry_pull_atr))
    initial_sl       := active_entry + (atr14 * base_sl_mult)
    active_sl        := initial_sl
    active_tp1       := active_entry - (atr14 * effective_tp1_mult)
    active_tp2       := active_entry - (atr14 * effective_tp2_mult)
    is_ai_long       := false
    fc_leg1_hit      := false
    fc_leg2_hit      := false
    fc_leg3_hit      := false
    fc_leg1_idx      := 0
    fc_leg2_idx      := 0
    fc_leg3_idx      := 0
    fc_leg1_val      := na
    fc_leg2_val      := na
    fc_leg3_val      := na
    active_prob      := model_prob
    active_reason    := top_drivers_str
    setup_status     := is_invalidated ? "🔄 Перестройка: SHORT" : fc_leg3_hit ? "🚀 Новая волна: SHORT" : "🔴 Активен SHORT"

// Маркеры сигналов на графике
plotshape(ta.change(is_ai_long) and is_ai_long, title="AI BUY Signal", style=shape.labelup, location=location.belowbar, color=c_bull, text="AI BUY", textcolor=color.white, size=size.small)
plotshape(ta.change(is_ai_long) and not is_ai_long, title="AI SELL Signal", style=shape.labeldown, location=location.abovebar, color=c_bear, text="AI SELL", textcolor=color.white, size=size.small)

barcolor(color_bars ? (ensemble_pred > dyn_threshold_val ? color.new(c_bull, 30) : ensemble_pred < -dyn_threshold_val ? color.new(c_bear, 30) : color.new(c_neutral, 70)) : na)

// Горизонтальные уровни
plot(show_target_lvl ? active_entry : na, title="AI Entry Level", color=color.new(color.white, 30), style=plot.style_linebr, linewidth=1)
plot(show_target_lvl ? active_tp1 : na, title="AI TP1 Level", color=color.new(c_cyan, 20), style=plot.style_linebr, linewidth=2)
plot(show_target_lvl ? active_tp2 : na, title="AI TP2 Level", color=color.new(c_bull, 10), style=plot.style_linebr, linewidth=2)
plot(show_target_lvl ? active_sl : na,  title="AI SL Level",  color=color.new(c_bear, 10), style=plot.style_linebr, linewidth=2)

// ==============================================================================
// 🔮 7. ВОЛНОВЫЕ ТРАЕКТОРИИ, ПОЛОСА УВЕРЕННОСТИ И ПЛАН Б
// ==============================================================================
var line l_fc_0 = na
var line l_fc_1 = na
var line l_fc_2 = na
var line l_fc_sl = na
var line l_alt_0 = na
var line l_alt_1 = na
var line l_alt_2 = na

var label lbl_start = na
var label lbl_entry = na
var label lbl_tp1   = na
var label lbl_tp2   = na
var label lbl_sl    = na
var label lbl_alt   = na
var box   b_corridor= na
var box   b_ribbon  = na

if barstate.islast and show_forecast and not na(active_entry)
    line.delete(l_fc_0)
    line.delete(l_fc_1)
    line.delete(l_fc_2)
    line.delete(l_fc_sl)
    line.delete(l_alt_0)
    line.delete(l_alt_1)
    line.delete(l_alt_2)
    label.delete(lbl_start)
    label.delete(lbl_entry)
    label.delete(lbl_tp1)
    label.delete(lbl_tp2)
    label.delete(lbl_sl)
    label.delete(lbl_alt)
    box.delete(b_corridor)
    box.delete(b_ribbon)
    
    int min_x = math.max(1, bar_index - 300)
    int x0 = math.max(min_x, fc_start_bar > 0 ? fc_start_bar : bar_index)
    float y0 = not na(fc_start_price) ? fc_start_price : close
    
    // Точка 1: Вход
    int x1 = fc_leg1_hit ? math.max(min_x, fc_leg1_idx) : math.max(min_x, x0 + effective_bars_entry)
    float y1 = fc_leg1_hit ? fc_leg1_val : active_entry
    
    // Точка 2: TP1
    int x2 = fc_leg2_hit ? math.max(min_x, fc_leg2_idx) : (fc_leg1_hit ? math.max(min_x, fc_leg1_idx + math.max(2, effective_bars_tp1 - effective_bars_entry)) : math.max(min_x, x0 + effective_bars_tp1))
    float y2 = fc_leg2_hit ? fc_leg2_val : active_tp1
    
    // Точка 3: TP2
    int x3 = fc_leg3_hit ? math.max(min_x, fc_leg3_idx) : (fc_leg2_hit ? math.max(min_x, fc_leg2_idx + math.max(3, effective_bars_tp2 - effective_bars_tp1)) : math.max(min_x, x0 + effective_bars_tp2))
    float y3 = fc_leg3_hit ? fc_leg3_val : active_tp2
    
    if x1 <= x0
        x1 := x0 + math.max(1, effective_bars_entry)
    if x2 <= x1
        x2 := x1 + math.max(2, effective_bars_tp1 - effective_bars_entry)
    if x3 <= x2
        x3 := x2 + math.max(3, effective_bars_tp2 - effective_bars_tp1)
    
    color main_col = is_ai_long ? c_bull : c_bear
    color alt_col  = is_ai_long ? c_bear : c_bull
    
    l_fc_0 := line.new(x0, y0, x1, y1, xloc=xloc.bar_index, color=fc_leg1_hit ? color.new(main_col, 55) : color.new(main_col, 10), width=fc_leg1_hit ? 2 : 4, style=fc_leg1_hit ? line.style_dashed : line.style_solid)
    l_fc_1 := line.new(x1, y1, x2, y2, xloc=xloc.bar_index, color=fc_leg2_hit ? color.new(c_cyan, 55) : color.new(c_cyan, 0), width=fc_leg2_hit ? 2 : 4, style=fc_leg2_hit ? line.style_dashed : line.style_solid)
    l_fc_2 := line.new(x2, y2, x3, y3, xloc=xloc.bar_index, color=fc_leg3_hit ? color.new(main_col, 55) : color.new(main_col, 0), width=fc_leg3_hit ? 2 : 4, style=fc_leg3_hit ? line.style_dashed : line.style_solid)
    
    int sl_end_x = math.max(x3 + 4, bar_index + 6)
    l_fc_sl := line.new(x0, active_sl, sl_end_x, active_sl, xloc=xloc.bar_index, color=color.new(c_bear, 20), width=2, style=line.style_solid)
    
    float top_box = math.max(y2, y3)
    float bot_box = math.min(y2, y3)
    b_corridor := box.new(x2, top_box, x3, bot_box, border_color=color.new(main_col, 60), border_width=1, border_style=line.style_dotted, bgcolor=color.new(main_col, 90))
    
    if show_ribbon and use_ensemble
        float ribbon_spread = math.max(atr14 * 0.4, (ens_std * atr14 * 2.0))
        float rib_top = is_ai_long ? (y3 + ribbon_spread) : (y3 + ribbon_spread * 0.5)
        float rib_bot = is_ai_long ? (y3 - ribbon_spread * 0.5) : (y3 - ribbon_spread)
        b_ribbon := box.new(x1, rib_top, x3, rib_bot, border_color=color.new(c_purple, 70), border_width=1, border_style=line.style_dashed, bgcolor=color.new(c_purple, 85))

    if show_alt_wave
        // Альтернативная волна (План Б) привязывается строго к горизонтальному уровню SL (active_sl), а не к свечке (x0, y0)
        int alt_x0 = math.max(bar_index + 3, x1 + 2)
        float alt_y0 = active_sl
        int alt_x1 = alt_x0 + 8
        float alt_y1 = is_ai_long ? active_sl - (atr14 * 1.5) : active_sl + (atr14 * 1.5)
        int alt_x2 = alt_x1 + 10
        float alt_y2 = is_ai_long ? active_sl - (atr14 * 3.0) : active_sl + (atr14 * 3.0)
        int alt_x3 = alt_x2 + 8
        float alt_y3 = is_ai_long ? alt_y2 + (atr14 * 1.2) : alt_y2 - (atr14 * 1.2)
        
        l_alt_0 := line.new(alt_x0, alt_y0, alt_x1, alt_y1, xloc=xloc.bar_index, color=color.new(alt_col, 30), width=2, style=line.style_dashed)
        l_alt_1 := line.new(alt_x1, alt_y1, alt_x2, alt_y2, xloc=xloc.bar_index, color=color.new(alt_col, 30), width=2, style=line.style_dashed)
        l_alt_2 := line.new(alt_x2, alt_y2, alt_x3, alt_y3, xloc=xloc.bar_index, color=color.new(alt_col, 40), width=2, style=line.style_dotted)
        
        string alt_txt = "⚡ АЛЬТЕРНАТИВА (Слом SL " + str.tostring(active_sl, "#.##") + ")\\n➔ " + (is_ai_long ? "SHORT" : "LONG") + " Цель: " + str.tostring(alt_y2, "#.##")
        lbl_alt := label.new(alt_x2, alt_y2, alt_txt, color=color.new(color.black, 100), textcolor=alt_col, style=is_ai_long ? label.style_label_up : label.style_label_down, size=size.small)

    float tp1_pct = ((y2 - active_entry) / active_entry) * 100.0
    float tp2_pct = ((y3 - active_entry) / active_entry) * 100.0
    float sl_pct  = ((active_sl - active_entry) / active_entry) * 100.0
    
    string start_txt = "📍 СТАРТ (" + (is_ai_long ? "🟢 LONG" : "🔴 SHORT") + ")\\nУверенность: " + str.tostring(model_confidence, "#") + "%"
    lbl_start := label.new(x0, y0, start_txt, color=color.new(color.black, 100), textcolor=main_col, style=is_ai_long ? label.style_label_down : label.style_label_up, size=size.small)
    
    int bars_to_entry = math.max(1, x1 - bar_index)
    string entry_timing = fc_leg1_hit ? " [OK ✅]" : ("\\n⏳ Горизонт: ~" + str.tostring(bars_to_entry) + " б.")
    lbl_entry := label.new(x1, y1, "📍 ВХОД: " + str.tostring(y1, "#.##") + entry_timing, color=color.new(color.black, 100), textcolor=fc_leg1_hit ? color.gray : main_col, style=is_ai_long ? label.style_label_up : label.style_label_down, size=size.small)
    
    int bars_to_tp1 = math.max(1, x2 - bar_index)
    string tp1_timing = fc_leg2_hit ? " [OK ✅]" : ("\\n⏳ Горизонт: ~" + str.tostring(bars_to_tp1) + " б.")
    lbl_tp1 := label.new(x2, y2, "🏁 TP1 (" + str.tostring(tp1_pct, "+#.##") + "%): " + str.tostring(y2, "#.##") + tp1_timing, color=color.new(color.black, 100), textcolor=fc_leg2_hit ? color.gray : c_cyan, style=is_ai_long ? label.style_label_down : label.style_label_up, size=size.small)
    
    int bars_to_tp2 = math.max(1, x3 - bar_index)
    string tp2_timing = fc_leg3_hit ? " [OK ✅]" : ("\\n⏳ Горизонт: ~" + str.tostring(bars_to_tp2) + " б.")
    lbl_tp2 := label.new(x3, y3, "🚀 TP2 (" + str.tostring(tp2_pct, "+#.##") + "%): " + str.tostring(y3, "#.##") + tp2_timing, color=color.new(color.black, 100), textcolor=fc_leg3_hit ? color.gray : main_col, style=is_ai_long ? label.style_label_up : label.style_label_down, size=size.small)
    
    string sl_tag = fc_leg2_hit ? ("🛑 SL (Трейлинг/БУ): " + str.tostring(active_sl, "#.##")) : ("🛑 SL: " + str.tostring(active_sl, "#.##") + " (" + str.tostring(sl_pct, "#.##") + "%)")
    lbl_sl := label.new(sl_end_x, active_sl, sl_tag, color=color.new(color.black, 100), textcolor=c_bear, style=label.style_label_left, size=size.small)

// ==============================================================================
// 📊 8. КОМПАКТНАЯ ИНФО-ПАНЕЛЬ (HUD DASHBOARD)
// ==============================================================================
get_table_pos(pos) =>
    pos == "Верхний левый" ? position.top_left : pos == "Верхний правый" ? position.top_right : pos == "Нижний левый" ? position.bottom_left : position.bottom_right

var table t_ai = na
if barstate.islast and show_dashboard
    table.delete(t_ai)
    t_ai := table.new(get_table_pos(table_pos), columns=2, rows=6, bgcolor=c_bg_dark, border_color=#334155, border_width=1)
    
    table.cell(t_ai, 0, 0, "🧠 DEEP ENSEMBLE (" + selected_htf + " MTF)", text_color=c_cyan, text_size=size.small, bgcolor=#1e293b)
    table.cell(t_ai, 1, 0, syminfo.ticker + " [" + timeframe.period + "] | Vol: " + str.tostring(vol_ratio, "#.##") + "x", text_color=color.white, text_size=size.small, bgcolor=#1e293b)
    
    // 1. Прогноз и разброс ансамбля
    string pred_tag = is_ai_long ? ("🟢 LONG (" + str.tostring(active_prob, "#.#") + "%)") : ("🔴 SHORT (" + str.tostring(active_prob, "#.#") + "%)")
    string ens_info = use_ensemble ? (" [±" + str.tostring(ens_std, "#.##") + " | " + str.tostring(model_confidence, "#") + "% Увер.]") : ""
    table.cell(t_ai, 0, 1, "Прогноз & Ансамбль", text_color=c_neutral, text_size=size.small)
    table.cell(t_ai, 1, 1, pred_tag + ens_info, text_color=is_ai_long ? c_bull : c_bear, text_size=size.small)
    
    // 2. Активные веса / Драйверы
    table.cell(t_ai, 0, 2, "💡 Активные веса", text_color=c_neutral, text_size=size.small)
    table.cell(t_ai, 1, 2, top_drivers_str, text_color=c_gold, text_size=size.small)
    
    // 3. Сетап и статус исполнения уровней
    string entry_status = fc_leg1_hit ? " [OK ✅]" : ""
    string tp1_status   = fc_leg2_hit ? " [OK ✅]" : ""
    string sl_display   = fc_leg2_hit ? (use_trailing ? ("Трейлинг " + str.tostring(active_sl, "#.##")) : ("БУ " + str.tostring(active_sl, "#.##"))) : str.tostring(active_sl, "#.##")
    string setup_txt    = not na(active_entry) ? ("Вход: " + str.tostring(active_entry, "#.##") + entry_status + " | TP1: " + str.tostring(active_tp1, "#.##") + tp1_status + " | SL: " + sl_display) : "Поиск сетапа"
    table.cell(t_ai, 0, 3, "Сетап & Исполнение", text_color=c_neutral, text_size=size.small)
    table.cell(t_ai, 1, 3, setup_txt, text_color=color.white, text_size=size.small)
    
    // 4. Адаптивные горизонты и порог
    float rr_ratio = effective_tp1_mult / base_sl_mult
    string thresh_tag = "Порог: " + str.tostring(dyn_threshold_val, "#.##")
    table.cell(t_ai, 0, 4, "Горизонт & Порог", text_color=c_neutral, text_size=size.small)
    table.cell(t_ai, 1, 4, "TP1: ~" + str.tostring(effective_bars_tp1) + " б. | TP2: ~" + str.tostring(effective_bars_tp2) + " б. | " + thresh_tag + " | R:R 1:" + str.tostring(rr_ratio, "#.#"), text_color=c_cyan, text_size=size.small)
    
    // 5. Обучение нейросети и текущий статус
    table.cell(t_ai, 0, 5, "Точность & Статус", text_color=c_neutral, text_size=size.small)
    table.cell(t_ai, 1, 5, str.tostring(current_accuracy, "#.#") + "% (Обучено: " + str.tostring(total_trained_bars) + " б.) | " + setup_status, text_color=current_accuracy >= 55.0 ? c_bull : c_gold, text_size=size.small)

// ==============================================================================
// 🔔 ОПОВЕЩЕНИЯ ДЛЯ TRADINGVIEW & TELEGRAM
// ==============================================================================
alertcondition(ta.change(is_ai_long) and is_ai_long, "S&T Neural AI Deep LONG Signal", "🧠 [Deep Neural AI] Ансамбль сформировал сигнал на покупку (LONG)! Вход: {{close}}")
alertcondition(ta.change(is_ai_long) and not is_ai_long, "S&T Neural AI Deep SHORT Signal", "🧠 [Deep Neural AI] Ансамбль сформировал сигнал на продажу (SHORT)! Вход: {{close}}")
alertcondition(fc_leg1_hit and not fc_leg1_hit[1], "S&T Neural AI Deep Entry Hit", "📍 [Deep Neural AI] Точка входа исполнена! Уровень: {{close}}")
alertcondition(fc_leg2_hit and not fc_leg2_hit[1], "S&T Neural AI Deep TP1 Hit", "🎯 [Deep Neural AI] Цель TP1 достигнута! Перенос SL в БУ/Трейлинг. Уровень: {{close}}")
alertcondition(fc_leg3_hit and not fc_leg3_hit[1], "S&T Neural AI Deep TP2 Hit", "🚀 [Deep Neural AI] Главная цель TP2 исполнена! Уровень: {{close}}")
alertcondition(is_invalidated, "S&T Neural AI Deep Invalidation Alert", "⚠️ [Deep Neural AI] Стоп-лосс выбит! Запущена авто-перестройка сетапа.")
`;
};
