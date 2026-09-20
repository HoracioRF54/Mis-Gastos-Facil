import React, { useState } from 'react';
import { 
  Search, 
  Trash2, 
  Edit3, 
  Filter, 
  Calendar, 
  CreditCard, 
  Receipt,
  PlusCircle,
  ArrowRightLeft
} from 'lucide-react';
import { DailyExpense, BudgetConfig, DEFAULT_CATEGORIES } from '../types';
import { formatCurrency, CATEGORY_COLORS, parseDateParts, getFixedExpenseAmount } from '../utils/calculations';

interface ExpenseListProps {
  expenses: DailyExpense[];
  config?: BudgetConfig;
  currentMonth: string;
  selectedDate: string;
  currency: string;
  onEditExpense: (expense: DailyExpense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onOpenAddExpense: () => void;
  onSelectDate?: (date: string) => void;
  onConvertFixedToVariable?: (fixedExpenseId: string) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  config,
  currentMonth,
  selectedDate,
  currency,
  onEditExpense,
  onDeleteExpense,
  onOpenAddExpense,
  onSelectDate,
  onConvertFixedToVariable,
}) => {
  // Default to all_month so users never feel previous days' expenses vanished
  const [filterMode, setFilterMode] = useState<'all_month' | 'selected_day' | 'today'>('all_month');
  const [typeFilter, setTypeFilter] = useState<'all' | 'variable' | 'fixed'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const now = new Date();
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Map unlinked fixed expenses from config.fixedExpenses into displayable items
  const linkedFixedIds = new Set(
    expenses.filter((e) => e.date.startsWith(currentMonth) && e.fixedExpenseId).map((e) => e.fixedExpenseId)
  );

  const unlinkedFixedConfig: DailyExpense[] = (config?.fixedExpenses || [])
    .filter((fe) => !linkedFixedIds.has(fe.id))
    .map((fe) => {
      const amount = getFixedExpenseAmount(fe, config?.salary || 0);
      const dayStr = fe.dueDate ? String(fe.dueDate).padStart(2, '0') : '01';
      return {
        id: `fe-${fe.id}`,
        amount,
        category: fe.category || 'Tarjeta de Crédito',
        description: fe.name,
        date: `${currentMonth}-${dayStr}`,
        paymentMethod: fe.category?.toLowerCase().includes('tarjeta') ? 'Tarjeta de Crédito' : 'Transferencia',
        isFixed: true,
        fixedExpenseId: fe.id,
        createdAt: 0,
      };
    });

  // Filter expenses strictly for current month first, including fixed items
  const monthExpenses = [...expenses.filter((e) => e.date.startsWith(currentMonth)), ...unlinkedFixedConfig]
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));

  const todayCount = monthExpenses.filter((e) => e.date === todayDateStr).length;

  // Apply sub-filters
  const filtered = monthExpenses.filter((e) => {
    // Type filter
    if (typeFilter === 'variable' && e.isFixed) {
      return false;
    }
    if (typeFilter === 'fixed' && !e.isFixed) {
      return false;
    }

    // Date filter
    if (filterMode === 'selected_day' && e.date !== selectedDate) {
      return false;
    }
    if (filterMode === 'today' && e.date !== todayDateStr) {
      return false;
    }
    // Category filter
    if (selectedCategory !== 'all' && e.category !== selectedCategory) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = e.description.toLowerCase().includes(q);
      const matchCat = e.category.toLowerCase().includes(q);
      if (!matchDesc && !matchCat) return false;
    }
    return true;
  });

  const totalFilteredAmount = filtered.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalMonthAmount = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const categoriesList = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...monthExpenses.map((e) => e.category)])
  );

  const { year, month, day } = parseDateParts(selectedDate);
  const selectedDayLabel = new Date(year, month, day).toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'short' 
  });

  const getItemDateLabel = (dateStr: string) => {
    if (dateStr === todayDateStr) return 'Hoy';
    const parts = parseDateParts(dateStr);
    const itemDate = new Date(parts.year, parts.month, parts.day);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (dateStr === yesterdayStr) return 'Ayer';
    return itemDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <div id="expense-list-container" className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-sm">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              Historial y Registro de Gastos
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {filterMode === 'all_month' 
              ? `Historial completo del mes (${monthExpenses.length} gastos acumulados)`
              : filterMode === 'today'
              ? 'Gastos registrados en el día de hoy'
              : `Gastos del día ${selectedDayLabel}`}
            <span className="hidden sm:inline text-blue-400 ml-2 font-medium">
              • Toca cualquier monto para corregirlo
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          {/* Date Range Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-medium">
              <button
                id="filter-month"
                onClick={() => setFilterMode('all_month')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterMode === 'all_month' 
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Todo el Mes ({monthExpenses.length})
              </button>
              <button
                id="filter-today"
                onClick={() => setFilterMode('today')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterMode === 'today' 
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Solo Hoy ({todayCount})
              </button>
              <button
                id="filter-day"
                onClick={() => setFilterMode('selected_day')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterMode === 'selected_day' 
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Por Día ({selectedDayLabel})
              </button>
            </div>

            {/* Type Filter (Todos / Variables / Fijos) */}
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-medium">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  typeFilter === 'all' 
                    ? 'bg-slate-700 text-white font-semibold' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Mostrar todos los gastos"
              >
                Todos
              </button>
              <button
                onClick={() => setTypeFilter('variable')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  typeFilter === 'variable' 
                    ? 'bg-emerald-600/80 text-white font-semibold' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Solo gastos variables sujetos a límites"
              >
                Variables
              </button>
              <button
                onClick={() => setTypeFilter('fixed')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  typeFilter === 'fixed' 
                    ? 'bg-purple-600/80 text-white font-semibold' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Solo gastos fijos (Tarjeta, Alquiler, etc.)"
              >
                Fijos
              </button>
            </div>
          </div>

          <button
            onClick={onOpenAddExpense}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nuevo Gasto</span>
          </button>
        </div>
      </div>

      {/* Helpful banner explaining persistence across days */}
      {filterMode !== 'all_month' && monthExpenses.length > filtered.length && (
        <div className="mt-3 px-3.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center justify-between gap-2">
          <span>
            💡 Mostrando {filtered.length} gastos para esta fecha. Tienes <strong>{monthExpenses.length} gastos guardados</strong> en total en el mes ({formatCurrency(totalMonthAmount, currency)}).
          </span>
          <button
            type="button"
            onClick={() => setFilterMode('all_month')}
            className="text-xs text-white font-semibold underline shrink-0 hover:text-blue-200"
          >
            Ver todos
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        {/* Search */}
        <div className="relative sm:col-span-2 flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por descripción o categoría..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500"
          >
            <option value="all">Todas las Categorías</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Total Filtered Header */}
      <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
        <span>{filtered.length} transacciones encontradas</span>
        <span>
          Total en vista: <strong className="text-white text-sm">{formatCurrency(totalFilteredAmount, currency)}</strong>
        </span>
      </div>

      {/* Expense Items List */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-slate-800/20 border border-dashed border-slate-800 rounded-xl">
            <Receipt className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-xs">No hay gastos para este filtro de fecha o búsqueda.</p>
            <button
              onClick={onOpenAddExpense}
              className="mt-3 text-xs text-emerald-400 hover:underline font-medium inline-flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Cargar gasto ahora
            </button>
          </div>
        ) : (
          filtered.map((item) => {
            const dotColor = CATEGORY_COLORS[item.category] || '#64748B';
            return (
              <div
                key={item.id}
                className="flex items-center justify-between bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 hover:border-blue-500/40 p-3 rounded-xl transition-all group"
              >
                {/* Left Info: Clickable to edit */}
                <div 
                  className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 pr-2"
                  onClick={() => onEditExpense(item)}
                  title="Haz clic para editar este gasto"
                >
                  <div 
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: dotColor }}
                    title={item.category}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-100 group-hover:text-blue-300 transition-colors truncate">
                        {item.description}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium shrink-0">
                        {item.category}
                      </span>
                      {item.isFixed && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold shrink-0">
                          Gasto Fijo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 text-[11px] text-slate-400 mt-1">
                      <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md ${
                        item.date === todayDateStr 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-slate-700/60 text-slate-300'
                      }`}>
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {getItemDateLabel(item.date)} ({item.date.slice(5)})
                      </span>
                      {item.paymentMethod && (
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3 text-slate-500" />
                          {item.paymentMethod}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount & Actions: Interactive clickable amount button */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEditExpense(item)}
                    className="group/amt flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-blue-500/20 border border-slate-700/80 hover:border-blue-500/50 transition-all text-white hover:text-blue-300 cursor-pointer shadow-xs"
                    title="Haz clic aquí para cambiar el monto o corregir equivocación"
                  >
                    <span className="text-sm font-bold tracking-tight">
                      {formatCurrency(item.amount, currency)}
                    </span>
                    <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover/amt:text-blue-400 transition-colors" />
                  </button>

                  <div className="flex items-center gap-1">
                    {item.isFixed && (
                      <button
                        type="button"
                        onClick={() => {
                          if (item.fixedExpenseId && onConvertFixedToVariable) {
                            onConvertFixedToVariable(item.fixedExpenseId);
                          } else {
                            onEditExpense({ ...item, isFixed: false });
                          }
                        }}
                        className="px-2 py-1.5 rounded-lg bg-purple-950/70 hover:bg-purple-900 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                        title="Destildar de Gasto Fijo: pasará a gasto variable y figurará en el Panel de Límites de Consumo"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
                        <span className="hidden sm:inline">Destildar</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onEditExpense(item)}
                      className="p-1.5 text-slate-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Editar gasto (puedes destildar la opción de gasto fijo en el formulario)"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteExpense(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Eliminar gasto"
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

    </div>
  );
};
