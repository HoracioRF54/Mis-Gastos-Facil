export interface FixedExpense {
  id: string;
  name: string;
  amountType?: 'amount' | 'percentage'; // 'amount' (monto fijo) o 'percentage' (% del sueldo)
  percentageValue?: number; // e.g. 20 para 20%
  amount: number; // monto numérico en moneda (calculado o fijo)
  category: string;
  dueDate?: number; // day of month 1-31
  isPaid?: boolean;
}

export interface DailyExpense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
  paymentMethod?: string;
  createdAt: number;
  isFixed?: boolean; // Tildado = Gasto Fijo agrupado en fijos; No tildado = suma a límites y consumo
  fixedExpenseId?: string; // ID of the original fixed expense if converted or linked
  fixedSubcategory?: string; // Subcategoría opcional si es fijo
}

export interface BudgetConfig {
  salary: number; // Sueldo mensual
  salaryStartDate?: string; // Fecha de inicio de ciclo (YYYY-MM-DD), a partir de allí se cuentan 30 días
  savingsType?: 'amount' | 'percentage'; // 'amount' o 'percentage'
  savingsGoal: number; // Meta de ahorro en moneda (fijo o calculado)
  savingsPercent?: number; // Porcentaje de ahorro sobre el sueldo (e.g. 10 para 10%)
  fixedExpenses: FixedExpense[];
  currency: string; // e.g. '$', '€', 'S/', 'CLP'
  month: string; // YYYY-MM
  categoryLimits?: Record<string, number>; // Mapeo de categoría a % máximo permitido del sueldo
}

export interface AppData {
  syncCode: string;
  config: BudgetConfig;
  dailyExpenses: DailyExpense[];
  lastUpdated: number;
  license: {
    plan: 'free' | 'annual' | 'lifetime';
    isActive: boolean;
    expiresAt?: string;
    licenseKey?: string;
  };
}

export interface DailyCalculation {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  totalDaysInMonth: number;
  daysRemaining: number; // including today
  
  initialMonthlyDisposable: number; // salary - total fixed - savings
  totalDailyExpensesMonthToDate: number;
  totalSpentToday: number;
  
  remainingMonthBudget: number; // initialMonthlyDisposable - total spent so far
  dailyAllowance: number; // remainingMonthBudget / daysRemaining
  
  todayRemaining: number; // dailyAllowance - totalSpentToday
  isOverDailyLimit: boolean; // true -> RED alert, false -> GREEN alert
  isCloseToLimit: boolean; // >= 85% of allowance
  projectedMonthEndBalance: number; // project if current daily pace continues
}

export interface CategorySummary {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface CategoryLimitStatus {
  category: string;
  spent: number;
  maxPercentage: number; // % del sueldo permitido
  maxAllowedAmount: number; // monto numérico permitido
  usagePercent: number; // porcentaje consumido del límite permitido (ej: 80% = amarillo, 100% = rojo)
  percentageOfSalary: number; // (spent / salary) * 100
  status: 'green' | 'yellow' | 'red';
  color: string;
  statusLabel: string;
}

export const DEFAULT_CATEGORIES: string[] = [
  'Prescindibles',
  'Tarjeta de Crédito',
  'Comida y Supermercado',
  'Transporte y Combustible',
  'Café y Salidas',
  'Ocio y Streaming',
  'Ocio y Entretenimiento',
  'Salud y Farmacia',
  'Hogar y Compras',
  'Educación y Cursos',
  'Otros Imprevistos',
];

export const DEFAULT_CATEGORY_LIMITS: Record<string, number> = {
  'Prescindibles': 5, // 5% máx del sueldo
  'Tarjeta de Crédito': 10, // 10% máx del sueldo
  'Comida y Supermercado': 25,
  'Transporte y Combustible': 10,
  'Café y Salidas': 5,
  'Ocio y Streaming': 5,
  'Ocio y Entretenimiento': 8,
  'Salud y Farmacia': 7,
  'Hogar y Compras': 10,
  'Educación y Cursos': 5,
  'Otros Imprevistos': 5,
};

export interface DayChartPoint {
  day: number;
  dateStr: string;
  spent: number;
  allowance: number;
  accumulated: number;
}

export function createDefaultAppData(syncCode: string = 'DEFAULT'): AppData {
  const d = new Date();
  const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return {
    syncCode,
    config: {
      salary: 1200000,
      savingsType: 'percentage',
      savingsGoal: 120000,
      savingsPercent: 10,
      currency: '$',
      month: currentMonth,
      categoryLimits: { ...DEFAULT_CATEGORY_LIMITS },
      fixedExpenses: [
        { id: 'fx-1', name: 'Alquiler / Hipoteca', amountType: 'amount', amount: 350000, category: 'Vivienda', dueDate: 5, isPaid: true },
        { id: 'fx-2', name: 'Servicios (Luz, Agua, Gas)', amountType: 'amount', amount: 45000, category: 'Servicios', dueDate: 10, isPaid: true },
        { id: 'fx-3', name: 'Internet y Telefonía', amountType: 'amount', amount: 30000, category: 'Servicios', dueDate: 15, isPaid: true },
        { id: 'fx-4', name: 'Seguros / Prepaga', amountType: 'amount', amount: 65000, category: 'Salud', dueDate: 20, isPaid: false },
        { id: 'fx-5', name: 'Suscripciones (Streaming)', amountType: 'amount', amount: 15000, category: 'Entretenimiento', dueDate: 25, isPaid: true },
      ],
    },
    dailyExpenses: [],
    lastUpdated: Date.now(),
    license: {
      plan: 'free',
      isActive: true,
      expiresAt: '2099-12-31',
    },
  };
}
