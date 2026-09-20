import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Settings, 
  Smartphone, 
  RefreshCw, 
  ArrowDownCircle, 
  Sparkles,
  BarChart2,
  Calendar
} from 'lucide-react';
import { AppData, DailyExpense, BudgetConfig, createDefaultAppData } from './types';
import { syncService, ConnectionStatus } from './services/syncService';
import { calculateDailyMetrics, getCurrentMonthString, getTodayDateString } from './utils/calculations';

import { Navbar } from './components/Navbar';
import { DailyAllowanceCard } from './components/DailyAllowanceCard';
import { SummaryCards } from './components/SummaryCards';
import { MonthlyCharts } from './components/MonthlyCharts';
import { ExpenseList } from './components/ExpenseList';
import { ExpenseFormModal } from './components/ExpenseFormModal';
import { BudgetConfigModal } from './components/BudgetConfigModal';
import { DeviceSyncModal } from './components/DeviceSyncModal';
import { CommercialLicenseModal } from './components/CommercialLicenseModal';
import { InstallAppModal } from './components/InstallAppModal';
import { InstallPromptBanner } from './components/InstallPromptBanner';

export default function App() {
  const [data, setData] = useState<AppData>(() => {
    const cached = syncService.getCurrentData();
    if (cached) return cached;
    return createDefaultAppData(syncService.getSyncCode());
  });
  const [syncStatus, setSyncStatus] = useState<ConnectionStatus>(() => syncService.getStatus());
  const [peerCount, setPeerCount] = useState<number>(() => syncService.getPeerCount());
  
  // Selected month (YYYY-MM) and selected day (YYYY-MM-DD)
  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonthString());
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  // Modal open states
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  
  // Editing expense state
  const [editingExpense, setEditingExpense] = useState<DailyExpense | null>(null);

  // Initialize and connect sync service
  useEffect(() => {
    syncService.connect();

    const unsubscribeData = syncService.subscribe((newData) => {
      setData(newData);
      if (newData.config && newData.config.month) {
        setCurrentMonth(newData.config.month);
      }
    });

    const unsubscribeStatus = syncService.subscribeStatus((status, count) => {
      setSyncStatus(status);
      setPeerCount(count);
    });

    return () => {
      unsubscribeData();
      unsubscribeStatus();
    };
  }, []);

  // Sync date when month changes
  const handleMonthChange = (newMonth: string) => {
    setCurrentMonth(newMonth);
    // If selected date is in a different month, reset to day 1 or today of that month
    if (!selectedDate.startsWith(newMonth)) {
      setSelectedDate(`${newMonth}-01`);
    }
  };

  // Calculate live daily allowance metrics for target date
  const dailyMetrics = calculateDailyMetrics(data.config, data.dailyExpenses, selectedDate);
  const totalDailySpentMonth = data.dailyExpenses
    .filter((e) => e.date.startsWith(currentMonth))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Handlers for mutations
  const handleSaveBudgetConfig = (newConfig: BudgetConfig) => {
    syncService.updateBudgetConfig({
      ...newConfig,
      month: currentMonth,
    });
  };

  const handleAddExpense = (expense: Omit<DailyExpense, 'id' | 'createdAt'>) => {
    if (editingExpense) {
      syncService.updateExpense({
        ...editingExpense,
        ...expense,
      });
      setEditingExpense(null);
    } else {
      syncService.addExpense(expense);
    }
  };

  const handleEditExpense = (expense: DailyExpense) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  const handleDeleteExpense = (expenseId: string) => {
    syncService.deleteExpense(expenseId);
  };

  const handleConvertFixedToVariable = (fixedExpenseId: string) => {
    syncService.convertFixedToVariable(fixedExpenseId, selectedDate || `${currentMonth}-01`);
  };

  const handleConvertVariableToFixed = (expenseId: string) => {
    syncService.convertVariableToFixed(expenseId);
  };

  const handleDeleteFixedExpense = (fixedExpenseId: string) => {
    syncService.removeFixedExpense(fixedExpenseId);
  };

  const handleActivateLicense = (license: AppData['license']) => {
    syncService.updateLicense(license);
  };

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setIsExpenseModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-24 md:pb-12 selection:bg-emerald-500/30">
      
      {/* Top Navigation */}
      <Navbar
        currentMonth={currentMonth}
        onMonthChange={handleMonthChange}
        syncStatus={syncStatus}
        peerCount={peerCount}
        syncCode={data.syncCode}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenConfig={() => setIsConfigModalOpen(true)}
        onOpenLicense={() => setIsLicenseModalOpen(true)}
        onOpenInstall={() => setIsInstallModalOpen(true)}
        isPro={Boolean(data.license?.isActive)}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Top Financial Pillars (Sueldo, Gastos Fijos, Ahorro, Restante) */}
        <SummaryCards
          config={data.config}
          totalDailySpentMonth={totalDailySpentMonth}
          onOpenConfig={() => setIsConfigModalOpen(true)}
        />

        {/* Central Card: Daily Allowance with Red / Green Indicators */}
        <DailyAllowanceCard
          metrics={dailyMetrics}
          currency={data.config.currency}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onOpenAddExpense={handleOpenAdd}
          todayExpenses={data.dailyExpenses.filter((e) => e.date === selectedDate)}
          onEditExpense={handleEditExpense}
        />

        {/* Monthly Charts Panel */}
        <MonthlyCharts
          config={data.config}
          expenses={data.dailyExpenses}
          currentMonth={currentMonth}
          onUpdateCategoryLimit={(category, maxPercentage) => {
            syncService.updateCategoryLimit(category, maxPercentage);
          }}
          onUpdateAllCategoryLimits={(limits) => {
            syncService.updateAllCategoryLimits(limits);
          }}
          onConvertFixedToVariable={handleConvertFixedToVariable}
          onConvertVariableToFixed={handleConvertVariableToFixed}
          onEditExpense={handleEditExpense}
          onDeleteFixedExpense={handleDeleteFixedExpense}
        />

        {/* Expense List and Daily Activity */}
        <ExpenseList
          expenses={data.dailyExpenses}
          config={data.config}
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          currency={data.config.currency}
          onEditExpense={handleEditExpense}
          onDeleteExpense={handleDeleteExpense}
          onOpenAddExpense={handleOpenAdd}
          onConvertFixedToVariable={handleConvertFixedToVariable}
        />

      </main>

      {/* Floating Bottom Action Bar for Mobile Thumb Ergonomics */}
      <aside aria-label="Acciones rápidas" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 py-2.5 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setIsConfigModalOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 text-[10px] font-medium"
        >
          <Settings className="w-5 h-5" />
          <span>Presupuesto</span>
        </button>

        <button
          id="btn-mobile-add-expense"
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-full shadow-lg shadow-emerald-900/40"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Cargar Gasto</span>
        </button>

        <button
          onClick={() => setIsSyncModalOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 text-[10px] font-medium"
        >
          <Smartphone className="w-5 h-5" />
          <span>Sincronizar</span>
        </button>
      </aside>

      {/* Modals */}
      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSubmit={handleAddExpense}
        onDelete={handleDeleteExpense}
        initialDate={selectedDate}
        currency={data.config.currency}
        editingExpense={editingExpense}
        config={data.config}
        expenses={data.dailyExpenses}
        onUpdateCategoryLimit={(category, maxPercentage) => {
          syncService.updateCategoryLimit(category, maxPercentage);
        }}
      />

      <BudgetConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={data.config}
        onSave={handleSaveBudgetConfig}
      />

      <DeviceSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncCode={data.syncCode}
        onUpdateSyncCode={(newCode) => syncService.setSyncCode(newCode)}
        syncStatus={syncStatus}
        peerCount={peerCount}
        onOpenInstall={() => setIsInstallModalOpen(true)}
      />

      <CommercialLicenseModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        license={data.license}
        onActivateLicense={handleActivateLicense}
        expenses={data.dailyExpenses}
        currency={data.config.currency}
      />

      {/* PWA Install Modal & Banner */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        syncCode={data.syncCode}
      />

      <InstallPromptBanner
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
      />

    </div>
  );
}
