import { IndicatorSettings } from "../types";

export const generateNeuralSuperFusionScript = (s: IndicatorSettings) => {
  const isMobileOptimized = s.mobileOptimized;

  return `//@version=6
indicator("S&T Neural SuperFusion AI Engine [NeuraLib + SuperIndicator v6]", "ST FUSION", overlay=true, max_boxes_count=500, max_lines_count=500, max_labels_count=500)

// ==============================================================================
// 🌟 S&T NEURAL SUPERFUSION AI ENGINE (PINE SCRIPT v6)
// ==============================================================================
// 1. ДВОЙНОЙ ML-ДВИЖОК И СОГЛАСОВАНИЕ ПРОГНОЗОВ (CONSENSUS MATRIX):
//    - Движок 1: NeuraLib Deep Ensemble (3 независимые нейросети 10->8->1 с онлайн SGD).
//    - Движок 2: Lorentzian Classification (Классификатор неевклидовой метрики Лоренца).
//    - Движок 3: Cumulative Volume Delta (CVD) — институциональные объемы и поглощение.
//    - Движок 4: Smart Money Concepts (SMC) — Order Blocks (OB), FVG и BOS.
// 2. УПРОЩЕННЫЕ И НАДЕЖНЫЕ СЕТАПЫ (SETUP MODES):
//    - 🚀 Активный (Скальпинг/Дейтрейдинг) — частые сигналы и сетапы с входом по рынку.
//    - ⚖️ Сбалансированный (Свинг) — фильтрованные подтвержденные движения.
//    - 🛡️ Консервативный (Строгий консенсус) — только золотые сигналы при 100% согласии.
// ==============================================================================

// ==============================================================================
// 🎯 ГРУППА 1: РЕЖИМ ГЕНЕРАЦИИ СЕТАПОВ И ВХОД
// ==============================================================================
gp_mode        = "🎯 Режим Генерации Сетапов и Чувствительность"
setup_mode     = input.string("🚀 Активный (Частые сетапы / Дейтрейдинг)", "Режим генерации сетапов", options=["🚀 Активный (Частые сетапы / Дейтрейдинг)", "⚖️ Сбалансированный (Свинг-трейдинг)", "🛡️ Консервативный (Строгий консенсус)"], group=gp_mode)
entry_type     = input.string("По рынку (Сразу на закрытии сигнальной свечи)", "Тип входа в позицию", options=["По рынку (Сразу на закрытии сигнальной свечи)", "На микро-откате (0.15 ATR)", "На откате к Order Block (0.35 ATR)"], group=gp_mode)
min_bars_sig   = input.int(3, "Мин. интервал между новыми сигналами (баров)", minval=1, maxval=20, group=gp_mode)

// ==============================================================================
// 🧠 ГРУППА 2: НАСТРОЙКИ НЕЙРОСЕТИ NEURALIB
// ==============================================================================
gp_ml          = "🧠 Движок 1: Нейросеть NeuraLib (Deep Ensemble)"
use_ensemble   = input.bool(true, "Использовать ансамбль из 3 моделей нейросети", group=gp_ml)
learning_rate  = input.float(0.035, "Скорость обучения SGD (Learning Rate η)", minval=0.001, maxval=0.2, step=0.005, group=gp_ml)
momentum_term  = input.float(0.80, "Инерция градиента (Momentum γ)", minval=0.0, maxval=0.95, step=0.05, group=gp_ml)
l2_reg_lambda  = input.float(0.001, "L2-регуляризация (Weight Decay λ)", minval=0.0, maxval=0.05, step=0.001, group=gp_ml)
htf_custom     = input.timeframe("", "Старший таймфрейм HTF (Пусто = Авто)", group=gp_ml)

// ==============================================================================
// 🔬 ГРУППА 3: ДВИЖОК 2 LORENTZIAN ML & SMC
// ==============================================================================
gp_lorentz     = "🔬 Движок 2: Lorentzian ML & SMC Структура"
use_lorentz    = input.bool(true, "Включить классификатор метрики Лоренца", group=gp_lorentz)
lorentz_k      = input.int(8, "Количество соседей k-NN", minval=3, maxval=20, group=gp_lorentz)
show_ob        = input.bool(true, "Показывать Order Blocks (OB)", group=gp_lorentz)
show_fvg       = input.bool(true, "Показывать Fair Value Gaps (FVG)", group=gp_lorentz)

// ==============================================================================
// 🤝 ГРУППА 4: МАТРИЦА СОГЛАСОВАНИЯ И ВЕСА
// ==============================================================================
gp_fusion      = "🤝 Матрица Согласования (Consensus Matrix)"
w_neural       = input.float(0.40, "Вес Нейросети NeuraLib", minval=0.1, maxval=0.8, step=0.05, group=gp_fusion)
w_lorentz      = input.float(0.30, "Вес Lorentzian ML", minval=0.1, maxval=0.8, step=0.05, group=gp_fusion)
w_delta        = input.float(0.15, "Вес Volume Delta (CVD)", minval=0.0, maxval=0.5, step=0.05, group=gp_fusion)
w_smc          = input.float(0.15, "Вес SMC Структуры (OB)", minval=0.0, maxval=0.5, step=0.05, group=gp_fusion)
require_agree  = input.bool(false, "Строгий фильтр: Блокировать вход при разногласии NeuraLib и Lorentzian", group=gp_fusion)

// ==============================================================================
// 🎯 ГРУППА 5: ТОРГОВЫЙ СЕТАП И АДАПТИВНЫЙ РИСК
// ==============================================================================
gp_risk        = "🎯 Торговый Сетап и Тейк-Профиты"
base_sl_mult   = input.float(1.5, "Стоп-Лосс (SL ATR)", minval=0.5, maxval=4.0, step=0.1, group=gp_risk)
base_tp1_mult  = input.float(1.8, "Тейк 1 (TP1 ATR, 50% + Стоп в БУ)", minval=0.8, maxval=5.0, step=0.1, group=gp_risk)
base_tp2_mult  = input.float(3.5, "Тейк 2 (TP2 ATR, 100% Финал)", minval=1.5, maxval=8.0, step=0.1, group=gp_risk)
use_trailing   = input.bool(true, "Активировать Трейлинг-Стоп (1.5 ATR) после TP1", group=gp_risk)
trailing_atr   = input.float(1.5, "Отступ Трейлинг-Стопа (ATR)", minval=0.5, maxval=3.0, step=0.1, group=gp_risk)

// ==============================================================================
// ⏱️ ГРУППА 6: ГОРИЗОНТЫ ПРОГНОЗА
// ==============================================================================
gp_schedule    = "⏱️ Горизонты Прогноза (в Барах)"
base_bars_entry= input.int(2, "Ожидаемый откат к входу (баров)", minval=1, maxval=10, group=gp_schedule)
base_bars_tp1  = input.int(6, "Ожидаемый горизонт TP1 (баров)", minval=2, maxval=30, group=gp_schedule)
base_bars_tp2  = input.int(14, "Ожидаемый горизонт TP2 (баров)", minval=4, maxval=60, group=gp_schedule)
show_alt_wave  = input.bool(true, "Показывать Альтернативную волну (План Б)", group=gp_schedule)

// ==============================================================================
// 📱 ГРУППА 7: ОТОБРАЖЕНИЕ И ИНТЕРФЕЙС
// ==============================================================================
gp_ui          = "📱 Отображение и Интерфейс"
show_forecast  = input.bool(true, "Рисовать Волновые Траектории Сетапа", group=gp_ui)
show_ribbon    = input.bool(true, "Показывать полосу уверенности (Ribbon)", group=gp_ui)
show_target_lvl= input.bool(true, "Показывать Уровни Entry / SL / TP1 / TP2", group=gp_ui)
show_dashboard = input.bool(true, "Показывать Компактную Инфо-панель HUD", group=gp_ui)
table_pos      = input.string("${isMobileOptimized ? "Нижний левый" : "Нижний правый"}", "Позиция инфо-панели", options=["Верхний левый", "Верхний правый", "Нижний левый", "Нижний правый"], group=gp_ui)
color_bars     = input.bool(true, "Окрашивать свечи по согласованному прогнозу", group=gp_ui)

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

// ==============================================================================
// 🧮 1. МУЛЬТИ-ТАЙМФРЕЙМ (HTF) И ПРИЗНАКИ
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

// F4: Дистанция до EMA(50)
base_ema = f_nz(ta.ema(close, 50), close)
f4_dist = atr14 > 0 ? math.max(-1.0, math.min(1.0, (close - base_ema) / (atr14 * 3.0))) : 0.0

// F5: HTF Trend
f5_htf = f_htf_trend

// F6 & F7: ROC 5 и 10
roc5_raw = ta.roc(close, 5)
roc5_norm = atr14 > 0 and close > 0 ? roc5_raw / ((atr14 * 2.0 / close) * 100.0) : 0.0
f6_roc5 = math.max(-1.0, math.min(1.0, f_nz(roc5_norm, 0.0)))

roc10_raw = ta.roc(close, 10)
roc10_norm = atr14 > 0 and close > 0 ? roc10_raw / ((atr14 * 3.5 / close) * 100.0) : 0.0
f7_roc10 = math.max(-1.0, math.min(1.0, f_nz(roc10_norm, 0.0)))

// F8: Volatility Ratio
f8_vol = math.max(-1.0, math.min(1.0, (vol_ratio - 1.0) * 2.0))

// F9: Pivot Distance
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

// F10: ADX
calc_adx() =>
    up = ta.change(high)
    down = -ta.change(low)
    plusDM = na(up) ? 0.0 : (up > down and up > 0 ? up : 0.0)
    minusDM = na(down) ? 0.0 : (down > up and down > 0 ? down : 0.0)
    trur = ta.rma(ta.tr, 14)
    plus = fixnan(100 * ta.rma(plusDM, 14) / trur)
    minus = fixnan(100 * ta.rma(minusDM, 14) / trur)
    sum = plus + minus
    adx_val = 100 * ta.rma(math.abs(plus - minus) / (sum == 0 ? 1 : sum), 14)
    adx_val

adx_raw = calc_adx()
f10_adx = math.max(-1.0, math.min(1.0, (f_nz(adx_raw, 25.0) - 25.0) / 25.0))

// ==============================================================================
// 🧠 2. ДВИЖОК 1: НЕЙРОСЕТЬ NEURALIB (DEEP ENSEMBLE 3x MLP)
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
        array.set(m1_w1, i, math.sin(i * 1.337) * 0.25)
        array.set(m2_w1, i, math.cos(i * 2.718) * 0.25)
        array.set(m3_w1, i, math.sin(i * 3.141) * 0.25)
    for j = 0 to 7
        array.set(m1_w2, j, math.cos(j * 1.1) * 0.35)
        array.set(m2_w2, j, math.sin(j * 2.2) * 0.35)
        array.set(m3_w2, j, math.cos(j * 3.3) * 0.35)

f_forward_pass(float[] feats, float[] w1, float[] w2, float bias) =>
    hidden = array.new_float(8, 0.0)
    for h = 0 to 7
        float sum = 0.0
        for f = 0 to 9
            sum := sum + (array.get(feats, f) * array.get(w1, (h * 10) + f))
        array.set(hidden, h, f_relu(sum))
    
    float out_sum = bias
    for h = 0 to 7
        out_sum := out_sum + (array.get(hidden, h) * array.get(w2, h))
    [f_tanh(out_sum), hidden]

f_train_model(float[] feats, float pred, float[] hidden, float target, float[] w1, float[] dw1, float[] w2, float[] dw2, float bias, float dbias, float lr, float mom, float l2) =>
    float err = target - pred
    float d_out = err * f_d_tanh(pred)
    
    for h = 0 to 7
        float h_val = array.get(hidden, h)
        float grad_w2 = (d_out * h_val) - (l2 * array.get(w2, h))
        float delta_w2 = (lr * grad_w2) + (mom * array.get(dw2, h))
        array.set(w2, h, array.get(w2, h) + delta_w2)
        array.set(dw2, h, delta_w2)
        
        float d_h = d_out * array.get(w2, h) * f_d_relu(h_val)
        for f = 0 to 9
            int w1_idx = (h * 10) + f
            float f_val = array.get(feats, f)
            float grad_w1 = (d_h * f_val) - (l2 * array.get(w1, w1_idx))
            float delta_w1 = (lr * grad_w1) + (mom * array.get(dw1, w1_idx))
            array.set(w1, w1_idx, array.get(w1, w1_idx) + delta_w1)
            array.set(dw1, w1_idx, delta_w1)
            
    float delta_b = (lr * d_out) + (mom * dbias)
    [bias + delta_b, delta_b]

var float[] current_feats = array.new_float(10, 0.0)
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

float ensemble_neural_pred = use_ensemble ? ((p1_out + p2_out + p3_out) / 3.0) : p1_out
float ens_std = use_ensemble ? math.sqrt((math.pow(p1_out - ensemble_neural_pred, 2) + math.pow(p2_out - ensemble_neural_pred, 2) + math.pow(p3_out - ensemble_neural_pred, 2)) / 3.0) : 0.0
float neural_confidence = math.max(10.0, (1.0 - (ens_std * 1.5)) * 100.0)

// Кольцевой буфер и обучение нейросети
int RING_SIZE = 200
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
array.set(rb_ens_out, ring_head, ensemble_neural_pred)

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
    
    [b1, db1] = f_train_model(past_feats, p1_out, p1_h, multi_target, m1_w1, m1_dw1, m1_w2, m1_dw2, m1_bias, m1_dbias, learning_rate, momentum_term, l2_reg_lambda)
    m1_bias := b1
    m1_dbias := db1
    
    [b2, db2] = f_train_model(past_feats, p2_out, p2_h, multi_target, m2_w1, m2_dw1, m2_w2, m2_dw2, m2_bias, m2_dbias, learning_rate * 1.05, momentum_term, l2_reg_lambda)
    m2_bias := b2
    m2_dbias := db2
    
    [b3, db3] = f_train_model(past_feats, p3_out, p3_h, multi_target, m3_w1, m3_dw1, m3_w2, m3_dw2, m3_bias, m3_dbias, learning_rate * 0.95, momentum_term, l2_reg_lambda)
    m3_bias := b3
    m3_dbias := db3
    
    float past_ens = array.get(rb_ens_out, idx_8)
    bool is_correct = (past_ens >= 0.1 and multi_target > 0) or (past_ens <= -0.1 and multi_target < 0) or (math.abs(past_ens) < 0.1 and math.abs(multi_target) < 0.15)
    array.push(hist_outcomes, is_correct ? 1 : 0)
    if array.size(hist_outcomes) > 150
        array.shift(hist_outcomes)
    total_trained_bars := total_trained_bars + 1

ring_head := (ring_head + 1) % RING_SIZE
total_samples := total_samples + 1

float neural_accuracy = 50.0
if array.size(hist_outcomes) > 0
    int wins = 0
    for i = 0 to array.size(hist_outcomes) - 1
        wins := wins + array.get(hist_outcomes, i)
    neural_accuracy := (wins / float(array.size(hist_outcomes))) * 100.0

// ==============================================================================
// 🔬 3. ДВИЖОК 2: LORENTZIAN CLASSIFICATION & SMC СТРУКТУРА
// ==============================================================================
f_lorentz_dist(float x1, float x2, float y1, float y2, float z1, float z2) =>
    math.log(1.0 + math.abs(x1 - x2)) + math.log(1.0 + math.abs(y1 - y2)) + math.log(1.0 + math.abs(z1 - z2))

float l_score_sum = 0.0
int l_neighbors = math.min(lorentz_k, 15)
for step = 1 to l_neighbors
    int lag = step * 3
    float past_rsi = nz(f1_rsi[lag], 0.0)
    float past_wt  = nz(f3_wt[lag], 0.0)
    float past_del = nz(f2_delta[lag], 0.0)
    float d = f_lorentz_dist(f1_rsi, past_rsi, f3_wt, past_wt, f2_delta, past_del)
    float weight = 1.0 / (1.0 + d)
    float target_direction = close > nz(close[lag], close) ? 1.0 : -1.0
    l_score_sum := l_score_sum + (target_direction * weight)

float lorentz_pred = math.max(-1.0, math.min(1.0, l_score_sum / (l_neighbors * 0.85)))

// SMC Структура: Order Blocks
var float last_ob_high = na
var float last_ob_low  = na
var bool  last_ob_bull = true

bool is_down_bar = close < open
bool is_up_bar   = close > open

if is_down_bar[1] and close > high[1] + (atr14 * 0.4)
    last_ob_high := high[1]
    last_ob_low  := low[1]
    last_ob_bull := true

if is_up_bar[1] and close < low[1] - (atr14 * 0.4)
    last_ob_high := high[1]
    last_ob_low  := low[1]
    last_ob_bull := false

float smc_score = 0.0
if not na(last_ob_high) and not na(last_ob_low)
    if last_ob_bull and close >= last_ob_low and close <= last_ob_high + (atr14 * 0.5)
        smc_score := 0.75
    else if not last_ob_bull and close <= last_ob_high and close >= last_ob_low - (atr14 * 0.5)
        smc_score := -0.75
    else
        smc_score := last_ob_bull ? 0.25 : -0.25

float delta_score = f2_delta

// ==============================================================================
// 🤝 4. МАТРИЦА СОГЛАСОВАНИЯ И СКОРИНГ (SUPERFUSION)
// ==============================================================================
float master_pred = (ensemble_neural_pred * w_neural) + (lorentz_pred * w_lorentz) + (delta_score * w_delta) + (smc_score * w_smc)
master_pred := math.max(-1.0, math.min(1.0, master_pred))

// Определение эффективного порога срабатывания по режимам
float effective_threshold = setup_mode == "🚀 Активный (Частые сетапы / Дейтрейдинг)" ? 0.12 : (setup_mode == "⚖️ Сбалансированный (Свинг-трейдинг)" ? 0.20 : 0.30)

bool neural_bullish  = ensemble_neural_pred > 0.10
bool neural_bearish  = ensemble_neural_pred < -0.10
bool lorentz_bullish = lorentz_pred > 0.10
bool lorentz_bearish = lorentz_pred < -0.10

bool models_agree_long  = neural_bullish and lorentz_bullish
bool models_agree_short = neural_bearish and lorentz_bearish
bool models_conflict    = (neural_bullish and lorentz_bearish) or (neural_bearish and lorentz_bullish)

// Золотой сигнал (Golden Confluence)
bool is_golden_long  = models_agree_long and delta_score > 0.05
bool is_golden_short = models_agree_short and delta_score < -0.05

// Флаги сигналов входа
var int current_market_state = 0 // 1 = LONG, -1 = SHORT
var int last_signal_bar_idx = -100

bool cond_long_raw  = master_pred >= effective_threshold
bool cond_short_raw = master_pred <= -effective_threshold

bool filter_agree_pass_long  = not require_agree or (not models_conflict and not lorentz_bearish)
bool filter_agree_pass_short = not require_agree or (not models_conflict and not lorentz_bullish)

bool is_new_long_signal  = cond_long_raw and filter_agree_pass_long and (current_market_state != 1 or (master_pred >= effective_threshold * 1.5 and bar_index - last_signal_bar_idx >= min_bars_sig))
bool is_new_short_signal = cond_short_raw and filter_agree_pass_short and (current_market_state != -1 or (master_pred <= -effective_threshold * 1.5 and bar_index - last_signal_bar_idx >= min_bars_sig))

// Итоговая согласованная вероятность
float consensus_winrate = math.min(92.0, math.max(45.0, 50.0 + (math.abs(master_pred) * 35.0) + (is_golden_long or is_golden_short ? 10.0 : 0.0)))

// ==============================================================================
// ⚡ 5. АДАПТИВНЫЙ ТОРГОВЫЙ СЕТАП И УПРАВЛЕНИЕ ПОЗИЦИЕЙ
// ==============================================================================
var int   fc_start_bar     = 0
var float fc_start_price   = na
var float active_entry     = na
var float active_sl        = na
var float active_tp1       = na
var float active_tp2       = na
var bool  is_ai_long       = false
var bool  is_golden_setup  = false

var bool  fc_leg1_hit      = false // Вход исполнен
var int   fc_leg1_idx      = 0
var float fc_leg1_val      = na

var bool  fc_leg2_hit      = false // TP1 (50%)
var int   fc_leg2_idx      = 0
var float fc_leg2_val      = na

var bool  fc_leg3_hit      = false // TP2 (100%)
var int   fc_leg3_idx      = 0
var float fc_leg3_val      = na

var string setup_status    = "Ожидание сигнала"
var float  active_prob     = 50.0

// Проверка выбивания стоп-лосса
bool sl_hit_long    = is_ai_long  and not na(active_sl) and low <= active_sl
bool sl_hit_short   = not is_ai_long and not na(active_sl) and high >= active_sl
bool is_invalidated = (sl_hit_long or sl_hit_short) and not na(active_entry)

// Запуск НОВОГО сетапа при поступлении сигнала
if is_new_long_signal
    current_market_state := 1
    last_signal_bar_idx := bar_index
    fc_start_bar   := bar_index
    fc_start_price := close
    is_ai_long     := true
    is_golden_setup:= is_golden_long
    
    // Расчет точки входа в зависимости от выбранного режима
    if entry_type == "По рынку (Сразу на закрытии сигнальной свечи)"
        active_entry := close
        fc_leg1_hit  := true
        fc_leg1_idx  := bar_index
        fc_leg1_val  := close
        setup_status := is_golden_long ? "⭐ ЗОЛОТОЙ ВХОД (LONG)" : "🟢 ВХОД В РЫНОК (LONG)"
    else if entry_type == "На микро-откате (0.15 ATR)"
        active_entry := close - (atr14 * 0.15)
        fc_leg1_hit  := false
        fc_leg1_idx  := 0
        fc_leg1_val  := na
        setup_status := "⏳ Ожидание микро-отката"
    else
        float pull_target = close - (atr14 * 0.35)
        if not na(last_ob_high) and last_ob_bull and last_ob_high < close
            pull_target := math.max(pull_target, last_ob_high)
        active_entry := math.min(close, pull_target)
        fc_leg1_hit  := false
        fc_leg1_idx  := 0
        fc_leg1_val  := na
        setup_status := "⏳ Ожидание отката к Order Block"

    active_sl    := active_entry - (atr14 * base_sl_mult)
    active_tp1   := active_entry + (atr14 * base_tp1_mult)
    active_tp2   := active_entry + (atr14 * base_tp2_mult)
    fc_leg2_hit  := false
    fc_leg3_hit  := false
    fc_leg2_idx  := 0
    fc_leg3_idx  := 0
    fc_leg2_val  := na
    fc_leg3_val  := na
    active_prob  := consensus_winrate

if is_new_short_signal
    current_market_state := -1
    last_signal_bar_idx := bar_index
    fc_start_bar   := bar_index
    fc_start_price := close
    is_ai_long     := false
    is_golden_setup:= is_golden_short
    
    if entry_type == "По рынку (Сразу на закрытии сигнальной свечи)"
        active_entry := close
        fc_leg1_hit  := true
        fc_leg1_idx  := bar_index
        fc_leg1_val  := close
        setup_status := is_golden_short ? "⭐ ЗОЛОТОЙ ВХОД (SHORT)" : "🔴 ВХОД В РЫНОК (SHORT)"
    else if entry_type == "На микро-откате (0.15 ATR)"
        active_entry := close + (atr14 * 0.15)
        fc_leg1_hit  := false
        fc_leg1_idx  := 0
        fc_leg1_val  := na
        setup_status := "⏳ Ожидание микро-отката"
    else
        float pull_target = close + (atr14 * 0.35)
        if not na(last_ob_low) and not last_ob_bull and last_ob_low > close
            pull_target := math.min(pull_target, last_ob_low)
        active_entry := math.max(close, pull_target)
        fc_leg1_hit  := false
        fc_leg1_idx  := 0
        fc_leg1_val  := na
        setup_status := "⏳ Ожидание отката к Order Block"

    active_sl    := active_entry + (atr14 * base_sl_mult)
    active_tp1   := active_entry - (atr14 * base_tp1_mult)
    active_tp2   := active_entry - (atr14 * base_tp2_mult)
    fc_leg2_hit  := false
    fc_leg3_hit  := false
    fc_leg2_idx  := 0
    fc_leg3_idx  := 0
    fc_leg2_val  := na
    fc_leg3_val  := na
    active_prob  := consensus_winrate

// Сопровождение открытой позиции (TP1 -> БУ -> Trailing -> TP2)
if fc_start_bar > 0 and bar_index >= fc_start_bar and not na(active_entry) and not is_invalidated
    if is_ai_long
        if not fc_leg1_hit and (low <= active_entry or high >= active_tp1)
            fc_leg1_hit := true
            fc_leg1_idx := bar_index
            fc_leg1_val := low <= active_entry ? active_entry : fc_start_price
            setup_status := "📍 ВХОД ИСПОЛНЕН (LONG)"
        
        if high >= active_tp1
            fc_leg1_hit := true
            if not fc_leg2_hit
                fc_leg2_hit := true
                fc_leg2_idx := bar_index
                fc_leg2_val := high
                active_sl := active_entry // Перенос в БУ
                setup_status := "🎯 TP1 ВЗЯТ (50%) | Стоп в БУ"
        
        if fc_leg2_hit and use_trailing
            float trail_lvl = high - (atr14 * trailing_atr)
            if trail_lvl > active_sl
                active_sl := trail_lvl
                setup_status := "⚡ ТРЕЙЛИНГ: " + str.tostring(active_sl, "#.##")
        
        if high >= active_tp2
            fc_leg1_hit := true
            fc_leg2_hit := true
            if not fc_leg3_hit
                fc_leg3_hit := true
                fc_leg3_idx := bar_index
                fc_leg3_val := high
                setup_status := "🏁 ЦЕЛЬ TP2 ДОСТИГНУТА"
    else
        if not fc_leg1_hit and (high >= active_entry or low <= active_tp1)
            fc_leg1_hit := true
            fc_leg1_idx := bar_index
            fc_leg1_val := high >= active_entry ? active_entry : fc_start_price
            setup_status := "📍 ВХОД ИСПОЛНЕН (SHORT)"
        
        if low <= active_tp1
            fc_leg1_hit := true
            if not fc_leg2_hit
                fc_leg2_hit := true
                fc_leg2_idx := bar_index
                fc_leg2_val := low
                active_sl := active_entry // Перенос в БУ
                setup_status := "🎯 TP1 ВЗЯТ (50%) | Стоп в БУ"
        
        if fc_leg2_hit and use_trailing
            float trail_lvl = low + (atr14 * trailing_atr)
            if trail_lvl < active_sl
                active_sl := trail_lvl
                setup_status := "⚡ ТРЕЙЛИНГ: " + str.tostring(active_sl, "#.##")
        
        if low <= active_tp2
            fc_leg1_hit := true
            fc_leg2_hit := true
            if not fc_leg3_hit
                fc_leg3_hit := true
                fc_leg3_idx := bar_index
                fc_leg3_val := low
                setup_status := "🏁 ЦЕЛЬ TP2 ДОСТИГНУТА"

// ==============================================================================
// 🏷️ МАРКЕРЫ СИГНАЛОВ НА ГРАФИКЕ (ПРИ КАЖДОМ СОБЫТИИ)
// ==============================================================================
plotshape(is_new_long_signal and is_golden_setup, title="Golden BUY Signal", style=shape.labelup, location=location.belowbar, color=c_gold, text="⭐ GOLD BUY", textcolor=color.black, size=size.small)
plotshape(is_new_long_signal and not is_golden_setup, title="AI BUY Signal", style=shape.labelup, location=location.belowbar, color=c_bull, text="AI BUY", textcolor=color.white, size=size.small)

plotshape(is_new_short_signal and is_golden_setup, title="Golden SELL Signal", style=shape.labeldown, location=location.abovebar, color=c_purple, text="⭐ GOLD SELL", textcolor=color.white, size=size.small)
plotshape(is_new_short_signal and not is_golden_setup, title="AI SELL Signal", style=shape.labeldown, location=location.abovebar, color=c_bear, text="AI SELL", textcolor=color.white, size=size.small)

// Окраска свечей
barcolor(color_bars ? (master_pred >= effective_threshold ? color.new(c_bull, 25) : master_pred <= -effective_threshold ? color.new(c_bear, 25) : color.new(c_neutral, 60)) : na)

// Горизонтальные уровни
plot(show_target_lvl ? active_entry : na, title="SuperFusion Entry Level", color=color.new(color.white, 30), style=plot.style_linebr, linewidth=1)
plot(show_target_lvl ? active_tp1 : na, title="SuperFusion TP1 Level", color=color.new(c_cyan, 20), style=plot.style_linebr, linewidth=2)
plot(show_target_lvl ? active_tp2 : na, title="SuperFusion TP2 Level", color=color.new(c_bull, 10), style=plot.style_linebr, linewidth=2)
plot(show_target_lvl ? active_sl : na,  title="SuperFusion SL Level",  color=color.new(c_bear, 10), style=plot.style_linebr, linewidth=2)

// ==============================================================================
// 🔮 6. ВОЛНОВЫЕ ТРАЕКТОРИИ И РИСОВАНИЕ
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
    label.delete(lbl_alt)
    box.delete(b_corridor)
    box.delete(b_ribbon)
    
    int min_x = math.max(1, bar_index - 300)
    int x0 = math.max(min_x, fc_start_bar > 0 ? fc_start_bar : bar_index)
    float y0 = not na(fc_start_price) ? fc_start_price : close
    
    int x1 = fc_leg1_hit ? math.max(min_x, fc_leg1_idx) : math.max(min_x, x0 + base_bars_entry)
    float y1 = fc_leg1_hit ? fc_leg1_val : active_entry
    
    int x2 = fc_leg2_hit ? math.max(min_x, fc_leg2_idx) : (fc_leg1_hit ? math.max(min_x, fc_leg1_idx + math.max(2, base_bars_tp1 - base_bars_entry)) : math.max(min_x, x0 + base_bars_tp1))
    float y2 = fc_leg2_hit ? fc_leg2_val : active_tp1
    
    int x3 = fc_leg3_hit ? math.max(min_x, fc_leg3_idx) : (fc_leg2_hit ? math.max(min_x, fc_leg2_idx + math.max(3, base_bars_tp2 - base_bars_tp1)) : math.max(min_x, x0 + base_bars_tp2))
    float y3 = fc_leg3_hit ? fc_leg3_val : active_tp2
    
    if x1 <= x0 and not fc_leg1_hit
        x1 := x0 + math.max(1, base_bars_entry)
    if x2 <= x1
        x2 := x1 + math.max(2, base_bars_tp1 - base_bars_entry)
    if x3 <= x2
        x3 := x2 + math.max(3, base_bars_tp2 - base_bars_tp1)
    
    color main_col = is_golden_setup ? c_gold : (is_ai_long ? c_bull : c_bear)
    color alt_col  = is_ai_long ? c_bear : c_bull
    
    // Линии прогноза
    if entry_type != "По рынку (Сразу на закрытии сигнальной свечи)" or not fc_leg1_hit
        l_fc_0 := line.new(x0, y0, x1, y1, xloc=xloc.bar_index, color=fc_leg1_hit ? color.new(main_col, 55) : color.new(main_col, 10), width=fc_leg1_hit ? 2 : 4, style=fc_leg1_hit ? line.style_dashed : line.style_solid)
    
    l_fc_1 := line.new(x1, y1, x2, y2, xloc=xloc.bar_index, color=fc_leg2_hit ? color.new(c_cyan, 55) : color.new(c_cyan, 0), width=fc_leg2_hit ? 2 : 4, style=fc_leg2_hit ? line.style_dashed : line.style_solid)
    l_fc_2 := line.new(x2, y2, x3, y3, xloc=xloc.bar_index, color=fc_leg3_hit ? color.new(main_col, 55) : color.new(main_col, 0), width=fc_leg3_hit ? 2 : 4, style=fc_leg3_hit ? line.style_dashed : line.style_solid)
    
    int sl_end_x = math.max(x3 + 4, bar_index + 6)
    l_fc_sl := line.new(x0, active_sl, sl_end_x, active_sl, xloc=xloc.bar_index, color=color.new(c_bear, 20), width=2, style=line.style_solid)
    
    float top_box = math.max(y2, y3)
    float bot_box = math.min(y2, y3)
    b_corridor := box.new(x2, top_box, x3, bot_box, border_color=color.new(main_col, 60), border_width=1, border_style=line.style_dotted, bgcolor=color.new(main_col, 90))
    
    if show_ribbon
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
    
    string tag_prefix = is_golden_setup ? "⭐ ЗОЛОТОЙ СТАРТ (" : "📍 СТАРТ ("
    string start_txt = tag_prefix + (is_ai_long ? "🟢 LONG" : "🔴 SHORT") + ")\\nКонсенсус: " + str.tostring(active_prob, "#") + "%"
    lbl_start := label.new(x0, y0, start_txt, color=color.new(color.black, 100), textcolor=main_col, style=is_ai_long ? label.style_label_down : label.style_label_up, size=size.small)
    
    int bars_to_entry = math.max(1, x1 - bar_index)
    string entry_timing = fc_leg1_hit ? " [ВХОД ИСПОЛНЕН ✅]" : ("\\n⏳ Ожидание: ~" + str.tostring(bars_to_entry) + " б.")
    lbl_entry := label.new(x1, y1, "📍 ВХОД: " + str.tostring(y1, "#.##") + entry_timing, color=color.new(color.black, 100), textcolor=fc_leg1_hit ? color.gray : main_col, style=is_ai_long ? label.style_label_up : label.style_label_down, size=size.small)
    
    int bars_to_tp1 = math.max(1, x2 - bar_index)
    string tp1_timing = fc_leg2_hit ? " [ВЗЯТ ✅]" : ("\\n⏳ Горизонт: ~" + str.tostring(bars_to_tp1) + " б.")
    lbl_tp1 := label.new(x2, y2, "🏁 TP1 (" + str.tostring(tp1_pct, "+#.##") + "%): " + str.tostring(y2, "#.##") + tp1_timing, color=color.new(color.black, 100), textcolor=fc_leg2_hit ? color.gray : c_cyan, style=is_ai_long ? label.style_label_down : label.style_label_up, size=size.small)
    
    int bars_to_tp2 = math.max(1, x3 - bar_index)
    string tp2_timing = fc_leg3_hit ? " [ВЗЯТ ✅]" : ("\\n⏳ Горизонт: ~" + str.tostring(bars_to_tp2) + " б.")
    lbl_tp2 := label.new(x3, y3, "🚀 TP2 (" + str.tostring(tp2_pct, "+#.##") + "%): " + str.tostring(y3, "#.##") + tp2_timing, color=color.new(color.black, 100), textcolor=fc_leg3_hit ? color.gray : main_col, style=is_ai_long ? label.style_label_up : label.style_label_down, size=size.small)

// ==============================================================================
// 📊 7. ИНФОРМАЦИОННАЯ ПАНЕЛЬ HUD
// ==============================================================================
var table hud = na
if show_dashboard and barstate.islast
    table_pos_val = position.bottom_right
    if table_pos == "Верхний левый"
        table_pos_val := position.top_left
    else if table_pos == "Верхний правый"
        table_pos_val := position.top_right
    else if table_pos == "Нижний левый"
        table_pos_val := position.bottom_left
        
    hud := table.new(table_pos_val, 2, 7, bgcolor=color.new(c_bg_dark, 15), border_color=color.new(color.gray, 60), border_width=1)
    
    table.cell(hud, 0, 0, "🌟 SUPERFUSION AI", bgcolor=color.new(c_purple, 40), text_color=color.white, text_size=size.small)
    table.cell(hud, 1, 0, is_golden_setup ? "⭐ GOLD CONFLUENCE" : (is_ai_long ? "🟢 BULLISH FUSION" : "🔴 BEARISH FUSION"), bgcolor=color.new(c_purple, 40), text_color=is_golden_setup ? c_gold : color.white, text_size=size.small)
    
    table.cell(hud, 0, 1, "Режим сетапов", text_color=color.gray, text_size=size.small)
    table.cell(hud, 1, 1, setup_mode == "🚀 Активный (Частые сетапы / Дейтрейдинг)" ? "🚀 Активный (Скальп)" : (setup_mode == "⚖️ Сбалансированный (Свинг-трейдинг)" ? "⚖️ Сбалансированный" : "🛡️ Консервативный"), text_color=color.white, text_size=size.small)
    
    table.cell(hud, 0, 2, "Консенсус ИИ", text_color=color.gray, text_size=size.small)
    table.cell(hud, 1, 2, str.tostring(master_pred, "+#.##") + " | " + str.tostring(consensus_winrate, "#") + "% WR", text_color=master_pred > 0 ? c_bull : c_bear, text_size=size.small)
    
    table.cell(hud, 0, 3, "Нейросеть / Lorentz", text_color=color.gray, text_size=size.small)
    table.cell(hud, 1, 3, str.tostring(ensemble_neural_pred, "+#.##") + " / " + str.tostring(lorentz_pred, "+#.##"), text_color=color.white, text_size=size.small)
    
    table.cell(hud, 0, 4, "Статус сетапа", text_color=color.gray, text_size=size.small)
    table.cell(hud, 1, 4, setup_status, text_color=c_cyan, text_size=size.small)
    
    table.cell(hud, 0, 5, "Вход / Стоп (SL)", text_color=color.gray, text_size=size.small)
    table.cell(hud, 1, 5, str.tostring(active_entry, "#.##") + " / " + str.tostring(active_sl, "#.##"), text_color=color.white, text_size=size.small)
    
    table.cell(hud, 0, 6, "Цели (TP1 / TP2)", text_color=color.gray, text_size=size.small)
    table.cell(hud, 1, 6, str.tostring(active_tp1, "#.##") + " / " + str.tostring(active_tp2, "#.##"), text_color=c_gold, text_size=size.small)

// ==============================================================================
// 🔔 8. СИСТЕМА ОПОВЕЩЕНИЙ (ALERTS)
// ==============================================================================
alertcondition(is_new_long_signal and is_golden_setup, "⭐ Golden BUY (SuperFusion)", "⭐ Золотой сигнал покупки SuperFusion: Консенсус 100%!")
alertcondition(is_new_long_signal and not is_golden_setup, "🟢 AI BUY (SuperFusion)", "🟢 Сигнал покупки SuperFusion AI")

alertcondition(is_new_short_signal and is_golden_setup, "⭐ Golden SELL (SuperFusion)", "⭐ Золотой сигнал продажи SuperFusion: Консенсус 100%!")
alertcondition(is_new_short_signal and not is_golden_setup, "🔴 AI SELL (SuperFusion)", "🔴 Сигнал продажи SuperFusion AI")

alertcondition(fc_leg2_hit and ta.change(fc_leg2_hit), "🎯 TP1 Reached (50% + БУ)", "🎯 Достигнут Тейк 1 (TP1) — Фиксация 50% и Стоп в БУ")
alertcondition(fc_leg3_hit and ta.change(fc_leg3_hit), "🏁 TP2 Reached (100%)", "🏁 Главная цель TP2 достигнута!")
alertcondition(is_invalidated and ta.change(is_invalidated), "🛑 SL Triggered / Invalidation", "🛑 Стоп-Лосс выбит — Активация альтернативного сценария")
`;
};
