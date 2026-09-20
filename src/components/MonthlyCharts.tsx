import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Award, 
  AlertCircle, 
  CheckCircle2, 
  Sliders, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle,
  Flame,
  PiggyBank,
  X,
  Layers,
  ListFilter,
  Pencil,
  Trash2,
  ArrowRightLeft,
  Check
} from 'lucide-react';
import { BudgetConfig, DailyExpense } from '../types';
import { 
  formatCurrency, 
  getMonthlyDailyChartData, 
  getCategorySummaries, 
  getTotalFixedExpenses,
  getFixedExpenseAmount,
  getSavingsGoalAmount,
  getExpenseTypesChartData,
  getCategoryLimitStatuses,
  CATEGORY_COLORS
} from '../utils/calculations';
import { CategoryLimitsModal } from './CategoryLimitsModal';

interface MonthlyChartsProps {
  config: BudgetConfig;
  expenses: DailyExpense[];
  currentMonth: string;
  onUpdateCategoryLimit?: (category: string, maxPercentage: number) => void;
  onUpdateAllCategoryLimits?: (limits: Record<string, number>) => void;
  onConvertFixedToVariable?: (fixedExpenseId: string) => void;
  onConvertVariableToFixed?: (expenseId: string) => void;
  onEditExpense?: (expense: DailyExpense) => void;
  onDeleteFixedExpense?: (fixedExpenseId: string) => void;
}

export const MonthlyCharts: React.FC<MonthlyChartsProps> = ({
  config,
  expenses,
  currentMonth,
  onUpdateCategoryLimit,
  onUpdateAllCategoryLimits,
  onConvertFixedToVariable,
  onConvertVariableToFixed,
  onEditExpense,
  onDeleteFixedExpense,
}) => {
  const [activeTab, setActiveTab] = useState<'types' | 'evolution' | 'distribution' | 'categories'>('types');
  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);
  const [isFixedDetailsModalOpen, setIsFixedDetailsModalOpen] = useState(false);
  const [selectedCategoryForModal, setSelectedCategoryForModal] = useState<string | null>(null);
  const [lastFixedClickTime, setLastFixedClickTime] = useState<number>(0);

  // Daily evolution points
  const chartPoints = getMonthlyDailyChartData(config, expenses, currentMonth);
  const categorySummaries = getCategorySummaries(expenses, currentMonth);

  // Expense Types & Traffic-Light Limits calculation
  const expenseTypesData = getExpenseTypesChartData(config, expenses, currentMonth);
  const categoryStatuses = getCategoryLimitStatuses(config, expenses, currentMonth);

  const salary = Number(config.salary) || 0;
  const savings = getSavingsGoalAmount(config);
  const totalFixed = getTotalFixedExpenses(config.fixedExpenses, salary);

  const totalDailySpent = expenses
    .filter(e => e.date.startsWith(currentMonth))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const initialMonthlyDisposable = Math.max(0, salary - totalFixed - savings);
  const remainingBuffer = Math.max(0, initialMonthlyDisposable - totalDailySpent);

  // Traditional distribution data
  const distributionData = [
    { name: 'Gastos Fijos', value: totalFixed, color: '#8B5CF6' },
    { name: 'Ahorro Protegido', value: savings, color: '#10B981' },
    { name: 'Gastos Diarios', value: totalDailySpent, color: '#F59E0B' },
    { name: 'Remanente Libre', value: remainingBuffer, color: '#06B6D4' },
  ].filter(item => item.value > 0);

  // Days in green vs red for evolution
  const activeDays = chartPoints.filter(p => p.spent > 0);
  const daysInGreen = activeDays.filter(p => p.spent <= p.allowance).length;
  const daysInRed = activeDays.filter(p => p.spent > p.allowance).length;
  const maxDay = activeDays.reduce((prev, current) => (prev.spent > current.spent ? prev : current), { day: 0, spent: 0 });
  const avgSpentPerActiveDay = activeDays.length > 0 ? Math.round(totalDailySpent / activeDays.length) : 0;

  const handleInlineLimitChange = (category: string, newPct: number) => {
    const validPct = Math.max(1, Math.min(100, Math.round(newPct)));
    if (onUpdateCategoryLimit) {
      onUpdateCategoryLimit(category, validPct);
    }
  };

  return (
    <div id="monthly-charts-panel" className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-sm">
      
      {/* Header & Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              Progreso Financiero del Mes
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Analítica de gastos por tipo, límites máximos permitidos (Semáforo) y evolución diaria
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex flex-wrap items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-medium">
          <button
            id="tab-chart-types"
            onClick={() => setActiveTab('types')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'types' 
                ? 'bg-emerald-600 text-white font-semibold shadow-xs' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <PieChartIcon className="w-3.5 h-3.5" />
            <span>Tipos de Gasto & Semáforo</span>
          </button>

          <button
            id="tab-chart-evolution"
            onClick={() => setActiveTab('evolution')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'evolution' 
                ? 'bg-emerald-600 text-white font-semibold shadow-xs' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Evolución Diaria
          </button>

          <button
            id="tab-chart-distribution"
            onClick={() => setActiveTab('distribution')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'distribution' 
                ? 'bg-emerald-600 text-white font-semibold shadow-xs' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Distribución Total
          </button>

          <button
            id="tab-chart-categories"
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'categories' 
                ? 'bg-emerald-600 text-white font-semibold shadow-xs' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Por Categorías
          </button>
        </div>
      </div>

      {/* TAB 1: TIPOS DE GASTO Y SEMÁFORO DE LÍMITES */}
      {activeTab === 'types' && (
        <div className="mt-5 space-y-6">
          {/* Top KPI Badges */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Dentro de Límite</span>
                </div>
                <div className="text-xl font-bold text-white mt-1">
                  {expenseTypesData.greenCount} <span className="text-xs font-normal text-slate-400">rubros</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">&lt;80% del tope permitido</p>
              </div>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 shrink-0"></span>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Alerta Preventiva</span>
                </div>
                <div className="text-xl font-bold text-white mt-1">
                  {expenseTypesData.yellowCount} <span className="text-xs font-normal text-slate-400">rubros</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">80% a 99% del tope</p>
              </div>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 shrink-0"></span>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Límite Superado</span>
                </div>
                <div className="text-xl font-bold text-white mt-1">
                  {expenseTypesData.redCount} <span className="text-xs font-normal text-slate-400">rubros</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">≥100% alcanzado</p>
              </div>
              <span className="w-3 h-3 rounded-full bg-rose-500/80 shrink-0"></span>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-3 border border-cyan-500/30 bg-cyan-950/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-medium">
                  <PiggyBank className="w-3.5 h-3.5" />
                  <span>Ahorro Extra</span>
                </div>
                <div className="text-xl font-bold text-cyan-300 mt-1">
                  {expenseTypesData.realSavingsPercent.toFixed(1)}%
                </div>
                <p className="text-[10px] text-cyan-200/80 mt-0.5">
                  {formatCurrency(expenseTypesData.realSavings, config.currency)} sin gastar
                </p>
              </div>
              <span className="w-3 h-3 rounded-full bg-cyan-400 shrink-0 shadow-sm shadow-cyan-400/50"></span>
            </div>
          </div>

          {/* Chart Section & Legend */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-slate-800/40 p-4 sm:p-6 rounded-2xl border border-slate-700/60">
            {/* Donut Chart with Centered Metric */}
            <div className="lg:col-span-6 flex flex-col items-center">
              <div className="relative w-full h-64 sm:h-72 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseTypesData.slices}
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      onClick={(data: any) => {
                        const isFixed = data && (data.category === 'Gastos Fijos' || data.name === 'Gastos Fijos Comprometidos');
                        if (isFixed) {
                          const now = Date.now();
                          // Double click within 500ms or single click to open
                          if (now - lastFixedClickTime < 500) {
                            setIsFixedDetailsModalOpen(true);
                          }
                          setLastFixedClickTime(now);
                        }
                      }}
                      onDoubleClick={(data) => {
                        const isFixed = data && (data.category === 'Gastos Fijos' || data.name === 'Gastos Fijos Comprometidos');
                        if (isFixed) {
                          setIsFixedDetailsModalOpen(true);
                        }
                      }}
                      label={({ name, percent }) => {
                        const pctVal = Math.round((percent || 0) * 100);
                        if (pctVal < 3) return '';
                        // Short name if too long
                        const shortName = name.length > 12 ? name.substring(0, 10) + '..' : name;
                        return `${shortName}: ${pctVal}%`;
                      }}
                      labelLine={false}
                    >
                      {expenseTypesData.slices.map((entry, index) => {
                        const isFixedSlice = entry.category === 'Gastos Fijos' || entry.name === 'Gastos Fijos Comprometidos';
                        return (
                          <Cell 
                            key={`slice-${index}`} 
                            fill={entry.color} 
                            style={{ cursor: isFixedSlice ? 'pointer' : 'default' }}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          const isSavings = item.status === 'savings';
                          const isFixed = item.category === 'Gastos Fijos' || item.name === 'Gastos Fijos Comprometidos';
                          return (
                            <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1 z-50">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="font-bold text-white text-sm">{item.name}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-300">
                                <span>Monto:</span>
                                <strong className="text-white">{formatCurrency(item.value, config.currency)}</strong>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-400">
                                <span>Porcentaje del sueldo:</span>
                                <strong>{item.percentageOfSalary.toFixed(1)}%</strong>
                              </div>
                              {isFixed && (
                                <div className="mt-2 pt-1 border-t border-purple-500/40 text-purple-300 text-[11px] font-bold flex items-center gap-1">
                                  <span>👉 Doble clic para desplegar lista detallada</span>
                                </div>
                              )}
                              {!isSavings && !isFixed && item.maxPercentage && (
                                <>
                                  <div className="flex justify-between gap-4 text-slate-400">
                                    <span>Tope permitido:</span>
                                    <strong>{item.maxPercentage}% ({formatCurrency(item.maxAllowedAmount, config.currency)})</strong>
                                  </div>
                                  <div className="flex justify-between gap-4 text-slate-400">
                                    <span>Consumido del límite:</span>
                                    <strong className={
                                      item.usagePercent >= 100 ? 'text-rose-400' :
                                      item.usagePercent >= 80 ? 'text-amber-400' : 'text-emerald-400'
                                    }>
                                      {Math.round(item.usagePercent)}%
                                    </strong>
                                  </div>
                                </>
                              )}
                              <div className="pt-1.5 border-t border-slate-800 text-[11px] font-semibold" style={{ color: item.color }}>
                                {item.statusLabel}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Donut Center Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                    Ahorro Extra
                  </span>
                  <span className="text-2xl font-black text-white">
                    {expenseTypesData.realSavingsPercent.toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-slate-400 max-w-[100px] truncate">
                    {formatCurrency(expenseTypesData.realSavings, config.currency)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1 mt-1 text-center">
                <span className="text-[11px] text-slate-400">
                  La porción celeste de Ahorro Extra cambia dinámicamente con cada gasto que cargas
                </span>
                <button
                  type="button"
                  onClick={() => setIsFixedDetailsModalOpen(true)}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold underline flex items-center gap-1 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Ver lista detallada de Gastos Fijos (doble clic en porción violeta)</span>
                </button>
              </div>
            </div>

            {/* Radar Legend & Action */}
            <div className="lg:col-span-6 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white">Reglas del Semáforo de Gastos</h4>
                  <button
                    type="button"
                    onClick={() => setIsLimitsModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Editar % Máximos</span>
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Cada rubro cambia de color automáticamente en el gráfico según qué porcentaje de su límite hayas consumido:
                </p>
              </div>

              {/* Legend Badges */}
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-200">Verde: Dentro de lo permitido</span>
                      <p className="text-[11px] text-slate-400">Gastado menos del 80% del límite asignado</p>
                    </div>
                  </div>
                  <span className="text-emerald-400 font-bold font-mono">&lt; 80%</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-200">Amarillo: Alerta preventiva</span>
                      <p className="text-[11px] text-slate-400">Has alcanzado el 80% o más del límite</p>
                    </div>
                  </div>
                  <span className="text-amber-400 font-bold font-mono">80% - 99%</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-200">Rojo: Límite Alcanzado o Superado</span>
                      <p className="text-[11px] text-slate-400">Has llegado al 100% de lo presupuestado para este rubro</p>
                    </div>
                  </div>
                  <span className="text-rose-400 font-bold font-mono">≥ 100%</span>
                </div>

                <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-cyan-400 shrink-0" />
                    <div>
                      <span className="font-semibold text-cyan-200">Celeste: Ahorro Extra</span>
                      <p className="text-[11px] text-cyan-300/80">Todo dinero no gastado del sueldo pasa a Ahorro Extra automáticamente</p>
                    </div>
                  </div>
                  <span className="text-cyan-300 font-bold font-mono">Sueldo Libre</span>
                </div>
              </div>
            </div>
          </div>

          {/* Category Cards with In-Place % Stepper */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Límites y Consumo por Tipo de Gasto</h4>
                <p className="text-xs text-slate-400">
                  Puedes afinar el % de cada gasto aquí mismo con los botones +/- o pulsando &quot;Editar % Máximos&quot;
                </p>
              </div>
            </div>

            {categoryStatuses.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-800/30 border border-dashed border-slate-700/60 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-300">
                  No hay consumos variables registrados este mes
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Solo se mostrarán las categorías donde cargues consumos reales. Si tienes un gasto en Gastos Fijos (como Tarjeta de Crédito o Streaming) y deseas controlarlo con límite de consumo, puedes destildarlo desde el detalle de Gastos Fijos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryStatuses.map((cat) => {
                  const isPrescindible = cat.category === 'Prescindibles';
                  const isCard = cat.category === 'Tarjeta de Crédito';
                  const isStreaming = cat.category === 'Ocio y Streaming';
                  const isOver = cat.usagePercent >= 100;
                  const isWarning = cat.usagePercent >= 80 && !isOver;

                  return (
                    <div 
                      key={cat.category}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isPrescindible 
                          ? 'bg-slate-800/90 border-rose-500/40 shadow-xs' 
                          : isCard 
                            ? 'bg-slate-800/90 border-purple-500/40 shadow-xs'
                            : isStreaming
                              ? 'bg-slate-800/90 border-pink-500/40 shadow-xs'
                              : 'bg-slate-800/50 border-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: CATEGORY_COLORS[cat.category] || '#64748B' }} 
                          />
                          <span className="text-xs font-bold text-white truncate">
                            {cat.category}
                          </span>
                          {isPrescindible && (
                            <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded-md font-semibold shrink-0">
                              Prescindibles
                            </span>
                          )}
                          {isCard && (
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded-md font-semibold shrink-0">
                              Tarjeta
                            </span>
                          )}
                          {isStreaming && (
                            <span className="text-[10px] bg-pink-500/20 text-pink-300 border border-pink-500/30 px-1.5 py-0.2 rounded-md font-semibold shrink-0">
                              Streaming
                            </span>
                          )}
                        </div>

                        {/* Status badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                          isOver 
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                            : isWarning 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          {isOver ? 'Rojo' : isWarning ? 'Amarillo' : 'Verde'} ({Math.round(cat.usagePercent)}%)
                        </span>
                      </div>

                      {/* Monetary and % details */}
                      <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                        <div>
                          <span className="font-bold text-white">{formatCurrency(cat.spent, config.currency)}</span>
                          <span className="text-slate-400 text-[11px] ml-1">
                            de {formatCurrency(cat.maxAllowedAmount, config.currency)}
                          </span>
                        </div>

                        {/* Stepper to adjust limit % on the fly */}
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded-lg">
                          <button
                            type="button"
                            onClick={() => handleInlineLimitChange(cat.category, cat.maxPercentage - 1)}
                            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs font-bold cursor-pointer"
                            title="Reducir 1%"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold text-emerald-400 font-mono min-w-[26px] text-center">
                            {cat.maxPercentage}%
                          </span>
                          <button
                            type="button"
                            onClick={() => handleInlineLimitChange(cat.category, cat.maxPercentage + 1)}
                            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs font-bold cursor-pointer"
                            title="Aumentar 1%"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar with 80% marker */}
                      <div className="relative w-full bg-slate-900 rounded-full h-2 overflow-hidden mb-2.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, cat.usagePercent)}%` }}
                        />
                      </div>

                      {/* Action to enter category and pass expenses to fixed */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-700/40">
                        <span className="text-[11px] text-slate-400">
                          {expenses.filter(e => e.category === cat.category && !e.isFixed && e.date.startsWith(currentMonth)).length} gasto(s)
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryForModal(cat.category)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-purple-950/60 text-purple-300 hover:text-purple-200 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          title="Ver los gastos de esta categoría y pasarlos a gasto fijo si lo deseas"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
                          <span>Ver y Pasar a Fijo</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EVOLUCIÓN DIARIA */}
      {activeTab === 'evolution' && (
        <div className="mt-5 space-y-4">
          {/* KPI Badges Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Días en Verde</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-100 mt-1">
                {daysInGreen} <span className="text-xs font-normal text-slate-400">días cumplidos</span>
              </div>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Días en Rojo</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-100 mt-1">
                {daysInRed} <span className="text-xs font-normal text-slate-400">días excedidos</span>
              </div>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
              <div className="flex items-center gap-1.5 text-xs text-blue-400 font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Promedio Diario</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-100 mt-1">
                {formatCurrency(avgSpentPerActiveDay, config.currency)}
              </div>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                <Award className="w-3.5 h-3.5" />
                <span>Pico de Gasto</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-100 mt-1">
                {maxDay.spent > 0 ? (
                  <span>{formatCurrency(maxDay.spent, config.currency)} <span className="text-[10px] text-slate-400 font-normal">Día {maxDay.day}</span></span>
                ) : '—'}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 px-1">
            <span>Gasto diario registrado vs Cuota diaria recomendada (Día 1 al 31)</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
                Bajo el límite
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block"></span>
                Superó el límite
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-blue-400 inline-block"></span>
                Límite diario
              </span>
            </div>
          </div>

          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="day" 
                  stroke="#64748B" 
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#64748B" 
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  tickFormatter={(val) => `${val >= 1000 ? Math.round(val / 1000) + 'k' : val}`}
                  tickLine={false}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const isOver = data.spent > data.allowance;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs">
                          <p className="font-bold text-slate-200 mb-1.5">Día {label} de {currentMonth}</p>
                          <p className="flex justify-between gap-3 text-slate-300">
                            <span>Gastado:</span>
                            <strong className={isOver ? 'text-rose-400' : 'text-emerald-400'}>
                              {formatCurrency(data.spent, config.currency)}
                            </strong>
                          </p>
                          <p className="flex justify-between gap-3 text-slate-400">
                            <span>Límite del día:</span>
                            <strong>{formatCurrency(data.allowance, config.currency)}</strong>
                          </p>
                          <p className="flex justify-between gap-3 text-slate-400 pt-1 border-t border-slate-800 mt-1">
                            <span>Acumulado mes:</span>
                            <span>{formatCurrency(data.accumulated, config.currency)}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="spent" name="Gastado">
                  {chartPoints.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.spent > entry.allowance ? '#EF4444' : '#10B981'} 
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </Bar>
                <Line 
                  type="monotone" 
                  dataKey="allowance" 
                  stroke="#60A5FA" 
                  strokeWidth={2} 
                  dot={false}
                  name="Límite Diario" 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TAB 3: DISTRIBUCIÓN TOTAL */}
      {activeTab === 'distribution' && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value), config.currency)}
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">Desglose del Sueldo Mensual</h4>
            {distributionData.map((item, idx) => {
              const percent = salary > 0 ? Math.round((item.value / salary) * 100) : 0;
              return (
                <div key={idx} className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-200 font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white mr-2">{formatCurrency(item.value, config.currency)}</span>
                    <span className="text-slate-400 font-mono text-[11px]">{percent}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: POR CATEGORÍAS */}
      {activeTab === 'categories' && (
        <div className="mt-5">
          {categorySummaries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No hay gastos diarios registrados para este mes todavía. Carga tu primer gasto para ver el desglose.
            </div>
          ) : (
            <div className="space-y-3">
              {categorySummaries.map((cat, idx) => (
                <div key={idx} className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                  <div className="flex justify-between text-xs font-semibold text-slate-200 mb-1.5">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.category}
                    </span>
                    <span>
                      {formatCurrency(cat.amount, config.currency)}
                      <span className="text-slate-400 ml-1.5 font-normal">({Math.round(cat.percentage)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, cat.percentage)}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal for editing all category limits */}
      <CategoryLimitsModal
        isOpen={isLimitsModalOpen}
        onClose={() => setIsLimitsModalOpen(false)}
        config={config}
        onSaveLimits={(newLimits) => {
          if (onUpdateAllCategoryLimits) {
            onUpdateAllCategoryLimits(newLimits);
          }
        }}
      />

      {/* Modal: Detalle Desglosado de Gastos Fijos (Activado por Doble Clic) */}
      {isFixedDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div 
            id="modal-fixed-expenses-detail"
            className="bg-slate-900 border border-purple-500/40 rounded-2xl w-full max-w-lg my-6 overflow-hidden shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>Detalle de Gastos Fijos</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      {config.fixedExpenses?.length || 0}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Desglose comprometido que se descuenta automáticamente del sueldo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFixedDetailsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Summary banner */}
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs text-purple-300 font-semibold uppercase tracking-wider block">
                    Total Gastos Fijos
                  </span>
                  <div className="text-2xl font-black text-white mt-0.5">
                    {formatCurrency(totalFixed, config.currency)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Impacto en Sueldo</span>
                  <span className="text-lg font-bold text-purple-400">
                    {salary > 0 ? ((totalFixed / salary) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ListFilter className="w-3.5 h-3.5 text-purple-400" />
                    <span>Listado de conceptos fijos</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Pulsa <strong className="text-purple-300">Destildar</strong> para pasarlo a Límite de Consumo
                  </span>
                </div>

                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-200 flex items-start gap-2">
                  <span className="text-sm">💡</span>
                  <span>
                    Si tienes un gasto como <strong>Tarjeta de Crédito</strong> o <strong>Streaming</strong> que no deseas como gasto fijo, pulsa <strong>&quot;Destildar&quot;</strong>. Pasará de inmediato al <strong>Panel de Límites de Consumo</strong> bajo su categoría correspondiente.
                  </span>
                </div>

                {(!config.fixedExpenses || config.fixedExpenses.length === 0) && expenses.filter(e => e.isFixed && e.date.startsWith(currentMonth)).length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-800/40 border border-slate-700/60 text-center text-sm text-slate-400">
                    No tienes gastos fijos configurados todavía. Configúralos en Ajustes de Presupuesto.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Fixed expenses from config.fixedExpenses */}
                    {(config.fixedExpenses || []).map((fe) => {
                      const itemAmount = getFixedExpenseAmount(fe, salary);
                      const pctOfSalary = salary > 0 ? ((itemAmount / salary) * 100).toFixed(1) : '0';
                      return (
                        <div 
                          key={fe.id}
                          className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-purple-500/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0" />
                              <span className="font-bold text-white text-sm truncate">
                                {fe.name}
                              </span>
                              {fe.category && (
                                <span className="text-[10px] bg-slate-700/60 text-slate-300 px-1.5 py-0.5 rounded-md shrink-0">
                                  {fe.category}
                                </span>
                              )}
                              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded-md font-semibold shrink-0">
                                Fijo Mensual
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 pl-4.5">
                              {fe.amountType === 'percentage' && (
                                <span className="text-purple-300 font-mono font-medium">
                                  {fe.percentageValue}% del sueldo
                                </span>
                              )}
                              {fe.dueDate && (
                                <span>Vence: día {fe.dueDate}</span>
                              )}
                              <span>({pctOfSalary}% del sueldo)</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/50">
                            <span className="text-base font-bold text-white">
                              {formatCurrency(itemAmount, config.currency)}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {/* Destildar button */}
                              <button
                                type="button"
                                onClick={() => {
                                  onConvertFixedToVariable?.(fe.id);
                                }}
                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-purple-600/30 text-purple-300 hover:text-purple-200 border border-purple-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                title="Destildar de Gasto Fijo: pasará a gasto variable y aparecerá en el Panel de Límites de Consumo"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
                                <span>Destildar</span>
                              </button>

                              {/* Edit button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setIsFixedDetailsModalOpen(false);
                                  onEditExpense?.({
                                    id: fe.id,
                                    amount: itemAmount,
                                    category: fe.category || 'Tarjeta de Crédito',
                                    description: fe.name,
                                    date: `${currentMonth}-01`,
                                    paymentMethod: fe.category?.toLowerCase().includes('tarjeta') ? 'Tarjeta de Crédito' : 'Transferencia',
                                    createdAt: Date.now(),
                                    isFixed: true,
                                    fixedExpenseId: fe.id,
                                  });
                                }}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                title="Editar gasto (puedes destildar la opción de gasto fijo en el formulario)"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              {/* Delete button */}
                              {onDeleteFixedExpense && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`¿Deseas eliminar el gasto fijo "${fe.name}"?`)) {
                                      onDeleteFixedExpense(fe.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar gasto fijo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Fixed expenses from dailyExpenses */}
                    {expenses.filter(e => e.isFixed && e.date.startsWith(currentMonth)).map((de) => (
                      <div 
                        key={de.id}
                        className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-purple-500/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0" />
                            <span className="font-bold text-white text-sm truncate">
                              {de.description}
                            </span>
                            {de.category && (
                              <span className="text-[10px] bg-slate-700/60 text-slate-300 px-1.5 py-0.5 rounded-md shrink-0">
                                {de.category}
                              </span>
                            )}
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded-md font-semibold shrink-0">
                              Gasto Fijo Diario
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 pl-4.5">
                            <span>Fecha: {de.date}</span>
                            {de.paymentMethod && <span>• {de.paymentMethod}</span>}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/50">
                          <span className="text-base font-bold text-white">
                            {formatCurrency(de.amount, config.currency)}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {/* Destildar button */}
                            <button
                              type="button"
                              onClick={() => {
                                onEditExpense?.({
                                  ...de,
                                  isFixed: false,
                                });
                              }}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-purple-600/30 text-purple-300 hover:text-purple-200 border border-purple-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                              title="Destildar de Gasto Fijo: pasará a gasto variable y aparecerá en el Panel de Límites de Consumo"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
                              <span>Destildar</span>
                            </button>

                            {/* Edit button */}
                            <button
                              type="button"
                              onClick={() => {
                                setIsFixedDetailsModalOpen(false);
                                onEditExpense?.(de);
                              }}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Editar gasto (puedes destildar la opción de gasto fijo en el formulario)"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-end">
              <button
                type="button"
                onClick={() => setIsFixedDetailsModalOpen(false)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CATEGORY EXPENSES & CONVERT TO FIXED */}
      {selectedCategoryForModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedCategoryForModal(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/95 shrink-0">
              <div className="flex items-center gap-2.5">
                <span 
                  className="w-3.5 h-3.5 rounded-full shrink-0" 
                  style={{ backgroundColor: CATEGORY_COLORS[selectedCategoryForModal] || '#64748B' }} 
                />
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Gastos de: {selectedCategoryForModal}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Puedes pasar cualquier gasto de esta categoría a Gasto Fijo directamente
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCategoryForModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {(() => {
                const categoryExpenses = expenses.filter(
                  e => e.category === selectedCategoryForModal && !e.isFixed && e.date.startsWith(currentMonth)
                );

                if (categoryExpenses.length === 0) {
                  return (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No hay gastos variables activos registrados en esta categoría para el mes {currentMonth}.
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5">
                    {categoryExpenses.map((exp) => (
                      <div 
                        key={exp.id}
                        className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-600 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm truncate">
                              {exp.description || selectedCategoryForModal}
                            </span>
                            <span className="text-[10px] bg-slate-700/60 text-slate-300 px-1.5 py-0.5 rounded-md shrink-0">
                              {exp.date}
                            </span>
                            {exp.paymentMethod && (
                              <span className="text-[10px] text-slate-400 hidden sm:inline">
                                • {exp.paymentMethod}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/50">
                          <span className="text-base font-bold text-emerald-400">
                            {formatCurrency(exp.amount, config.currency)}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {/* Convert to Fixed button */}
                            <button
                              type="button"
                              onClick={() => {
                                onConvertVariableToFixed?.(exp.id);
                              }}
                              className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                              title="Convertir en Gasto Fijo (pasará a la lista de gastos fijos mensuales y no computará en tu cuota diaria variable)"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5 text-purple-300" />
                              <span>Pasar a Fijo</span>
                            </button>

                            {/* Edit Expense button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCategoryForModal(null);
                                onEditExpense?.(exp);
                              }}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Editar este gasto"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCategoryForModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
