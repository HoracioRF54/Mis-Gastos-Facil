import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Check, 
  Banknote, 
  Receipt, 
  PiggyBank, 
  DollarSign, 
  Calendar,
  Percent,
  Sparkles,
  Pencil,
  Sliders
} from 'lucide-react';
import { BudgetConfig, FixedExpense, DEFAULT_CATEGORIES, DEFAULT_CATEGORY_LIMITS } from '../types';
import { formatCurrency, getFixedExpenseAmount, getTotalFixedExpenses, getCategoryLimits } from '../utils/calculations';

interface BudgetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BudgetConfig;
  onSave: (newConfig: BudgetConfig) => void;
}

const FIXED_CATEGORIES = [
  'Familia y Alimentos',
  'Transporte y Combustible',
  'Vivienda',
  'Servicios',
  'Salud y Farmacia',
  'Educación',
  'Seguros',
  'Ocio y Streaming',
  'Prescindibles',
  'Tarjeta de Crédito',
  'Otros'
];

const CURRENCIES = ['$', '€', 'USD', 'S/', 'CLP', 'ARS', 'MXN', 'COP'];

export const BudgetConfigModal: React.FC<BudgetConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [salary, setSalary] = useState<number>(config.salary || 0);
  const [currency, setCurrency] = useState<string>(config.currency || '$');
  const [salaryStartDate, setSalaryStartDate] = useState<string>(
    config.salaryStartDate || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`
  );
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(config.fixedExpenses || []);

  // Savings configuration
  const [savingsType, setSavingsType] = useState<'amount' | 'percentage'>(
    config.savingsType || (config.savingsPercent ? 'percentage' : 'amount')
  );
  const [savingsAmount, setSavingsAmount] = useState<number>(config.savingsGoal || 0);
  const [savingsPercent, setSavingsPercent] = useState<number>(
    config.savingsPercent || (config.salary ? Math.round(((config.savingsGoal || 0) / config.salary) * 100) : 10)
  );

  // Category limits configuration
  const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>(
    config.categoryLimits || DEFAULT_CATEGORY_LIMITS
  );

  // New fixed expense form inputs
  const [newFixedName, setNewFixedName] = useState('');
  const [newFixedType, setNewFixedType] = useState<'amount' | 'percentage'>('amount');
  const [newFixedAmountValue, setNewFixedAmountValue] = useState('');
  const [newFixedPercentValue, setNewFixedPercentValue] = useState('');
  const [newFixedCategory, setNewFixedCategory] = useState(FIXED_CATEGORIES[0]);
  const [newFixedDueDate, setNewFixedDueDate] = useState<number>(5);

  // Inline editing state for an existing fixed expense
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'amount' | 'percentage'>('amount');
  const [editAmountVal, setEditAmountVal] = useState('');
  const [editPercentVal, setEditPercentVal] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDueDate, setEditDueDate] = useState<number>(5);

  if (!isOpen) return null;

  // Real-time calculations
  const effectiveSavingsGoal = savingsType === 'percentage'
    ? Math.round((salary * (Number(savingsPercent) || 0)) / 100)
    : Number(savingsAmount) || 0;

  const totalFixed = getTotalFixedExpenses(fixedExpenses, salary);
  const disposable = Math.max(0, salary - totalFixed - effectiveSavingsGoal);

  // Quick preset helper
  const applyPreset = (name: string, type: 'amount' | 'percentage', value: number, category: string, dueDate: number = 10) => {
    setNewFixedName(name);
    setNewFixedType(type);
    if (type === 'percentage') {
      setNewFixedPercentValue(String(value));
      setNewFixedAmountValue('');
    } else {
      setNewFixedAmountValue(String(value));
      setNewFixedPercentValue('');
    }
    setNewFixedCategory(category);
    setNewFixedDueDate(dueDate);
  };

  const handleAddFixedExpense = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newFixedName.trim()) return;

    let finalAmount = 0;
    let finalPercent: number | undefined = undefined;

    if (newFixedType === 'percentage') {
      const pct = parseFloat(newFixedPercentValue);
      if (isNaN(pct) || pct <= 0) return;
      finalPercent = pct;
      finalAmount = Math.round((salary * pct) / 100);
    } else {
      const amt = parseFloat(newFixedAmountValue);
      if (isNaN(amt) || amt <= 0) return;
      finalAmount = amt;
    }

    const newExpense: FixedExpense = {
      id: 'f-' + Date.now(),
      name: newFixedName.trim(),
      amountType: newFixedType,
      percentageValue: finalPercent,
      amount: finalAmount,
      category: newFixedCategory,
      dueDate: newFixedDueDate,
      isPaid: false,
    };

    setFixedExpenses([...fixedExpenses, newExpense]);
    setNewFixedName('');
    setNewFixedAmountValue('');
    setNewFixedPercentValue('');
  };

  const handleRemoveFixedExpense = (id: string) => {
    if (editingId === id) setEditingId(null);
    setFixedExpenses(fixedExpenses.filter((item) => item.id !== id));
  };

  const handleToggleFixedPaid = (id: string) => {
    setFixedExpenses(
      fixedExpenses.map((item) =>
        item.id === id ? { ...item, isPaid: !item.isPaid } : item
      )
    );
  };

  // Start editing a specific fixed expense
  const handleStartEditing = (fe: FixedExpense) => {
    setEditingId(fe.id);
    setEditName(fe.name);
    const isPct = fe.amountType === 'percentage';
    setEditType(isPct ? 'percentage' : 'amount');
    if (isPct) {
      setEditPercentVal(String(fe.percentageValue ?? ''));
      setEditAmountVal('');
    } else {
      setEditAmountVal(String(fe.amount ?? ''));
      setEditPercentVal('');
    }
    setEditCategory(fe.category || FIXED_CATEGORIES[0]);
    setEditDueDate(fe.dueDate ?? 5);
  };

  // Save the inline edited fixed expense
  const handleSaveEditing = (id: string) => {
    if (!editName.trim()) return;

    let finalAmount = 0;
    let finalPercent: number | undefined = undefined;

    if (editType === 'percentage') {
      const pct = parseFloat(editPercentVal);
      if (isNaN(pct) || pct <= 0) return;
      finalPercent = pct;
      finalAmount = Math.round((salary * pct) / 100);
    } else {
      const amt = parseFloat(editAmountVal);
      if (isNaN(amt) || amt <= 0) return;
      finalAmount = amt;
    }

    setFixedExpenses(
      fixedExpenses.map((item) =>
        item.id === id
          ? {
              ...item,
              name: editName.trim(),
              amountType: editType,
              percentageValue: finalPercent,
              amount: finalAmount,
              category: editCategory,
              dueDate: editDueDate,
            }
          : item
      )
    );

    setEditingId(null);
  };

  const handleCancelEditing = () => {
    setEditingId(null);
  };

  const handleSave = () => {
    // Re-evaluate amounts with current salary before saving
    const updatedFixedExpenses = fixedExpenses.map((fe) => {
      const currentAmount = getFixedExpenseAmount(fe, salary);
      return {
        ...fe,
        amount: currentAmount,
      };
    });

    onSave({
      ...config,
      salary: Number(salary) || 0,
      salaryStartDate,
      savingsType,
      savingsGoal: effectiveSavingsGoal,
      savingsPercent: savingsType === 'percentage' ? Number(savingsPercent) || 0 : undefined,
      currency,
      fixedExpenses: updatedFixedExpenses,
      categoryLimits,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div 
        id="modal-budget-config"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl my-6 overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-400" />
              <span>Configuración de Presupuesto Mensual</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Configura tu sueldo, gastos fijos (monto o % del sueldo) y meta de ahorro
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Section 1: Sueldo, Moneda & Fecha de Ingreso del Sueldo */}
          <div className="space-y-3 bg-slate-800/30 p-4 rounded-xl border border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-blue-400" />
                  <span>Sueldo Mensual / Ingresos Netos</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-slate-400 font-bold text-lg">
                    {currency}
                  </span>
                  <input
                    id="input-config-salary"
                    type="number"
                    min="0"
                    step="any"
                    value={salary || ''}
                    onChange={(e) => setSalary(parseFloat(e.target.value) || 0)}
                    placeholder="Ej. 1200000"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-lg font-bold text-white focus:outline-hidden focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-slate-400" />
                  <span>Moneda</span>
                </label>
                <select
                  id="select-config-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-hidden focus:border-emerald-500"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fecha de Ingreso del Sueldo (Calendario 30 días) */}
            <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>Fecha de Cobro / Ingreso de Dinero</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  Selecciona la fecha en que cobraste para iniciar tu ciclo financiero de 30 días exactos.
                </p>
              </div>
              <div className="sm:w-48">
                <input
                  id="input-config-salary-start-date"
                  type="date"
                  value={salaryStartDate}
                  onChange={(e) => setSalaryStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-medium text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Meta de Ahorro con opción Monto o % */}
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <PiggyBank className="w-4 h-4 text-emerald-400" />
                <span>Meta de Ahorro Mensual</span>
              </label>

              {/* Selector Monto vs Porcentaje */}
              <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setSavingsType('amount')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 ${
                    savingsType === 'amount'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <DollarSign className="w-3 h-3" />
                  <span>Monto Fijo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSavingsType('percentage')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 ${
                    savingsType === 'percentage'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Percent className="w-3 h-3" />
                  <span>% del Sueldo</span>
                </button>
              </div>
            </div>

            {savingsType === 'percentage' ? (
              <div>
                <div className="relative flex items-center">
                  <input
                    id="input-config-savings-percent"
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={savingsPercent || ''}
                    onChange={(e) => setSavingsPercent(parseFloat(e.target.value) || 0)}
                    placeholder="Ej. 10"
                    className="w-full pl-4 pr-12 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-lg font-bold text-emerald-400 focus:outline-hidden focus:border-emerald-500"
                  />
                  <span className="absolute right-4 text-slate-400 font-bold text-lg">
                    %
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span>Sugerencias:</span>
                    {[5, 10, 15, 20].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setSavingsPercent(pct)}
                        className={`px-2 py-0.5 rounded-md border text-[11px] font-medium transition-colors ${
                          savingsPercent === pct 
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                    = {formatCurrency(effectiveSavingsGoal, currency)} protegidos
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-slate-400 font-bold text-lg">
                    {currency}
                  </span>
                  <input
                    id="input-config-savings-amount"
                    type="number"
                    min="0"
                    step="any"
                    value={savingsAmount || ''}
                    onChange={(e) => setSavingsAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Ej. 200000"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-lg font-bold text-emerald-400 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span>Atajos por %:</span>
                    {[10, 15, 20].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setSavingsAmount(Math.round(salary * (pct / 100)))}
                        className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px]"
                      >
                        {pct}% ({formatCurrency(salary * (pct / 100), currency)})
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-medium text-emerald-400">
                    {salary > 0 ? `${((effectiveSavingsGoal / salary) * 100).toFixed(1)}% de tu sueldo` : ''}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Gastos Fijos (Monto o %) */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-purple-400" />
                  <span>Gastos Fijos Mensuales ({fixedExpenses.length})</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Haz clic en cualquier monto o en el lápiz para editar su valor o porcentaje.
                </p>
              </div>
              <span className="text-xs font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg">
                Total Fijos: {formatCurrency(totalFixed, currency)} ({salary > 0 ? Math.round((totalFixed / salary) * 100) : 0}%)
              </span>
            </div>

            {/* Presets rápidos */}
            <div className="bg-slate-800/20 p-2.5 rounded-xl border border-slate-800 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mr-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Cargar rápido:
              </span>
              <button
                type="button"
                onClick={() => applyPreset('Cuota alimentaria', 'percentage', 20, 'Familia y Alimentos', 10)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-[11px] font-medium transition-colors"
              >
                Cuota alimentaria (20% sueldo)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('Nafta / Combustible', 'amount', 180000, 'Transporte y Combustible', 5)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 text-[11px] font-medium transition-colors"
              >
                Nafta ($ 180.000)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('Alquiler / Hipoteca', 'amount', 350000, 'Vivienda', 5)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium transition-colors"
              >
                Alquiler ($ 350.000)
              </button>
            </div>

            {/* List of existing fixed expenses */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {fixedExpenses.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 bg-slate-800/30 rounded-xl border border-dashed border-slate-800">
                  Aún no has cargado gastos fijos. Agrega cuota alimentaria, nafta, alquiler, etc. eligiendo Monto o % del sueldo.
                </div>
              ) : (
                fixedExpenses.map((fe) => {
                  const isEditingThis = editingId === fe.id;
                  const itemAmount = getFixedExpenseAmount(fe, salary);
                  const isPercentage = fe.amountType === 'percentage';
                  const pctOfSalary = salary > 0 ? ((itemAmount / salary) * 100).toFixed(1) : '0';

                  if (isEditingThis) {
                    // Inline Edit Panel for this expense
                    return (
                      <div 
                        key={fe.id}
                        className="bg-slate-800 border-2 border-purple-500/70 p-3.5 rounded-xl shadow-lg space-y-3 animate-in fade-in"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                            <Pencil className="w-3.5 h-3.5 text-purple-400" />
                            <span>Modificar gasto: {fe.name}</span>
                          </span>

                          {/* Toggle Monto vs % */}
                          <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-700">
                            <button
                              type="button"
                              onClick={() => setEditType('amount')}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                                editType === 'amount'
                                  ? 'bg-purple-600 text-white'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>Monto ($)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditType('percentage')}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                                editType === 'percentage'
                                  ? 'bg-purple-600 text-white'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Percent className="w-3 h-3" />
                              <span>% Sueldo</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                          {/* Nombre */}
                          <div className="sm:col-span-5">
                            <label className="block text-[10px] text-slate-400 mb-1">Nombre</label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium focus:outline-hidden focus:border-purple-500"
                            />
                          </div>

                          {/* Monto o Porcentaje */}
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] text-slate-400 mb-1">
                              {editType === 'percentage' ? '% del Sueldo' : `Monto (${currency})`}
                            </label>
                            {editType === 'percentage' ? (
                              <div className="relative flex items-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="any"
                                  value={editPercentVal}
                                  onChange={(e) => setEditPercentVal(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEditing(fe.id);
                                  }}
                                  autoFocus
                                  placeholder="Ej. 20"
                                  className="w-full pl-3 pr-7 py-1.5 bg-slate-900 border border-purple-500/50 rounded-lg text-white font-bold focus:outline-hidden focus:border-purple-400"
                                />
                                <span className="absolute right-2.5 text-purple-400 font-bold">%</span>
                              </div>
                            ) : (
                              <div className="relative flex items-center">
                                <span className="absolute left-2.5 text-slate-400 font-bold">{currency}</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={editAmountVal}
                                  onChange={(e) => setEditAmountVal(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEditing(fe.id);
                                  }}
                                  autoFocus
                                  placeholder="Ej. 35000"
                                  className="w-full pl-7 pr-3 py-1.5 bg-slate-900 border border-purple-500/50 rounded-lg text-white font-bold focus:outline-hidden focus:border-purple-400"
                                />
                              </div>
                            )}
                          </div>

                          {/* Categoría */}
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] text-slate-400 mb-1">Categoría</label>
                            <select
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-hidden focus:border-purple-500"
                            >
                              {FIXED_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Live preview of modified value */}
                        {editType === 'percentage' && editPercentVal && (
                          <div className="text-[11px] text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg flex items-center justify-between">
                            <span>Equivale a: <strong>{formatCurrency((salary * (parseFloat(editPercentVal) || 0)) / 100, currency)}</strong> por mes</span>
                            <span className="text-[10px] text-purple-400">(Calculado s/ sueldo de {formatCurrency(salary, currency)})</span>
                          </div>
                        )}

                        {editType === 'amount' && editAmountVal && salary > 0 && (
                          <div className="text-[11px] text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg flex items-center justify-between">
                            <span>Equivale al <strong>{(((parseFloat(editAmountVal) || 0) / salary) * 100).toFixed(1)}%</strong> del sueldo mensual</span>
                            <span className="text-[10px] text-blue-400">({formatCurrency(parseFloat(editAmountVal) || 0, currency)})</span>
                          </div>
                        )}

                        {/* Actions for inline edit */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span>Vence día:</span>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={editDueDate}
                              onChange={(e) => setEditDueDate(parseInt(e.target.value) || 1)}
                              className="w-12 px-1.5 py-1 bg-slate-900 border border-slate-700 rounded-md text-white text-center text-xs"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleCancelEditing}
                              className="px-2.5 py-1 text-xs text-slate-400 hover:text-white rounded-lg transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditing(fe.id)}
                              className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Guardar Cambios</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Default row (non-editing)
                  return (
                    <div 
                      key={fe.id} 
                      className="group flex items-center justify-between bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/60 hover:border-purple-500/50 px-3 py-2.5 rounded-xl text-xs transition-all"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                        <button
                          type="button"
                          onClick={() => handleToggleFixedPaid(fe.id)}
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                            fe.isPaid 
                              ? 'bg-emerald-500 border-emerald-500 text-slate-900' 
                              : 'border-slate-600 hover:border-slate-500'
                          }`}
                          title={fe.isPaid ? 'Marcado como pagado' : 'Pendiente de pago'}
                        >
                          {fe.isPaid && <Check className="w-3 h-3" />}
                        </button>

                        <div 
                          className="min-w-0 cursor-pointer flex-1"
                          onClick={() => handleStartEditing(fe)}
                          title="Haz clic para editar este gasto"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold truncate hover:text-purple-300 transition-colors ${fe.isPaid ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                              {fe.name}
                            </span>
                            
                            {/* Type badge */}
                            {isPercentage ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-0.5">
                                <Percent className="w-2.5 h-2.5" /> {fe.percentageValue}% del sueldo
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-700/80 text-slate-300 border border-slate-600/50">
                                Monto fijo
                              </span>
                            )}

                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
                              {fe.category}
                            </span>
                          </div>

                          {fe.dueDate && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-2.5 h-2.5" /> Vence día {fe.dueDate} de cada mes
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Interactive Clickable Amount Button */}
                        <button
                          type="button"
                          onClick={() => handleStartEditing(fe)}
                          className="group/amt flex flex-col items-end px-2.5 py-1 rounded-lg hover:bg-purple-500/10 border border-transparent hover:border-purple-500/30 transition-all text-right cursor-pointer"
                          title="Haz clic para modificar el monto o porcentaje"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-sm group-hover/amt:text-purple-300 transition-colors">
                              {formatCurrency(itemAmount, currency)}
                            </span>
                            <Pencil className="w-3 h-3 text-slate-500 group-hover/amt:text-purple-400 transition-colors" />
                          </div>
                          {isPercentage ? (
                            <span className="text-[10px] text-purple-400">
                              {fe.percentageValue}% s/ sueldo
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              {pctOfSalary}% s/ sueldo
                            </span>
                          )}
                        </button>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditing(fe)}
                            className="text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors p-1.5"
                            title="Editar gasto fijo"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFixedExpense(fe.id)}
                            className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors p-1.5"
                            title="Eliminar gasto fijo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Formulario para agregar nuevo gasto fijo */}
            <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-purple-400" />
                  <span>Agregar Nuevo Gasto Fijo</span>
                </span>

                {/* Switch Monto vs % */}
                <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setNewFixedType('amount')}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                      newFixedType === 'amount'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <DollarSign className="w-3 h-3" />
                    <span>Monto Fijo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewFixedType('percentage')}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                      newFixedType === 'percentage'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Percent className="w-3 h-3" />
                    <span>% del Sueldo</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                {/* Nombre */}
                <div className="sm:col-span-5">
                  <label className="block text-[10px] text-slate-400 mb-1">Nombre del gasto</label>
                  <input
                    type="text"
                    placeholder="Ej. Internet y Telefonía, Nafta"
                    value={newFixedName}
                    onChange={(e) => setNewFixedName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-purple-500"
                  />
                </div>

                {/* Valor (Monto o %) */}
                <div className="sm:col-span-4">
                  <label className="block text-[10px] text-slate-400 mb-1">
                    {newFixedType === 'percentage' ? '% Porcentaje del sueldo' : `Monto en ${currency}`}
                  </label>
                  {newFixedType === 'percentage' ? (
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        placeholder="Ej. 20"
                        value={newFixedPercentValue}
                        onChange={(e) => setNewFixedPercentValue(e.target.value)}
                        className="w-full pl-3 pr-7 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-bold focus:outline-hidden focus:border-purple-500"
                      />
                      <span className="absolute right-2.5 text-purple-400 font-bold text-xs">%</span>
                    </div>
                  ) : (
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-slate-400 font-bold text-xs">{currency}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Ej. 180000"
                        value={newFixedAmountValue}
                        onChange={(e) => setNewFixedAmountValue(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-bold focus:outline-hidden focus:border-purple-500"
                      />
                    </div>
                  )}
                </div>

                {/* Categoría */}
                <div className="sm:col-span-3">
                  <label className="block text-[10px] text-slate-400 mb-1">Categoría</label>
                  <select
                    value={newFixedCategory}
                    onChange={(e) => setNewFixedCategory(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-purple-500"
                  >
                    {FIXED_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic conversion helper badge */}
              {newFixedType === 'percentage' && newFixedPercentValue && (
                <div className="text-[11px] text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg flex items-center justify-between">
                  <span>Equivale a: <strong>{formatCurrency((salary * (parseFloat(newFixedPercentValue) || 0)) / 100, currency)}</strong> por mes</span>
                  <span className="text-[10px] text-purple-400">(Calculado sobre sueldo de {formatCurrency(salary, currency)})</span>
                </div>
              )}

              {newFixedType === 'amount' && newFixedAmountValue && salary > 0 && (
                <div className="text-[11px] text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg flex items-center justify-between">
                  <span>Representa el <strong>{(((parseFloat(newFixedAmountValue) || 0) / salary) * 100).toFixed(1)}%</strong> de tu sueldo mensual</span>
                  <span className="text-[10px] text-blue-400">({formatCurrency(parseFloat(newFixedAmountValue) || 0, currency)})</span>
                </div>
              )}

              <div className="flex flex-wrap justify-between items-center pt-1 gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Día de vencimiento:</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={newFixedDueDate}
                    onChange={(e) => setNewFixedDueDate(parseInt(e.target.value) || 1)}
                    className="w-14 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white text-center"
                  />
                  <span className="text-[11px] text-slate-500">(1 - 31)</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddFixedExpense()}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar a fijos</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Límites Máximos por Rubro Diario (Semáforo de Gastos) */}
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Límites Máximos por Tipo de Gasto (% del Sueldo)</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Semáforo: &lt;80% Verde, 80-99% Amarillo, ≥100% Rojo
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Establece el límite máximo permitido para cada rubro. Al llegar al 80% cambiará a amarillo en el gráfico, y a rojo al alcanzarlo.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {DEFAULT_CATEGORIES.map((cat) => {
                const pct = categoryLimits[cat] ?? 5;
                const maxMoney = Math.round((salary * pct) / 100);
                const isPrescindible = cat === 'Prescindibles';
                const isCard = cat === 'Tarjeta de Crédito';

                return (
                  <div 
                    key={cat} 
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                      isPrescindible 
                        ? 'bg-slate-800/80 border-rose-500/30' 
                        : isCard 
                          ? 'bg-slate-800/80 border-purple-500/30' 
                          : 'bg-slate-800/40 border-slate-700/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">{cat}</span>
                        {isPrescindible && (
                          <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1 rounded font-semibold shrink-0">
                            Prescindible
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Tope: <strong className="text-slate-200">{formatCurrency(maxMoney, currency)}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCategoryLimits((prev) => ({
                          ...prev,
                          [cat]: Math.max(1, (prev[cat] ?? 5) - 1),
                        }))}
                        className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs font-bold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={pct}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(100, parseFloat(e.target.value) || 1));
                          setCategoryLimits((prev) => ({ ...prev, [cat]: val }));
                        }}
                        className="w-8 text-center bg-transparent text-emerald-400 font-bold text-xs focus:outline-hidden font-mono"
                      />
                      <span className="text-[10px] text-slate-400 font-bold mr-1">%</span>
                      <button
                        type="button"
                        onClick={() => setCategoryLimits((prev) => ({
                          ...prev,
                          [cat]: Math.min(100, (prev[cat] ?? 5) + 1),
                        }))}
                        className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 5: Live Math Preview Box */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
            <div className="flex justify-between text-slate-400">
              <span>Sueldo Bruto:</span>
              <span className="font-bold text-slate-200">{formatCurrency(salary, currency)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span className="flex items-center gap-1">
                <span>- Total Gastos Fijos ({fixedExpenses.length}):</span>
              </span>
              <span className="text-purple-400 font-bold">
                - {formatCurrency(totalFixed, currency)} {salary > 0 ? `(${((totalFixed / salary) * 100).toFixed(1)}%)` : ''}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>- Meta de Ahorro:</span>
              <span className="text-emerald-400 font-bold">
                - {formatCurrency(effectiveSavingsGoal, currency)} {salary > 0 ? `(${((effectiveSavingsGoal / salary) * 100).toFixed(1)}%)` : ''}
              </span>
            </div>
            <div className="flex justify-between text-slate-200 pt-2 border-t border-slate-800 font-bold text-sm">
              <div>
                <span>Presupuesto para Gastos Diarios:</span>
                <span className="block text-[11px] font-normal text-slate-400">
                  {disposable > 0 ? `Promedio aprox. ${formatCurrency(Math.round(disposable / 30), currency)}/día` : 'Sin saldo para gastos diarios'}
                </span>
              </div>
              <span className={`text-base ${disposable > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                {formatCurrency(disposable, currency)}
              </span>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Configuración</span>
          </button>
        </div>

      </div>
    </div>
  );
};
