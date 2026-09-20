import React from 'react';
import { 
  Banknote, 
  Receipt, 
  PiggyBank, 
  Coins, 
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';
import { BudgetConfig } from '../types';
import { formatCurrency, getTotalFixedExpenses, getSavingsGoalAmount } from '../utils/calculations';

interface SummaryCardsProps {
  config: BudgetConfig;
  totalDailySpentMonth: number;
  onOpenConfig: () => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  config,
  totalDailySpentMonth,
  onOpenConfig,
}) => {
  const salary = Number(config.salary) || 0;
  const savings = getSavingsGoalAmount(config);
  const totalFixed = getTotalFixedExpenses(config.fixedExpenses, salary);
  
  // Initial disposable before daily expenses
  const initialMonthlyDisposable = Math.max(0, salary - totalFixed - savings);
  // Remaining disposable after daily expenses
  const remainingMonthlyDisposable = initialMonthlyDisposable - totalDailySpentMonth;
  const savingsPercentage = salary > 0 ? Math.round((savings / salary) * 100) : 0;
  const fixedPercentage = salary > 0 ? Math.round((totalFixed / salary) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* 1. Sueldo / Ingreso */}
      <div 
        id="card-salary"
        onClick={onOpenConfig}
        className="bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all cursor-pointer group shadow-sm"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold uppercase tracking-wider">Sueldo / Ingreso</span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
            <Banknote className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          {formatCurrency(salary, config.currency)}
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
          <span>Ingreso base del mes</span>
          <span className="text-blue-400 group-hover:underline flex items-center text-[11px]">
            Editar <ArrowUpRight className="w-3 h-3 ml-0.5" />
          </span>
        </div>
      </div>

      {/* 2. Gastos Fijos */}
      <div 
        id="card-fixed-expenses"
        onClick={onOpenConfig}
        className="bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all cursor-pointer group shadow-sm"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold uppercase tracking-wider">Gastos Fijos</span>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
            <Receipt className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          {formatCurrency(totalFixed, config.currency)}
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
          <span>{config.fixedExpenses.length} obligaciones ({fixedPercentage}%)</span>
          <span className="text-purple-400 group-hover:underline flex items-center text-[11px]">
            Ver fijos <ArrowUpRight className="w-3 h-3 ml-0.5" />
          </span>
        </div>
      </div>

      {/* 3. Ahorro */}
      <div 
        id="card-savings-goal"
        onClick={onOpenConfig}
        className="bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all cursor-pointer group shadow-sm"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold uppercase tracking-wider">Meta de Ahorro</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
            <PiggyBank className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-emerald-400 tracking-tight">
          {formatCurrency(savings, config.currency)}
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
          <span>Protegido ({savingsPercentage}% de sueldo)</span>
          <span className="text-emerald-400 group-hover:underline flex items-center text-[11px]">
            Ajustar <ArrowUpRight className="w-3 h-3 ml-0.5" />
          </span>
        </div>
      </div>

      {/* 4. Restante para Gastos Diarios */}
      <div 
        id="card-disposable-budget"
        className={`rounded-xl p-4 border transition-all shadow-sm ${
          remainingMonthlyDisposable >= 0
            ? 'bg-slate-900/70 border-slate-800'
            : 'bg-rose-950/30 border-rose-500/40'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold uppercase tracking-wider">Restante del Mes</span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Coins className="w-4 h-4" />
          </div>
        </div>
        <div className={`text-xl sm:text-2xl font-bold tracking-tight ${
          remainingMonthlyDisposable >= 0 ? 'text-slate-100' : 'text-rose-400'
        }`}>
          {formatCurrency(remainingMonthlyDisposable, config.currency)}
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
          <span className="flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-slate-500" />
            Gastado diario: {formatCurrency(totalDailySpentMonth, config.currency)}
          </span>
          <span className={`text-[11px] font-medium ${remainingMonthlyDisposable >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {remainingMonthlyDisposable >= 0 ? 'En saldo' : 'Déficit'}
          </span>
        </div>
      </div>

    </div>
  );
};
