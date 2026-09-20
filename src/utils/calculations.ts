import { 
  BudgetConfig, 
  DailyExpense, 
  FixedExpense, 
  DailyCalculation, 
  CategorySummary, 
  DayChartPoint,
  CategoryLimitStatus,
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORY_LIMITS
} from '../types';

export const CATEGORY_COLORS: Record<string, string> = {
  'Prescindibles': '#F43F5E', // rose
  'Tarjeta de Crédito': '#A855F7', // purple
  'Comida y Supermercado': '#10B981', // emerald
  'Familia y Alimentos': '#10B981', // emerald
  'Transporte y Combustible': '#3B82F6', // blue
  'Café y Salidas': '#F59E0B', // amber
  'Ocio y Entretenimiento': '#8B5CF6', // purple
  'Ocio y Streaming': '#EC4899', // pink
  'Salud y Farmacia': '#EC4899', // pink
  'Salud': '#EC4899', // pink
  'Vivienda': '#3B82F6', // blue
  'Servicios': '#06B6D4', // cyan
  'Educación y Cursos': '#6366F1', // indigo
  'Educación': '#6366F1', // indigo
  'Hogar y Compras': '#06B6D4', // cyan
  'Seguros': '#64748B', // slate
  'Otros Imprevistos': '#64748B', // slate
  'Otros': '#64748B', // slate
};

export function getCategoryColor(category: string): string {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  const catLower = category.toLowerCase();
  if (catLower.includes('tarjeta') || catLower.includes('credito') || catLower.includes('crédito')) return '#A855F7';
  if (catLower.includes('prescindible') || catLower.includes('ocio') || catLower.includes('streaming')) return '#F43F5E';
  if (catLower.includes('comida') || catLower.includes('super') || catLower.includes('alimento') || catLower.includes('familia')) return '#10B981';
  if (catLower.includes('transporte') || catLower.includes('combustible') || catLower.includes('nafta') || catLower.includes('auto')) return '#3B82F6';
  if (catLower.includes('salud') || catLower.includes('farmacia') || catLower.includes('medico') || catLower.includes('médico') || catLower.includes('remedio')) return '#EC4899';
  if (catLower.includes('vivienda') || catLower.includes('alquiler') || catLower.includes('hipoteca')) return '#3B82F6';
  if (catLower.includes('servicio') || catLower.includes('luz') || catLower.includes('gas') || catLower.includes('internet')) return '#06B6D4';
  if (catLower.includes('educaci') || catLower.includes('curso')) return '#6366F1';
  if (catLower.includes('cafe') || catLower.includes('café') || catLower.includes('salida')) return '#F59E0B';
  return '#64748B';
}

/**
 * Resolves the numeric amount for a fixed expense given the salary.
 * If type is 'percentage', calculates (salary * percentageValue) / 100.
 */
export function getFixedExpenseAmount(expense: FixedExpense, salary: number): number {
  if (expense.amountType === 'percentage') {
    const pct = Number(expense.percentageValue) || 0;
    return Math.round(((Number(salary) || 0) * pct) / 100);
  }
  return Number(expense.amount) || 0;
}

/**
 * Resolves total of all fixed expenses given current salary.
 */
export function getTotalFixedExpenses(expenses: FixedExpense[], salary: number): number {
  if (!Array.isArray(expenses)) return 0;
  return expenses.reduce((sum, item) => sum + getFixedExpenseAmount(item, salary), 0);
}

/**
 * Resolves the numeric amount for savings goal.
 * If type is 'percentage', calculates (salary * savingsPercent) / 100.
 */
export function getSavingsGoalAmount(config: BudgetConfig): number {
  const salary = Number(config.salary) || 0;
  if (config.savingsType === 'percentage') {
    const pct = Number(config.savingsPercent) || 0;
    return Math.round((salary * pct) / 100);
  }
  return Number(config.savingsGoal) || 0;
}

export function getDaysInMonth(year: number, monthZeroIndexed: number): number {
  return new Date(year, monthZeroIndexed + 1, 0).getDate();
}

export function formatCurrency(amount: number, currency: string = '$'): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(abs);

  return `${isNegative ? '-' : ''}${currency} ${formatted}`;
}

export function parseDateParts(dateStr: string): { year: number; month: number; day: number } {
  // expects YYYY-MM-DD
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y || new Date().getFullYear(), month: (m || 1) - 1, day: d || 1 };
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentMonthString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

import { getSalaryCycle, isExpenseInCycle } from './salaryCycle';

/**
 * Core daily calculation:
 * Computes how much maximum can be spent today without exceeding the budget or touching savings.
 * Accounts for 30-day salary cycle if salaryStartDate is set, and separates fixed from variable expenses.
 */
export function calculateDailyMetrics(
  config: BudgetConfig,
  expenses: DailyExpense[],
  targetDateStr: string = getTodayDateString()
): DailyCalculation {
  const salary = Number(config.salary) || 0;
  
  // Total fixed expenses from config (evaluating amounts or percentages of salary)
  const totalConfigFixed = getTotalFixedExpenses(config.fixedExpenses, salary);
  
  // Check if there is a salary cycle configured (30-day window from salaryStartDate)
  const hasSalaryStartDate = !!config.salaryStartDate;
  const cycle = getSalaryCycle(config, targetDateStr);

  // Filter variable expenses vs fixed daily expenses
  // Non-fixed expenses are those where isFixed is falsy (false or undefined)
  const inScopeExpenses = expenses.filter(e => {
    if (hasSalaryStartDate) {
      return isExpenseInCycle(e.date, cycle);
    }
    const { year, month } = parseDateParts(targetDateStr);
    const targetMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    return e.date.startsWith(targetMonthStr);
  });

  // Fixed expenses entered via daily expense form (e.g. nafta marcada como fija)
  const additionalFixedSpent = inScopeExpenses
    .filter(e => e.isFixed)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalFixed = totalConfigFixed + additionalFixedSpent;

  // Savings goal (evaluating amount or percentage of salary)
  const savings = getSavingsGoalAmount(config);
  
  // Initial disposable for all variable daily expenses
  const initialMonthlyDisposable = Math.max(0, salary - totalFixed - savings);

  // Variable expenses only (these consume the daily allowance and category limits)
  const variableExpenses = inScopeExpenses.filter(e => !e.isFixed);
  
  // Total variable spent in the cycle so far
  const totalDailyExpensesMonthToDate = variableExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  
  // Spent strictly before the target date
  const spentBeforeTargetDay = variableExpenses
    .filter(e => e.date < targetDateStr)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    
  // Spent strictly on the target date
  const totalSpentToday = variableExpenses
    .filter(e => e.date === targetDateStr)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    
  const { year, month, day } = parseDateParts(targetDateStr);
  const totalDaysInMonth = getDaysInMonth(year, month);

  // Days remaining in cycle from target day onwards
  const daysRemaining = hasSalaryStartDate 
    ? cycle.daysRemaining 
    : Math.max(1, totalDaysInMonth - day + 1);
  
  // Available budget at the beginning of target day
  const availableAtStartOfDay = Math.max(0, initialMonthlyDisposable - spentBeforeTargetDay);
  
  // Recommended daily allowance for target day
  const dailyAllowance = Math.max(0, availableAtStartOfDay / daysRemaining);
  
  // Net remaining for the cycle/month after all variable expenses
  const remainingMonthBudget = initialMonthlyDisposable - totalDailyExpensesMonthToDate;
  
  // Net remaining specifically for today
  const todayRemaining = dailyAllowance - totalSpentToday;
  
  // Over limit if today's spending exceeds today's daily allowance
  const isOverDailyLimit = totalSpentToday > dailyAllowance;
  const isCloseToLimit = !isOverDailyLimit && dailyAllowance > 0 && totalSpentToday >= dailyAllowance * 0.85;
  
  // Projection
  const effectiveDayNum = hasSalaryStartDate ? cycle.dayOfCycle : day;
  const effectiveTotalDays = hasSalaryStartDate ? cycle.daysTotal : totalDaysInMonth;
  const avgSpentPerDaySoFar = effectiveDayNum > 0 ? (spentBeforeTargetDay + totalSpentToday) / effectiveDayNum : 0;
  const projectedTotalMonthDailySpent = avgSpentPerDaySoFar * effectiveTotalDays;
  const projectedMonthEndBalance = initialMonthlyDisposable - projectedTotalMonthDailySpent;

  return {
    date: targetDateStr,
    dayNumber: effectiveDayNum,
    totalDaysInMonth: effectiveTotalDays,
    daysRemaining,
    initialMonthlyDisposable,
    totalDailyExpensesMonthToDate,
    totalSpentToday,
    remainingMonthBudget,
    dailyAllowance,
    todayRemaining,
    isOverDailyLimit,
    isCloseToLimit,
    projectedMonthEndBalance,
  };
}

/**
 * Summarize daily expenses by category for charts
 */
export function getCategorySummaries(expenses: DailyExpense[], targetMonthStr: string): CategorySummary[] {
  const monthExpenses = expenses.filter(e => e.date.startsWith(targetMonthStr));
  const total = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  
  const map = new Map<string, number>();
  for (const exp of monthExpenses) {
    const cat = exp.category || 'Otros Imprevistos';
    map.set(cat, (map.get(cat) || 0) + (Number(exp.amount) || 0));
  }
  
  const results: CategorySummary[] = [];
  map.forEach((amount, category) => {
    results.push({
      category,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
      color: CATEGORY_COLORS[category] || '#64748B',
    });
  });
  
  return results.sort((a, b) => b.amount - a.amount);
}

/**
 * Generate day-by-day points for the entire month
 */
export function getMonthlyDailyChartData(
  config: BudgetConfig,
  expenses: DailyExpense[],
  targetMonthStr: string
): DayChartPoint[] {
  const [yStr, mStr] = targetMonthStr.split('-');
  const year = Number(yStr) || new Date().getFullYear();
  const month = (Number(mStr) || 1) - 1;
  const totalDays = getDaysInMonth(year, month);
  
  const salary = Number(config.salary) || 0;
  const totalFixed = getTotalFixedExpenses(config.fixedExpenses, salary);
  const savings = getSavingsGoalAmount(config);
  const initialMonthlyDisposable = Math.max(0, salary - totalFixed - savings);
  
  const points: DayChartPoint[] = [];
  let accumulated = 0;
  
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const daySpent = expenses
      .filter(e => e.date === dateStr)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      
    accumulated += daySpent;
    
    // Calculate what the allowance was on that specific day
    const daysLeft = totalDays - d + 1;
    const spentBeforeThisDay = accumulated - daySpent;
    const budgetBeforeThisDay = Math.max(0, initialMonthlyDisposable - spentBeforeThisDay);
    const allowance = Math.max(0, budgetBeforeThisDay / daysLeft);
    
    points.push({
      day: d,
      dateStr,
      spent: daySpent,
      allowance: Math.round(allowance),
      accumulated: Math.round(accumulated),
    });
  }
  
  return points;
}

/**
 * Merges default category limits with user configured limits.
 */
export function getCategoryLimits(config: BudgetConfig): Record<string, number> {
  return {
    ...DEFAULT_CATEGORY_LIMITS,
    ...(config.categoryLimits || {}),
  };
}

/**
 * Calculates spending, max allowed limit, usage percentage, and traffic light status
 * (< 80% = green, >= 80% and < 100% = yellow, >= 100% = red) for all categories.
 */
export function getCategoryLimitStatuses(
  config: BudgetConfig,
  expenses: DailyExpense[],
  targetMonthStr: string
): CategoryLimitStatus[] {
  const salary = Number(config.salary) || 0;
  const limits = getCategoryLimits(config);
  
  // Expenses in scope (considering 30-day salary cycle if configured)
  const hasSalaryStartDate = !!config.salaryStartDate;
  const cycle = getSalaryCycle(config);

  const inScopeExpenses = expenses.filter((e) => {
    if (hasSalaryStartDate) {
      return isExpenseInCycle(e.date, cycle);
    }
    return e.date.startsWith(targetMonthStr);
  });

  // Only consider VARIABLE expenses (isFixed is falsy).
  // Expenses flagged as isFixed: true are strictly grouped in Gastos Fijos!
  const variableExpenses = inScopeExpenses.filter((e) => !e.isFixed);

  // Map spending by category
  const spentMap = new Map<string, number>();
  for (const exp of variableExpenses) {
    const cat = exp.category || 'Otros Imprevistos';
    spentMap.set(cat, (spentMap.get(cat) || 0) + (Number(exp.amount) || 0));
  }

  // User strict directive: "solo debe aparecer lo que cargo como gasto con limite"
  // ONLY show categories that actually have variable expenses loaded (> 0).
  // Default categories with $0 spent are completely eliminated from the limits panel!
  const relevantCategories = Array.from(spentMap.keys()).filter(cat => (spentMap.get(cat) || 0) > 0);

  return relevantCategories.map((cat) => {
    const spent = spentMap.get(cat) || 0;
    const maxPercentage = limits[cat] ?? 10; // default 10% if not explicitly set
    const maxAllowedAmount = Math.round((salary * maxPercentage) / 100);
    const usagePercent = maxAllowedAmount > 0 ? (spent / maxAllowedAmount) * 100 : (spent > 0 ? 100 : 0);
    const percentageOfSalary = salary > 0 ? (spent / salary) * 100 : 0;

    let status: 'green' | 'yellow' | 'red' = 'green';
    let color = '#10B981'; // Green
    let statusLabel = 'Dentro de lo permitido';

    if (usagePercent >= 100) {
      status = 'red';
      color = '#EF4444'; // Red
      statusLabel = 'Límite alcanzado o superado (≥100%)';
    } else if (usagePercent >= 80) {
      status = 'yellow';
      color = '#EAB308'; // Yellow
      statusLabel = 'Alerta preventiva (≥80%)';
    }

    return {
      category: cat,
      spent,
      maxPercentage,
      maxAllowedAmount,
      usagePercent,
      percentageOfSalary,
      status,
      color,
      statusLabel,
    };
  });
}

export interface ExpenseTypeSlice {
  name: string;
  category: string;
  value: number;
  percentageOfSalary: number;
  usagePercent: number;
  maxPercentage: number;
  maxAllowedAmount: number;
  color: string;
  status: 'green' | 'yellow' | 'red' | 'savings';
  statusLabel: string;
}

/**
 * Builds data for the Expense Types & Limits Chart, including:
 * 1. Each expense category slice colored by its traffic-light status (<80% green, 80-99% yellow, >=100% red)
 * 2. Unspent remainder of salary dynamically appearing as "Ahorro Extra"
 */
export function getExpenseTypesChartData(
  config: BudgetConfig,
  expenses: DailyExpense[],
  targetMonthStr: string
): {
  slices: ExpenseTypeSlice[];
  totalSpent: number;
  realSavings: number;
  realSavingsPercent: number;
  salary: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
} {
  const salary = Number(config.salary) || 0;
  const statuses = getCategoryLimitStatuses(config, expenses, targetMonthStr);

  const monthExpenses = expenses.filter((e) => {
    if (config.salaryStartDate) {
      const cycle = getSalaryCycle(config);
      return isExpenseInCycle(e.date, cycle);
    }
    return e.date.startsWith(targetMonthStr);
  });
  
  // Separate variable daily expenses from fixed daily expenses
  const variableDailyExpenses = monthExpenses.filter((e) => !e.isFixed);
  const fixedDailyExpenses = monthExpenses.filter((e) => e.isFixed);
  
  const totalDailySpent = variableDailyExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalConfigFixed = getTotalFixedExpenses(config.fixedExpenses, salary);
  const totalDailyFixed = fixedDailyExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalFixed = totalConfigFixed + totalDailyFixed;
  const totalSpent = totalFixed + totalDailySpent;

  // Real leftover savings after all expenses: renamed to "Ahorro Extra"
  // (separate from the fixed monthly savings already included in fixed expenses / savings goal)
  const realSavings = Math.max(0, salary - totalSpent);
  const realSavingsPercent = salary > 0 ? (realSavings / salary) * 100 : 0;

  // Show all active categories that have expenses loaded (>0).
  // If no category has spent anything yet, show categories with their configured limits so the user sees all portions
  const activeStatuses = statuses.filter((s) => s.spent > 0);
  
  // When user has loaded expenses, show every category with spent > 0
  // Slices reflect actual spending with percentage of total salary
  const slices: ExpenseTypeSlice[] = activeStatuses.map((s) => ({
    name: s.category,
    category: s.category,
    value: s.spent,
    percentageOfSalary: s.percentageOfSalary,
    usagePercent: s.usagePercent,
    maxPercentage: s.maxPercentage,
    maxAllowedAmount: s.maxAllowedAmount,
    color: s.color,
    status: s.status,
    statusLabel: s.statusLabel,
  }));

  // Add fixed expenses slice
  if (totalFixed > 0) {
    slices.push({
      name: 'Gastos Fijos Comprometidos',
      category: 'Gastos Fijos',
      value: totalFixed,
      percentageOfSalary: salary > 0 ? (totalFixed / salary) * 100 : 0,
      usagePercent: 100,
      maxPercentage: salary > 0 ? Math.round((totalFixed / salary) * 100) : 0,
      maxAllowedAmount: totalFixed,
      color: '#8B5CF6', // Purple
      status: 'green',
      statusLabel: 'Gastos fijos del mes (Alquiler, Servicios, etc.)',
    });
  }

  // Add dynamically unspent remainder as "Ahorro Extra"
  if (realSavings > 0) {
    slices.push({
      name: 'Ahorro Extra',
      category: 'Ahorro Extra',
      value: realSavings,
      percentageOfSalary: realSavingsPercent,
      usagePercent: 0,
      maxPercentage: realSavingsPercent,
      maxAllowedAmount: realSavings,
      color: '#06B6D4', // Cyan
      status: 'savings',
      statusLabel: 'Sueldo libre remanente no consumido (Ahorro Extra)',
    });
  }

  const greenCount = statuses.filter((s) => s.status === 'green').length;
  const yellowCount = statuses.filter((s) => s.status === 'yellow').length;
  const redCount = statuses.filter((s) => s.status === 'red').length;

  return {
    slices,
    totalSpent,
    realSavings,
    realSavingsPercent,
    salary,
    greenCount,
    yellowCount,
    redCount,
  };
}
