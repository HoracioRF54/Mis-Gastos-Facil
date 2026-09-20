import { BudgetConfig, DailyExpense } from '../types';
import { parseDateParts, getTodayDateString } from './calculations';

export interface SalaryCycleInfo {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (startDate + 29 days = 30-day window)
  dayOfCycle: number; // e.g. 1 to 30
  daysTotal: number; // 30
  daysRemaining: number; // 30 - dayOfCycle + 1
  isCurrentCycle: boolean;
  label: string; // e.g. "5 de marzo - 4 de abril"
}

/**
 * Calculates a 30-day budget cycle starting from the user's selected salary date.
 * If no salaryStartDate is specified, defaults to the 1st of the current month.
 */
export function getSalaryCycle(
  config: BudgetConfig,
  currentDateStr: string = getTodayDateString()
): SalaryCycleInfo {
  let startStr = config.salaryStartDate;

  if (!startStr) {
    const todayParts = parseDateParts(currentDateStr);
    startStr = `${todayParts.year}-${String(todayParts.month + 1).padStart(2, '0')}-01`;
  }

  const [sY, sM, sD] = startStr.split('-').map(Number);
  const startObj = new Date(sY, sM - 1, sD, 0, 0, 0, 0);

  // Cycle is exactly 30 days: Day 1 is startObj, Day 30 is startObj + 29 days
  const endObj = new Date(startObj.getTime() + 29 * 24 * 60 * 60 * 1000);
  const eY = endObj.getFullYear();
  const eM = String(endObj.getMonth() + 1).padStart(2, '0');
  const eD = String(endObj.getDate()).padStart(2, '0');
  const endStr = `${eY}-${eM}-${eD}`;

  // Current day comparison
  const [cY, cM, cD] = currentDateStr.split('-').map(Number);
  const currObj = new Date(cY, cM - 1, cD, 0, 0, 0, 0);

  const diffMs = currObj.getTime() - startObj.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const dayOfCycle = Math.min(30, Math.max(1, diffDays + 1));
  const daysRemaining = Math.max(1, 30 - dayOfCycle + 1);
  const isCurrentCycle = diffDays >= 0 && diffDays < 30;

  const monthsEs = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const label = `${sD} de ${monthsEs[sM - 1]} al ${endObj.getDate()} de ${monthsEs[endObj.getMonth()]}`;

  return {
    startDate: startStr,
    endDate: endStr,
    dayOfCycle,
    daysTotal: 30,
    daysRemaining,
    isCurrentCycle,
    label,
  };
}

/**
 * Checks if a given expense date falls inside the 30-day salary cycle.
 */
export function isExpenseInCycle(expenseDate: string, cycle: SalaryCycleInfo): boolean {
  return expenseDate >= cycle.startDate && expenseDate <= cycle.endDate;
}
