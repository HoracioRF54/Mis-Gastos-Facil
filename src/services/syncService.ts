import { AppData, BudgetConfig, DailyExpense, FixedExpense, createDefaultAppData } from '../types';
import { db, testFirestoreConnection } from './firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { getFixedExpenseAmount, getTodayDateString } from '../utils/calculations';

const STORAGE_KEY_DATA = 'app_gastos_cached_data';
const STORAGE_KEY_MASTER = 'app_gastos_master_data';
const STORAGE_KEY_BACKUP = 'app_gastos_auto_backup';

// Universal Cloud Document ID for frictionless persistence across PC, Mobile, and all devices
const FIRESTORE_DOC_ID = 'mi_presupuesto_principal';

export type ConnectionStatus = 'connecting' | 'connected' | 'offline' | 'error';

class SyncService {
  private status: ConnectionStatus = 'connecting';
  private peerCount: number = 1;
  private listeners: Set<(data: AppData) => void> = new Set();
  private statusListeners: Set<(status: ConnectionStatus, count: number) => void> = new Set();
  private currentData: AppData | null = null;
  private unsubscribeFirestore: (() => void) | null = null;
  private isSaving: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Load cached local data first for instant 0ms app boot
      const cached = localStorage.getItem(STORAGE_KEY_DATA) || 
                     localStorage.getItem(STORAGE_KEY_MASTER) || 
                     localStorage.getItem(STORAGE_KEY_BACKUP);

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.config) {
            this.currentData = parsed;
          }
        } catch (e) {
          console.warn('Failed to parse cached data:', e);
        }
      }

      if (!this.currentData) {
        this.currentData = createDefaultAppData('MI-PRESUPUESTO');
      }
    }
  }

  public hasCustomData(data: AppData | null): boolean {
    if (!data) return false;
    if (Array.isArray(data.dailyExpenses) && data.dailyExpenses.length > 0) return true;
    if (data.config && data.config.salary && data.config.salary !== 1200000) return true;
    if (data.config && data.config.salaryStartDate) return true;
    if (data.config && Array.isArray(data.config.fixedExpenses) && data.config.fixedExpenses.length !== 5) return true;
    return false;
  }

  public getSyncCode(): string {
    return 'NUBE AUTOMÁTICA (FIRESTORE)';
  }

  public setSyncCode(_newCode: string): void {
    // In universal Firestore mode, sync is automatic and persistent
    this.updateStatus('connected');
  }

  // Connects directly to Firestore real-time snapshots
  public async connect() {
    if (typeof window === 'undefined') return;

    this.updateStatus('connecting');

    // Test Firestore connection on app start as required by Firestore integration standard
    testFirestoreConnection().catch(() => {});

    try {
      const budgetDocRef = doc(db, 'budgets', FIRESTORE_DOC_ID);

      // Clean up previous listener if any
      if (this.unsubscribeFirestore) {
        this.unsubscribeFirestore();
      }

      // Check if doc exists in Firestore, or initialize with local data
      const snapshot = await getDoc(budgetDocRef);
      if (!snapshot.exists()) {
        const initialPayload = this.currentData || createDefaultAppData('MI-PRESUPUESTO');
        await setDoc(budgetDocRef, {
          ...initialPayload,
          syncCode: 'MI-PRESUPUESTO',
          lastUpdated: Date.now(),
        });
      }

      // Real-time Firestore snapshot listener: any change in PC or phone updates in real time!
      this.unsubscribeFirestore = onSnapshot(
        budgetDocRef,
        (docSnap) => {
          this.updateStatus('connected');
          this.peerCount = 2; // Cloud active
          if (docSnap.exists()) {
            const cloudData = docSnap.data() as AppData;
            if (cloudData && cloudData.config) {
              // Protect local edits if local has expenses and cloud is blank
              const current = this.currentData;
              if (current && this.hasCustomData(current)) {
                const cloudHasExpenses = Array.isArray(cloudData.dailyExpenses) && cloudData.dailyExpenses.length > 0;
                const currentHasExpenses = Array.isArray(current.dailyExpenses) && current.dailyExpenses.length > 0;
                const cloudIsOlder = (cloudData.lastUpdated || 0) < (current.lastUpdated || 0);

                if ((currentHasExpenses && !cloudHasExpenses) || cloudIsOlder) {
                  // Push local master to Firestore
                  this.saveToFirestore(current);
                  return;
                }
              }

              this.currentData = cloudData;
              this.persistLocal(cloudData);
              this.notifyListeners(cloudData);
            }
          }
        },
        (error) => {
          console.warn('Firestore real-time listener error:', error);
          this.updateStatus('offline');
        }
      );
    } catch (err) {
      console.warn('Error connecting to Firestore:', err);
      this.updateStatus('offline');
    }
  }

  private async saveToFirestore(data: AppData) {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
      const budgetDocRef = doc(db, 'budgets', FIRESTORE_DOC_ID);
      await setDoc(budgetDocRef, data);
    } catch (err) {
      console.error('Error saving budget to Firestore:', err);
    } finally {
      this.isSaving = false;
    }
  }

  public updateData(updater: (prev: AppData) => AppData) {
    if (!this.currentData) {
      this.currentData = createDefaultAppData('MI-PRESUPUESTO');
    }
    const nextData = updater(this.currentData);
    nextData.lastUpdated = Date.now();
    nextData.syncCode = 'MI-PRESUPUESTO';

    this.currentData = nextData;
    this.persistLocal(nextData);
    this.notifyListeners(nextData);

    // Save directly to Firestore cloud database
    this.saveToFirestore(nextData);
  }

  public updateBudgetConfig(newConfig: BudgetConfig) {
    this.updateData((prev) => ({
      ...prev,
      config: newConfig,
    }));
  }

  public updateCategoryLimit(category: string, maxPercentage: number) {
    this.updateData((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        categoryLimits: {
          ...(prev.config.categoryLimits || {}),
          [category]: maxPercentage,
        },
      },
    }));
  }

  public updateAllCategoryLimits(limits: Record<string, number>) {
    this.updateData((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        categoryLimits: limits,
      },
    }));
  }

  public addExpense(expense: Omit<DailyExpense, 'id' | 'createdAt'>) {
    const newExpense: DailyExpense = {
      ...expense,
      id: 'd-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      createdAt: Date.now(),
    };

    this.updateData((prev) => ({
      ...prev,
      dailyExpenses: [newExpense, ...prev.dailyExpenses],
    }));
  }

  public updateExpense(updated: DailyExpense) {
    this.updateData((prev) => {
      let newFixed = [...(prev.config.fixedExpenses || [])];
      const targetFixedId = updated.fixedExpenseId || (updated.id.startsWith('fe-') ? updated.id.replace('fe-', '') : null);

      if (targetFixedId && !updated.isFixed) {
        // Toggled from fixed to variable: remove from config.fixedExpenses
        newFixed = newFixed.filter(f => f.id !== targetFixedId);
      } else if (targetFixedId && updated.isFixed) {
        // Updated while remaining fixed: update config.fixedExpenses
        newFixed = newFixed.map(f => {
          if (f.id === targetFixedId) {
            return {
              ...f,
              name: updated.description,
              category: updated.category,
              amount: updated.amount,
            };
          }
          return f;
        });
      }

      // Handle dailyExpenses
      let newDailyExpenses = [...prev.dailyExpenses];
      const existsInDaily = newDailyExpenses.some(e => e.id === updated.id);

      if (existsInDaily) {
        newDailyExpenses = newDailyExpenses.map(e => (e.id === updated.id ? updated : e));
      } else if (!updated.isFixed) {
        // If it was a fixed expense item without a prior daily record and is now variable, insert it
        const newDaily: DailyExpense = {
          ...updated,
          id: 'd-var-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          createdAt: Date.now(),
        };
        newDailyExpenses = [newDaily, ...newDailyExpenses];
      }

      return {
        ...prev,
        config: {
          ...prev.config,
          fixedExpenses: newFixed,
        },
        dailyExpenses: newDailyExpenses,
      };
    });
  }

  /**
   * Converts a fixed expense (e.g., Tarjeta de crédito, Suscripciones) to a variable daily expense.
   * Removes it from config.fixedExpenses and inserts it into dailyExpenses with isFixed: false.
   * This immediately makes it appear in the Category Limits & Consumption Panel!
   */
  public convertFixedToVariable(fixedExpenseId: string, targetDate: string = getTodayDateString()) {
    this.updateData((prev) => {
      const fe = (prev.config.fixedExpenses || []).find((f) => f.id === fixedExpenseId);
      if (!fe) return prev;

      const salary = Number(prev.config.salary) || 0;
      const numAmount = getFixedExpenseAmount(fe, salary);

      const convertedDailyExpense: DailyExpense = {
        id: 'd-var-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        amount: numAmount,
        category: fe.category || 'Tarjeta de Crédito',
        description: fe.name,
        date: targetDate,
        paymentMethod: fe.category?.toLowerCase().includes('tarjeta') ? 'Tarjeta de Crédito' : 'Transferencia',
        isFixed: false,
        fixedExpenseId: fe.id,
        createdAt: Date.now(),
      };

      return {
        ...prev,
        config: {
          ...prev.config,
          fixedExpenses: (prev.config.fixedExpenses || []).filter((f) => f.id !== fixedExpenseId),
        },
        dailyExpenses: [convertedDailyExpense, ...prev.dailyExpenses],
      };
    });
  }

  /**
   * Converts a variable expense to a fixed expense.
   * Marks it as isFixed: true in dailyExpenses and adds it to config.fixedExpenses.
   */
  public convertVariableToFixed(expenseId: string) {
    this.updateData((prev) => {
      const expense = prev.dailyExpenses.find((e) => e.id === expenseId);
      if (!expense) return prev;

      const newFixedId = expense.fixedExpenseId || ('fe-conv-' + Date.now());
      const newFixedExpense: FixedExpense = {
        id: newFixedId,
        name: expense.description || expense.category,
        amount: Number(expense.amount) || 0,
        amountType: 'amount',
        category: expense.category,
        dueDate: Number(expense.date.split('-')[2]) || 1,
      };

      // Check if already in fixedExpenses
      const existingFixed = (prev.config.fixedExpenses || []).filter(f => f.id !== newFixedId);
      const updatedFixedList = [...existingFixed, newFixedExpense];

      const updatedDailyExpenses = prev.dailyExpenses.map((e) => {
        if (e.id === expenseId) {
          return {
            ...e,
            isFixed: true,
            fixedExpenseId: newFixedId,
          };
        }
        return e;
      });

      return {
        ...prev,
        config: {
          ...prev.config,
          fixedExpenses: updatedFixedList,
        },
        dailyExpenses: updatedDailyExpenses,
      };
    });
  }

  /**
   * Updates a fixed expense directly.
   */
  public updateFixedExpense(updated: FixedExpense) {
    this.updateData((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        fixedExpenses: (prev.config.fixedExpenses || []).map((f) => (f.id === updated.id ? updated : f)),
      },
    }));
  }

  /**
   * Removes a fixed expense completely.
   */
  public removeFixedExpense(fixedExpenseId: string) {
    this.updateData((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        fixedExpenses: (prev.config.fixedExpenses || []).filter((f) => f.id !== fixedExpenseId),
      },
    }));
  }

  public deleteExpense(expenseId: string) {
    this.updateData((prev) => ({
      ...prev,
      dailyExpenses: prev.dailyExpenses.filter((e) => e.id !== expenseId),
    }));
  }

  public updateLicense(license: AppData['license']) {
    this.updateData((prev) => ({
      ...prev,
      license,
    }));
  }

  private persistLocal(data: AppData) {
    if (typeof window !== 'undefined') {
      try {
        const raw = JSON.stringify(data);
        localStorage.setItem(STORAGE_KEY_DATA, raw);
        localStorage.setItem(STORAGE_KEY_MASTER, raw);
        if (this.hasCustomData(data)) {
          localStorage.setItem(STORAGE_KEY_BACKUP, raw);
        }
      } catch (e) {
        console.warn('Error writing to localStorage:', e);
      }
    }
  }

  public exportBackupJson(): string {
    if (!this.currentData) return '{}';
    return JSON.stringify(this.currentData, null, 2);
  }

  public importBackupJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.config) {
        parsed.lastUpdated = Date.now();
        parsed.syncCode = 'MI-PRESUPUESTO';
        this.currentData = parsed;
        this.persistLocal(parsed);
        this.notifyListeners(parsed);
        this.saveToFirestore(parsed);
        return true;
      }
    } catch (e) {
      console.error('Failed to import backup JSON:', e);
    }
    return false;
  }

  private updateStatus(newStatus: ConnectionStatus) {
    this.status = newStatus;
    this.notifyStatusListeners();
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getPeerCount(): number {
    return this.peerCount;
  }

  public getCurrentData(): AppData | null {
    return this.currentData;
  }

  public subscribe(listener: (data: AppData) => void): () => void {
    this.listeners.add(listener);
    if (this.currentData) {
      listener(this.currentData);
    }
    return () => this.listeners.delete(listener);
  }

  public subscribeStatus(listener: (status: ConnectionStatus, count: number) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status, this.peerCount);
    return () => this.statusListeners.delete(listener);
  }

  private notifyListeners(data: AppData) {
    this.listeners.forEach((fn) => fn(data));
  }

  private notifyStatusListeners() {
    this.statusListeners.forEach((fn) => fn(this.status, this.peerCount));
  }
}

export const syncService = new SyncService();
