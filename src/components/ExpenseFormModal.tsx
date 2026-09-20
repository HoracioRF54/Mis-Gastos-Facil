import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Plus, 
  Check, 
  Calendar, 
  CreditCard, 
  Tag, 
  FileText,
  Trash2,
  Edit3,
  Sliders,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { DailyExpense, BudgetConfig, DEFAULT_CATEGORIES, DEFAULT_CATEGORY_LIMITS } from '../types';
import { CATEGORY_COLORS, formatCurrency, getCategoryLimits } from '../utils/calculations';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expense: Omit<DailyExpense, 'id' | 'createdAt'>) => void;
  onDelete?: (expenseId: string) => void;
  initialDate: string;
  currency: string;
  editingExpense?: DailyExpense | null;
  config?: BudgetConfig;
  expenses?: DailyExpense[];
  onUpdateCategoryLimit?: (category: string, maxPercentage: number) => void;
}

const CATEGORIES = DEFAULT_CATEGORIES;

const PAYMENT_METHODS = ['Tarjeta de Débito', 'Efectivo', 'Tarjeta de Crédito', 'Transferencia'];

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialDate,
  currency,
  editingExpense,
  config,
  expenses = [],
  onUpdateCategoryLimit,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(initialDate);
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [isFixed, setIsFixed] = useState<boolean>(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingExpense) {
      setAmount(String(editingExpense.amount));
      setCategory(editingExpense.category);
      setDescription(editingExpense.description);
      setDate(editingExpense.date);
      setPaymentMethod(editingExpense.paymentMethod || PAYMENT_METHODS[0]);
      setIsFixed(!!editingExpense.isFixed);
    } else {
      setAmount('');
      setCategory(CATEGORIES[0]);
      setDescription('');
      setDate(initialDate);
      setPaymentMethod(PAYMENT_METHODS[0]);
      setIsFixed(false);
    }
  }, [editingExpense, initialDate, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (amountInputRef.current) {
          amountInputRef.current.focus();
          amountInputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Category Limit & Live Traffic Light Calculations
  const salary = Number(config?.salary) || 0;
  const currentLimits = config ? getCategoryLimits(config) : DEFAULT_CATEGORY_LIMITS;
  const categoryLimitPct = currentLimits[category] ?? 5;
  const maxAllowedAmount = Math.round((salary * categoryLimitPct) / 100);

  // Month spending in this category (only variable expenses count towards category variable limits)
  const targetMonthStr = date ? date.slice(0, 7) : new Date().toISOString().slice(0, 7);
  const monthCategoryExpenses = expenses.filter(
    (e) => e.category === category && !e.isFixed && e.date.startsWith(targetMonthStr) && (!editingExpense || e.id !== editingExpense.id)
  );
  const spentBeforeThis = monthCategoryExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  
  const currentExpenseNum = parseFloat(amount.replace(/,/g, '.')) || 0;
  // If user marked this expense as fixed, it does not add to the variable category limit
  const projectedTotal = spentBeforeThis + (isFixed ? 0 : currentExpenseNum);
  const projectedUsage = maxAllowedAmount > 0 ? (projectedTotal / maxAllowedAmount) * 100 : (projectedTotal > 0 ? 100 : 0);

  const handleUpdateLimit = (newPct: number) => {
    const validPct = Math.max(1, Math.min(100, Math.round(newPct)));
    if (onUpdateCategoryLimit) {
      onUpdateCategoryLimit(category, validPct);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/,/g, '.'));
    if (!numAmount || numAmount <= 0) return;

    onSubmit({
      amount: numAmount,
      category,
      description: description.trim() || category,
      date,
      paymentMethod,
      isFixed,
    });

    onClose();
  };

  const handleDelete = () => {
    if (editingExpense && onDelete) {
      if (window.confirm('¿Estás seguro de que deseas eliminar este gasto registrado?')) {
        onDelete(editingExpense.id);
        onClose();
      }
    }
  };

  const handleQuickAddAmount = (addValue: number) => {
    const current = parseFloat(amount) || 0;
    setAmount(String(current + addValue));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div 
        id="modal-expense-form"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            {editingExpense ? (
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Edit3 className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Plus className="w-4 h-4" />
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-white">
                {editingExpense ? 'Modificar o Corregir Gasto' : 'Cargar Nuevo Gasto Diario'}
              </h3>
              <p className="text-xs text-slate-400">
                {editingExpense ? 'Edita el monto, categoría o descripción' : 'Se restará de tu cuota diaria recomendada'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-expense-modal"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Amount Input with Currency Symbol */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Monto del Gasto
              </label>
              {editingExpense && (
                <span className="text-[11px] text-blue-400 font-medium">
                  Escribe el nuevo monto para corregir
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-slate-400 font-bold text-xl">
                {currency}
              </span>
              <input
                ref={amountInputRef}
                id="input-expense-amount"
                type="number"
                step="any"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-2xl font-black text-white focus:outline-hidden focus:border-emerald-500 transition-colors"
              />
            </div>
            
            {/* Quick addition chips */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 text-[11px] shrink-0">+ Rápido:</span>
              {[1000, 2500, 5000, 10000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAddAmount(val)}
                  className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shrink-0 font-mono transition-colors"
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* Category selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Categoría</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                const dotColor = CATEGORY_COLORS[cat] || '#64748B';
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`p-2 rounded-xl text-left text-xs font-medium border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-600/20 border-emerald-500 text-white'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span 
                      className="w-2 h-2 rounded-full mb-1.5" 
                      style={{ backgroundColor: dotColor }}
                    />
                    <span className="truncate w-full">{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Max % Limit Control & Real-Time Traffic Light Preview */}
          <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>Límite Máx Permitido para {category}</span>
              </div>

              {/* Stepper to adjust % */}
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => handleUpdateLimit(categoryLimitPct - 1)}
                  className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 font-bold text-xs cursor-pointer"
                  title="Disminuir 1%"
                >
                  -
                </button>
                <div className="flex items-center px-1">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={categoryLimitPct}
                    onChange={(e) => handleUpdateLimit(parseFloat(e.target.value) || 0)}
                    className="w-8 text-center bg-transparent text-emerald-400 font-bold text-xs focus:outline-hidden font-mono"
                  />
                  <span className="text-slate-400 text-[10px] font-semibold">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateLimit(categoryLimitPct + 1)}
                  className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 font-bold text-xs cursor-pointer"
                  title="Aumentar 1%"
                >
                  +
                </button>
              </div>
            </div>

            {/* Financial and percentage breakdown */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-1 pt-1 border-t border-slate-700/50">
              <span>Tope: <strong className="text-slate-200">{formatCurrency(maxAllowedAmount, currency)}</strong> ({categoryLimitPct}% del sueldo)</span>
              <span>Gastado antes: <strong className="text-slate-200">{formatCurrency(spentBeforeThis, currency)}</strong></span>
            </div>

            {/* Traffic light visual feedback with semantic colors */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">
                  Con este gasto sumará: <strong className="text-white">{formatCurrency(projectedTotal, currency)}</strong>
                </span>

                <span className={`font-semibold flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] ${
                  projectedUsage >= 100
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : projectedUsage >= 80
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    projectedUsage >= 100
                      ? 'bg-rose-500'
                      : projectedUsage >= 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`} />
                  {projectedUsage >= 100
                    ? `Rojo: Límite Alcanzado (${Math.round(projectedUsage)}%)`
                    : projectedUsage >= 80
                      ? `Amarillo: Alerta 80%+ (${Math.round(projectedUsage)}%)`
                      : `Verde: Permitido (${Math.round(projectedUsage)}%)`}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden relative">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    projectedUsage >= 100
                      ? 'bg-rose-500'
                      : projectedUsage >= 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, projectedUsage)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Descripción / Detalle</span>
            </label>
            <input
              id="input-expense-description"
              type="text"
              placeholder="Ej. Combustible mensual, Farmacia, Almuerzo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Gasto Fijo vs Variable Selector */}
          <div className="p-3.5 rounded-xl border transition-all bg-slate-850 border-slate-700/80 hover:border-slate-600">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                id="checkbox-is-fixed-expense"
                type="checkbox"
                checked={isFixed}
                onChange={(e) => setIsFixed(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded-md border-slate-650 bg-slate-800 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900 cursor-pointer accent-purple-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${isFixed ? 'text-purple-300' : 'text-slate-200'}`}>
                    ¿Es un Gasto Fijo?
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    isFixed 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' 
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {isFixed ? 'Agrupado en Fijos' : 'Variable / Resta de Cuota'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {isFixed
                    ? '✓ Al estar tildado, se agrupa directamente en la porción de Gastos Fijos (ej. Nafta fija, cuota escolar) sin saturar tu límite diario ni las categorías variables.'
                    : '✗ Al no estar tildado, se computa como gasto del día, restando de tu cuota diaria recomendada y sumando al límite de la categoría.'}
                </p>
              </div>
            </label>
          </div>

          {/* Date & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Fecha del Gasto</span>
              </label>
              <input
                id="input-expense-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span>Método de Pago</span>
              </label>
              <select
                id="select-expense-payment"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-emerald-500"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>{pm}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit & Delete Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
            {editingExpense && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="w-full sm:w-auto px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar</span>
              </button>
            )}
            
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-3 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>

            <button
              id="btn-submit-expense"
              type="submit"
              className="w-full flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{editingExpense ? 'Guardar Cambios' : 'Registrar Gasto y Actualizar Cuota'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
