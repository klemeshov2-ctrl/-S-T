import { IndicatorSettings } from "../types";

/**
 * ГЕНЕРАТОР ВЫДЕЛЕННОГО ИНДИКАТОРА BINANCE MACD (ОТДЕЛЬНАЯ СТРОКА ПОД ГРАФИКОМ)
 * Точное воспроизведение мобильного и Pro-терминала Binance:
 * - Строка заголовка: MACD(12, 26, 9) DIF DEA MACD
 * - Нулевая линия 0.00
 * - Столбцы выше 0 и ниже 0: ЗЕЛЕНЫЕ (при росте hist >= hist[1]) и КРАСНЫЕ (при спаде hist < hist[1])
 * - Линия DIF (желтая #facc15) и DEA (розовая #ec4899)
 */
export const generateBinanceMacdScript = (s: IndicatorSettings): string => {
  const isMobile = s.mobileOptimized;
  return `//@version=6
indicator("Binance MACD Pro (DIF / DEA / Столбцы Выше и Ниже 0)", "MACD (12,26,9)", overlay=false)

// ==========================================================
// ⚙️ НАСТРОЙКИ MACD (BINANCE PRO СТАНДАРТ)
// ==========================================================
gp_macd      = "⚙️ Параметры MACD"
fast_len     = input.int(12, "Быстрый период EMA (DIF)", minval=1, group=gp_macd)
slow_len     = input.int(26, "Медленный период EMA", minval=1, group=gp_macd)
sig_len      = input.int(9, "Сигнальный период EMA (DEA)", minval=1, group=gp_macd)
src          = input.source(close, "Источник цены", group=gp_macd)

gp_style     = "🎨 Цвета и Оформление Binance"
col_dif      = input.color(#facc15, "DIF Быстрая линия (Желтая)", group=gp_style)
col_dea      = input.color(#ec4899, "DEA Сигнальная линия (Розовая)", group=gp_style)
col_grow_up  = input.color(#0ecb81, "Бычий рост выше 0 (Ярко-зеленый)", group=gp_style)
col_fall_up  = input.color(#f6465d, "Бычий спад выше 0 (Красный Binance)", group=gp_style)
col_grow_dn  = input.color(#0ecb81, "Медвежье восстановление ниже 0 (Зеленый Binance)", group=gp_style)
col_fall_dn  = input.color(#f6465d, "Медвежий спад ниже 0 (Ярко-красный)", group=gp_style)

show_table_val = input.bool(${isMobile ? "false" : "true"}, "Отображать плавающую строку подписи значений", group=gp_style)

// ==========================================================
// 📐 РАСЧЕТ ИНДИКАТОРА MACD
// ==========================================================
fast_ma  = ta.ema(src, fast_len)
slow_ma  = ta.ema(src, slow_len)
dif_line = fast_ma - slow_ma
dea_line = ta.ema(dif_line, sig_len)
macd_hist = dif_line - dea_line

// Определение цвета гистограммы в точности как на скриншоте Binance:
// Выше 0: зеленый если растет, КРАСНЫЙ если падает
// Ниже 0: ЗЕЛЕНЫЙ если растет к нулю, красный если падает дальше вниз
bool is_growing = macd_hist >= macd_hist[1]
color hist_color = macd_hist >= 0 ? 
     (is_growing ? col_grow_up : col_fall_up) : 
     (is_growing ? col_grow_dn : col_fall_dn)

// ==========================================================
// 📊 ОТРИСОВКА НА ПАНЕЛИ
// ==========================================================
// Столбцы гистограммы от нуля (красные и зеленые выше 0 и ниже 0)
plot(macd_hist, "MACD Столбцы", color=hist_color, style=plot.style_columns, linewidth=1)

// Нулевая горизонтальная линия
hline(0.0, "MACD Нулевая Линия", color=color.new(color.gray, 60), linestyle=hline.style_dotted)

// Линии DIF и DEA
plot(dif_line, "DIF (12)", color=col_dif, linewidth=2)
plot(dea_line, "DEA (26, 9)", color=col_dea, linewidth=2)

// ==========================================================
// 🏷️ СТРОКА ПОДПИСИ ВЕРХНЕГО СТАТУСА (КАК НА BINANCE)
// ==========================================================
var table info_tbl = table.new(position.top_left, columns=4, rows=1, bgcolor=color.new(color.black, 100), border_color=color.new(color.black, 100))
if barstate.islast and show_table_val
    table.cell(info_tbl, 0, 0, "MACD(" + str.tostring(fast_len) + "," + str.tostring(slow_len) + "," + str.tostring(sig_len) + ")", text_color=#94a3b8, text_size=size.small)
    table.cell(info_tbl, 1, 0, "DIF: " + str.tostring(dif_line, "#.##"), text_color=col_dif, text_size=size.small)
    table.cell(info_tbl, 2, 0, "DEA: " + str.tostring(dea_line, "#.##"), text_color=col_dea, text_size=size.small)
    table.cell(info_tbl, 3, 0, "MACD: " + str.tostring(macd_hist, "#.##"), text_color=hist_color, text_size=size.small)

// ==========================================================
// 🔔 СИГНАЛЬНЫЕ АЛЕРТЫ
// ==========================================================
macd_bull_cross = ta.crossover(dif_line, dea_line)
macd_bear_cross = ta.crossunder(dif_line, dea_line)
alertcondition(macd_bull_cross, "MACD Бычий крест (DIF выше DEA)", "Binance MACD: Золотой крест покупок на {{ticker}}!")
alertcondition(macd_bear_cross, "MACD Медвежий крест (DIF ниже DEA)", "Binance MACD: Смертельный крест фиксации на {{ticker}}!")
`;
};

/**
 * ГЕНЕРАТОР ВЫДЕЛЕННОГО ИНДИКАТОРА BINANCE RSI (ОТДЕЛЬНАЯ СТРОКА ПОД ГРАФИКОМ)
 * Точное воспроизведение мобильного и Pro-терминала Binance:
 * - Строка заголовка: RSI(6, 14) RSI6 RSI14
 * - Быстрая кривая RSI 6 (желтая #facc15)
 * - Стандартная кривая RSI 14 (пурпурная #a855f7)
 * - Уровни 80 (перекупленность), 50 (баланс), 20 (перепроданность) с заливкой
 */
export const generateBinanceRsiScript = (s: IndicatorSettings): string => {
  const isMobile = s.mobileOptimized;
  return `//@version=6
indicator("Binance RSI Pro (Линии 6 и 14 + Уровни 80/50/20)", "RSI (6,14)", overlay=false)

// ==========================================================
// ⚙️ НАСТРОЙКИ RSI (BINANCE ДВОЙНАЯ КРИВАЯ)
// ==========================================================
gp_rsi       = "⚙️ Периоды RSI"
len_fast     = input.int(6, "Быстрый период RSI (6 Binance)", minval=1, group=gp_rsi)
len_slow     = input.int(14, "Стандартный период RSI (14 Binance)", minval=1, group=gp_rsi)
src          = input.source(close, "Источник цены", group=gp_rsi)

gp_levels    = "🎯 Уровни Диапазона Binance"
lvl_ob       = input.float(80.0, "Уровень Перекупленности (80)", minval=50.0, maxval=100.0, group=gp_levels)
lvl_mid      = input.float(50.0, "Нейтральный баланс (50)", minval=30.0, maxval=70.0, group=gp_levels)
lvl_os       = input.float(20.0, "Уровень Перепроданности (20)", minval=0.0, maxval=50.0, group=gp_levels)

gp_style     = "🎨 Цвета Binance"
col_rsi6     = input.color(#facc15, "RSI 6 Быстрая кривая (Желтая)", group=gp_style)
col_rsi14    = input.color(#a855f7, "RSI 14 Стандартная кривая (Пурпурная)", group=gp_style)
col_band     = input.color(color.new(#6366f1, 92), "Цвет заливки зоны 20-80", group=gp_style)

show_table_val = input.bool(${isMobile ? "false" : "true"}, "Отображать плавающую строку подписи значений", group=gp_style)

// ==========================================================
// 📐 РАСЧЕТ RSI
// ==========================================================
rsi6_val  = ta.rsi(src, len_fast)
rsi14_val = ta.rsi(src, len_slow)

// ==========================================================
// 📊 ГОРИЗОНТАЛЬНЫЕ УРОВНИ И ДИАПАЗОН
// ==========================================================
h_ob  = hline(lvl_ob, "RSI 80 Перекупленность", color=color.new(#ef4444, 40), linestyle=hline.style_dashed)
h_mid = hline(lvl_mid, "RSI 50 Нейтральный Баланс", color=color.new(color.gray, 60), linestyle=hline.style_dotted)
h_os  = hline(lvl_os, "RSI 20 Перепроданность", color=color.new(#22c55e, 40), linestyle=hline.style_dashed)
fill(h_ob, h_os, color=col_band, title="Зона диапазона RSI")

// ==========================================================
// 📈 КРИВЫЕ RSI
// ==========================================================
plot(rsi6_val, "RSI 6 Быстрый (Желтый)", color=col_rsi6, linewidth=2)
plot(rsi14_val, "RSI 14 Стандартный (Пурпурный)", color=col_rsi14, linewidth=2)

// ==========================================================
// 🏷️ СТРОКА ПОДПИСИ ВЕРХНЕГО СТАТУСА (КАК НА BINANCE)
// ==========================================================
var table info_tbl = table.new(position.top_left, columns=3, rows=1, bgcolor=color.new(color.black, 100), border_color=color.new(color.black, 100))
if barstate.islast and show_table_val
    table.cell(info_tbl, 0, 0, "RSI(" + str.tostring(len_fast) + "," + str.tostring(len_slow) + ")", text_color=#94a3b8, text_size=size.small)
    table.cell(info_tbl, 1, 0, "RSI(" + str.tostring(len_fast) + "): " + str.tostring(rsi6_val, "#.#"), text_color=col_rsi6, text_size=size.small)
    table.cell(info_tbl, 2, 0, "RSI(" + str.tostring(len_slow) + "): " + str.tostring(rsi14_val, "#.#"), text_color=col_rsi14, text_size=size.small)

// ==========================================================
// 🔔 СИГНАЛЬНЫЕ АЛЕРТЫ
// ==========================================================
alertcondition(rsi6_val <= lvl_os or rsi14_val <= lvl_os, "RSI Перепроданность (<20)", "Binance RSI: Зона сильной перепроданности на {{ticker}}!")
alertcondition(rsi6_val >= lvl_ob or rsi14_val >= lvl_ob, "RSI Перекупленность (>80)", "Binance RSI: Зона сильной перекупленности на {{ticker}}!")
`;
};

/**
 * ГЕНЕРАТОР ОБЪЕДИНЕННОГО ИНДИКАТОРА BINANCE DUO (ОДИН КОД: RSI СВЕРХУ, MACD СНИЗУ)
 * В один код (один индикатор):
 * - ВЕРХНЯЯ ЧАСТЬ (ВЫШЕ): RSI 6 и 14 + Уровни 80, 50, 20 с заливкой диапазона
 * - РАЗДЕЛИТЕЛЬНАЯ ЛИНИЯ 100.0 между индикаторами
 * - НИЖНЯЯ ЧАСТЬ (НИЖЕ): MACD столбцы выше и ниже 0 (зеленые и красные) + DIF + DEA
 * Идеально без наложений в одном скрипте TradingView!
 */
export const generateBinanceDuoScript = (s: IndicatorSettings): string => {
  const isMobile = s.mobileOptimized;
  return `//@version=6
indicator("Binance Duo: RSI (Выше) + MACD (Ниже) [S&T Pro]", "RSI + MACD", overlay=false)

// ==========================================================
// ⚙️ НАСТРОЙКИ RSI (ВЕРХНЯЯ СТРОКА)
// ==========================================================
gp_rsi       = "📈 Параметры RSI (Сверху)"
rsi_len_fast = input.int(6, "Быстрый RSI (6 Binance)", minval=1, group=gp_rsi)
rsi_len_slow = input.int(14, "Стандартный RSI (14 Binance)", minval=1, group=gp_rsi)
col_rsi6     = input.color(#facc15, "RSI 6 (Желтый)", group=gp_rsi)
col_rsi14    = input.color(#a855f7, "RSI 14 (Пурпурный)", group=gp_rsi)

// ==========================================================
// ⚙️ НАСТРОЙКИ MACD (НИЖНЯЯ СТРОКА)
// ==========================================================
gp_macd      = "📊 Параметры MACD (Снизу)"
macd_fast    = input.int(12, "Быстрый период EMA", minval=1, group=gp_macd)
macd_slow    = input.int(26, "Медленный период EMA", minval=1, group=gp_macd)
macd_sig     = input.int(9, "Сигнальный период (DEA)", minval=1, group=gp_macd)
col_dif      = input.color(#facc15, "DIF Быстрая (Желтая)", group=gp_macd)
col_dea      = input.color(#ec4899, "DEA Сигнальная (Розовая)", group=gp_macd)
col_grow     = input.color(#0ecb81, "Рост столбца (Зеленый)", group=gp_macd)
col_fall     = input.color(#f6465d, "Спад столбца (Красный)", group=gp_macd)

src          = input.source(close, "Источник цены для расчетов")
show_table   = input.bool(${isMobile ? "false" : "true"}, "Отображать верхнюю статусную строку со значениями")

// ==========================================================
// 📐 1. РАСЧЕТ RSI (ОТРИСОВКА В ВЕРХНЕЙ ЧАСТИ 100..200)
// ==========================================================
rsi6_val  = ta.rsi(src, rsi_len_fast)
rsi14_val = ta.rsi(src, rsi_len_slow)

// Смещение диапазона RSI в верхнюю зону (100.0..200.0)
float rsi_base = 100.0
float plot_rsi6  = rsi_base + rsi6_val
float plot_rsi14 = rsi_base + rsi14_val

// Уровни RSI в верхнем диапазоне
h_rsi80 = hline(180.0, "RSI 80 (Перекупленность)", color=color.new(#ef4444, 40), linestyle=hline.style_dashed)
h_rsi50 = hline(150.0, "RSI 50 (Нейтральный Баланс)", color=color.new(color.gray, 60), linestyle=hline.style_dotted)
h_rsi20 = hline(120.0, "RSI 20 (Перепроданность)", color=color.new(#22c55e, 40), linestyle=hline.style_dashed)
fill(h_rsi80, h_rsi20, color=color.new(#6366f1, 92), title="Зона диапазона RSI")

plot(plot_rsi6, "RSI 6 Быстрый (Желтый)", color=col_rsi6, linewidth=2)
plot(plot_rsi14, "RSI 14 Стандартный (Пурпурный)", color=col_rsi14, linewidth=2)

// ==========================================================
// ➖ РАЗДЕЛИТЕЛЬНАЯ ЛИНИЯ МЕЖДУ RSI (СВЕРХУ) И MACD (СНИЗУ)
// ==========================================================
hline(100.0, "Разделитель (RSI Сверху / MACD Снизу)", color=color.new(#475569, 30), linestyle=hline.style_solid)

// ==========================================================
// 📐 2. РАСЧЕТ MACD (ОТРИСОВКА В НИЖНЕЙ ЧАСТИ 0..100 С ЦЕНТРОМ 50.0)
// ==========================================================
fast_ma   = ta.ema(src, macd_fast)
slow_ma   = ta.ema(src, macd_slow)
dif_line  = fast_ma - slow_ma
dea_line  = ta.ema(dif_line, macd_sig)
macd_hist = dif_line - dea_line

// Адаптивное нормирование диапазона колебаний MACD в пределы [10.0 .. 90.0] вокруг нулевой базы 50.0
float macd_norm_max = ta.highest(math.max(math.abs(dif_line), math.max(math.abs(dea_line), math.abs(macd_hist))), 100)
float macd_mult     = not na(macd_norm_max) and macd_norm_max > 0.00001 ? (38.0 / macd_norm_max) : 1.0

float macd_zero_base = 50.0
float plot_macd_col  = macd_zero_base + (macd_hist * macd_mult)
float plot_macd_dif  = macd_zero_base + (dif_line * macd_mult)
float plot_macd_dea  = macd_zero_base + (dea_line * macd_mult)

// Определение цвета гистограммы (Binance: зеленый при росте, красный при спаде выше и ниже нуля)
bool hist_is_growing = macd_hist >= macd_hist[1]
color hist_color = hist_is_growing ? col_grow : col_fall

// Нулевая горизонтальная линия MACD на уровне 50.0
hline(50.0, "MACD Нулевая Линия 0.0", color=color.new(color.gray, 60), linestyle=hline.style_dashed)

// Столбцы MACD с точкой отсчета histbase=50.0 (растут вверх и вниз от центра)
plot(plot_macd_col, "MACD Столбцы (Binance)", color=hist_color, style=plot.style_columns, histbase=50.0)
plot(plot_macd_dif, "MACD DIF Быстрая (Желтая)", color=col_dif, linewidth=2)
plot(plot_macd_dea, "MACD DEA Сигнальная (Розовая)", color=col_dea, linewidth=2)

// ==========================================================
// 🏷️ ВЕРХНЯЯ СТАТУСНАЯ СТРОКА СО ЗНАЧЕНИЯМИ ОБОИХ ИНДИКАТОРОВ
// ==========================================================
var table info_tbl = table.new(position.top_left, columns=7, rows=1, bgcolor=color.new(color.black, 100), border_color=color.new(color.black, 100))
if barstate.islast and show_table
    table.cell(info_tbl, 0, 0, "RSI(" + str.tostring(rsi_len_fast) + "," + str.tostring(rsi_len_slow) + "):", text_color=#94a3b8, text_size=size.small)
    table.cell(info_tbl, 1, 0, "RSI6 " + str.tostring(rsi6_val, "#.#"), text_color=col_rsi6, text_size=size.small)
    table.cell(info_tbl, 2, 0, "RSI14 " + str.tostring(rsi14_val, "#.#"), text_color=col_rsi14, text_size=size.small)
    table.cell(info_tbl, 3, 0, " | MACD(" + str.tostring(macd_fast) + "," + str.tostring(macd_slow) + "," + str.tostring(macd_sig) + "):", text_color=#94a3b8, text_size=size.small)
    table.cell(info_tbl, 4, 0, "DIF " + str.tostring(dif_line, "#.##"), text_color=col_dif, text_size=size.small)
    table.cell(info_tbl, 5, 0, "DEA " + str.tostring(dea_line, "#.##"), text_color=col_dea, text_size=size.small)
    table.cell(info_tbl, 6, 0, "MACD " + str.tostring(macd_hist, "#.##"), text_color=hist_color, text_size=size.small)

// ==========================================================
// 🔔 СИГНАЛЬНЫЕ АЛЕРТЫ
// ==========================================================
macd_bull = ta.crossover(dif_line, dea_line)
macd_bear = ta.crossunder(dif_line, dea_line)
rsi_os    = rsi6_val <= 20.0 or rsi14_val <= 20.0
rsi_ob    = rsi6_val >= 80.0 or rsi14_val >= 80.0

alertcondition(macd_bull and rsi_os, "STRONG BUY: MACD Бычий + RSI Перепроданность", "Binance Duo: Мощный сигнал на покупку на {{ticker}}!")
alertcondition(macd_bear and rsi_ob, "STRONG SELL: MACD Медвежий + RSI Перекупленность", "Binance Duo: Мощный сигнал на продажу на {{ticker}}!")
`;
};
