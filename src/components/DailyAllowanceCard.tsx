import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  PlusCircle, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Receipt
} from 'lucide-react';
import { DailyCalculation, DailyExpense } from '../types';
import { formatCurrency, parseDateParts } from '../utils/calculations';

interface DailyAllowanceCardProps {
  metrics: DailyCalculation;
  currency: string;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onOpenAddExpense: () => void;
  todayExpenses?: DailyExpense[];
  onEditExpense?: (expense: DailyExpense) => void;
}

export const DailyAllowanceCard: React.FC<DailyAllowanceCardProps> = ({
  metrics,
  currency,
  selectedDate,
  onDateChange,
  onOpenAddExpense,
  todayExpenses = [],
  onEditExpense,
}) => {
  const {
    dayNumber,
    totalDaysInMonth,
    daysRemaining,
    dailyAllowance,
    totalSpentToday,
    todayRemaining,
    isOverDailyLimit,
    isCloseToLimit,
    remainingMonthBudget,
  } = metrics;

  // Format selected date
  const { year, month, day } = parseDateParts(selectedDate);
  const dateObj = new Date(year, month, day);
  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = selectedDate === todayStr;

  const dateLabel = isToday
    ? `Hoy, ${dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`
    : dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Progress percentage of today's limit spent
  const percentSpent = dailyAllowance > 0 
    ? Math.min(100, Math.round((totalSpentToday / dailyAllowance) * 100))
    : (totalSpentToday > 0 ? 100 : 0);

  const handlePrevDay = () => {
    const prev = new Date(year, month, day - 1);
    const y = prev.getFullYear();
    const m = String(prev.getMonth() + 1).padStart(2, '0');
    const d = String(prev.getDate()).padStart(2, '0');
    onDateChange(`${y}-${m}-${d}`);
  };

  const handleNextDay = () => {
    const next = new Date(year, month, day + 1);
    const y = next.getFullYear();
    const m = String(next.getMonth() + 1).padStart(2, '0');
    const d = String(next.getDate()).padStart(2, '0');
    onDateChange(`${y}-${m}-${d}`);
  };

  return (
    <div 
      id="daily-allowance-container"
      className={`rounded-2xl border transition-all duration-300 shadow-sm p-5 sm:p-7 ${
        isOverDailyLimit 
          ? 'bg-rose-950/20 border-rose-500/40' 
          : 'bg-emerald-950/20 border-emerald-500/30'
      }`}
    >
      {/* Top row: Date selector & Status Tag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            id="btn-prev-day"
            onClick={handlePrevDay}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Día anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm sm:text-base capitalize">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{dateLabel}</span>
          </div>

          <button
            id="btn-next-day"
            onClick={handleNextDay}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Día siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isToday && (
            <button
              onClick={() => onDateChange(todayStr)}
              className="text-xs text-emerald-400 hover:underline ml-2"
            >
              Volver a hoy
            </button>
          )}
        </div>

        {/* Dynamic RED or GREEN status badge */}
        <div className="flex items-center gap-2">
          {isOverDailyLimit ? (
            <div 
              id="alert-badge-red"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>OBJETIVO NO ALCANZADO (LÍMITE EXCEDIDO)</span>
            </div>
          ) : (
            <div 
              id="alert-badge-green"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>OBJETIVO DIARIO EN VERDE</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Numbers: Allowance vs Actual Spend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6 items-center">
        
        {/* Metric 1: Recommended Maximum Daily Allowance */}
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
            <span>MÁXIMO PERMITIDO HOY</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatCurrency(dailyAllowance, currency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Calculado sobre {daysRemaining} días restantes del mes
          </p>
        </div>

        {/* Metric 2: Spent Today */}
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
            <span>GASTADO EN ESTE DÍA</span>
            <div className="flex items-center gap-1.5">
              {onEditExpense && todayExpenses.length === 1 && (
                <button
                  type="button"
                  onClick={() => onEditExpense(todayExpenses[0])}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded-md border border-blue-500/30 transition-colors cursor-pointer"
                  title="Corregir monto o descripción de este gasto"
                >
                  <Edit3 className="w-3 h-3" /> Corregir
                </button>
              )}
              <TrendingDown className={`w-3.5 h-3.5 ${isOverDailyLimit ? 'text-rose-400' : 'text-slate-400'}`} />
            </div>
          </div>
          
          <button
            type="button"
            disabled={todayExpenses.length === 0 || !onEditExpense}
            onClick={() => {
              if (onEditExpense && todayExpenses.length > 0) {
                onEditExpense(todayExpenses[0]);
              }
            }}
            className={`text-left block w-full transition-colors ${
              todayExpenses.length > 0 ? 'hover:text-blue-300 cursor-pointer group/spent' : ''
            }`}
            title={todayExpenses.length > 0 ? 'Haz clic para corregir el gasto' : undefined}
          >
            <div className="flex items-center gap-2">
              <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                isOverDailyLimit ? 'text-rose-400' : 'text-slate-100'
              }`}>
                {formatCurrency(totalSpentToday, currency)}
              </div>
              {todayExpenses.length > 0 && onEditExpense && (
                <Edit3 className="w-4 h-4 text-slate-500 group-hover/spent:text-blue-400 transition-colors" />
              )}
            </div>
          </button>

          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{percentSpent}% del presupuesto del día</span>
            {todayExpenses.length > 0 && (
              <span className="text-slate-500 text-[10px]">
                {todayExpenses.length} {todayExpenses.length === 1 ? 'gasto registrado' : 'gastos registrados'}
              </span>
            )}
          </div>
        </div>

        {/* Metric 3: Remaining Buffer / Margin for Today */}
        <div className={`rounded-xl p-4 border ${
          isOverDailyLimit 
            ? 'bg-rose-950/40 border-rose-500/50 text-rose-200' 
            : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span>{isOverDailyLimit ? 'EXCESO SOBRE EL LÍMITE' : 'DISPONIBLE RESTANTE HOY'}</span>
            {isOverDailyLimit ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
            isOverDailyLimit ? 'text-rose-300' : 'text-emerald-300'
          }`}>
            {isOverDailyLimit 
              ? formatCurrency(Math.abs(todayRemaining), currency)
              : formatCurrency(Math.max(0, todayRemaining), currency)
            }
          </div>
          <p className="text-[11px] mt-1 opacity-85">
            {isOverDailyLimit 
              ? 'Has sobrepasado el límite por este monto' 
              : 'Aún puedes gastar esto sin salirte del objetivo'}
          </p>
        </div>

      </div>

      {/* Visual Progress Bar */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-xs font-medium text-slate-400">
          <span>Consumo de cuota diaria</span>
          <span className={isOverDailyLimit ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
            {formatCurrency(totalSpentToday, currency)} / {formatCurrency(dailyAllowance, currency)}
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-700">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isOverDailyLimit 
                ? 'bg-rose-500' 
                : isCloseToLimit 
                  ? 'bg-amber-400' 
                  : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, percentSpent)}%` }}
          />
        </div>
      </div>

      {/* Explicit AVISO EN ROJO / VERDE Banner Box */}
      <div className={`rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        isOverDailyLimit 
          ? 'bg-rose-900/30 border border-rose-500/40 text-rose-200' 
          : 'bg-emerald-900/30 border border-emerald-500/30 text-emerald-200'
      }`}>
        <div className="flex items-start gap-3">
          {isOverDailyLimit ? (
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}
          <div>
            <h4 className="text-sm font-bold">
              {isOverDailyLimit 
                ? '⚠️ Aviso en Rojo: Superaste el límite recomendado de hoy' 
                : '✅ Aviso en Verde: ¡Objetivo diario alcanzado con éxito!'}
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
              {isOverDailyLimit 
                ? `Al gastar ${formatCurrency(totalSpentToday, currency)} excediste en ${formatCurrency(Math.abs(todayRemaining), currency)} tu límite. Para no comprometer tu meta de ahorro, los días restantes del mes tendrán un límite recalibrado automáticamente.`
                : `Estás administrando tu dinero de forma disciplinada. Tienes un margen de ${formatCurrency(Math.max(0, todayRemaining), currency)} aún disponible hoy para imprevistos o compras.`}
            </p>
          </div>
        </div>

        {/* Quick Add Expense Action */}
        <button
          id="btn-quick-add-expense"
          onClick={onOpenAddExpense}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-transform active:scale-95 ${
            isOverDailyLimit
              ? 'bg-rose-600 hover:bg-rose-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Cargar Gasto</span>
        </button>
      </div>

      {/* Today's Expenses Quick List with instant edit */}
      {todayExpenses && todayExpenses.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Receipt className="w-3.5 h-3.5 text-blue-400" />
              <span>Gastos cargados en este día ({todayExpenses.length})</span>
            </span>
            <span className="text-[11px] text-blue-400 font-medium hidden sm:inline">
              Haz clic en cualquier gasto o monto para corregir equivocaciones
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {todayExpenses.map((exp) => (
              <button
                key={exp.id}
                type="button"
                onClick={() => onEditExpense && onEditExpense(exp)}
                className="group text-left flex items-center justify-between p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer shadow-xs"
                title="Haz clic para modificar este gasto"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-semibold text-white group-hover:text-blue-300 transition-colors truncate">
                    {exp.description}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {exp.category}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-white group-hover:text-blue-300 tracking-tight transition-colors">
                    {formatCurrency(exp.amount, currency)}
                  </span>
                  <div className="p-1 rounded-md bg-slate-800 group-hover:bg-blue-500/20 text-slate-400 group-hover:text-blue-400 transition-colors">
                    <Edit3 className="w-3 h-3" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer info pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Día <strong>{dayNumber}</strong> de {totalDaysInMonth}</span>
        </div>
        <div>
          <span>Días restantes: <strong className="text-slate-200">{daysRemaining}</strong></span>
        </div>
        <div className="col-span-2 sm:col-span-2 text-left sm:text-right">
          <span>Disponible total del mes restante: <strong className="text-emerald-400">{formatCurrency(remainingMonthBudget, currency)}</strong></span>
        </div>
      </div>

    </div>
  );
};
