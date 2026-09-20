import React, { useState } from 'react';
import { X, Check, Sliders, ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import { BudgetConfig, DEFAULT_CATEGORIES, DEFAULT_CATEGORY_LIMITS } from '../types';
import { formatCurrency, getCategoryLimits, CATEGORY_COLORS } from '../utils/calculations';

interface CategoryLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BudgetConfig;
  onSaveLimits: (limits: Record<string, number>) => void;
}

export const CategoryLimitsModal: React.FC<CategoryLimitsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveLimits,
}) => {
  const currentLimits = getCategoryLimits(config);
  const [limits, setLimits] = useState<Record<string, number>>({ ...currentLimits });
  const salary = Number(config.salary) || 0;

  if (!isOpen) return null;

  const handleLimitChange = (category: string, value: number) => {
    const val = Math.max(0, Math.min(100, Math.round(value)));
    setLimits((prev) => ({
      ...prev,
      [category]: val,
    }));
  };

  const totalLimitsPercent = (Object.values(limits) as number[]).reduce((sum: number, val: number) => sum + (Number(val) || 0), 0);

  const applyBalancedPreset = () => {
    setLimits({
      ...DEFAULT_CATEGORY_LIMITS,
      'Prescindibles': 5,
      'Tarjeta de Crédito': 10,
      'Comida y Supermercado': 25,
      'Transporte y Combustible': 10,
      'Café y Salidas': 5,
      'Ocio y Entretenimiento': 8,
      'Salud y Farmacia': 7,
      'Hogar y Compras': 10,
      'Educación y Cursos': 5,
      'Otros Imprevistos': 5,
    });
  };

  const applyAggressiveSavingPreset = () => {
    setLimits({
      'Prescindibles': 3,
      'Tarjeta de Crédito': 5,
      'Comida y Supermercado': 20,
      'Transporte y Combustible': 8,
      'Café y Salidas': 3,
      'Ocio y Entretenimiento': 5,
      'Salud y Farmacia': 6,
      'Hogar y Compras': 6,
      'Educación y Cursos': 4,
      'Otros Imprevistos': 4,
    });
  };

  const handleSave = () => {
    onSaveLimits(limits);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div 
        id="modal-category-limits"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Límites Máximos Permitidos por Tipo de Gasto
              </h3>
              <p className="text-xs text-slate-400">
                Define el % máximo de tu sueldo para cada rubro (Semáforo al 80% y 100%)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Presets Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs">
            <span className="text-slate-300 font-medium">Plantillas Rápidas:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={applyBalancedPreset}
                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors cursor-pointer text-xs"
              >
                Equilibrado (Prescindibles 5%, Tarjeta 10%)
              </button>
              <button
                type="button"
                onClick={applyAggressiveSavingPreset}
                className="px-2.5 py-1 bg-emerald-700/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded-lg font-medium transition-colors cursor-pointer text-xs"
              >
                Ahorro Fuerte (Prescindibles 3%)
              </button>
            </div>
          </div>

          {/* Traffic Light Rule Banner */}
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center gap-3 text-xs text-slate-300">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-semibold text-white">Regla Automática del Semáforo en el Gráfico:</p>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  &lt;80%: En Verde (Permitido)
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  80% a 99%: En Amarillo (Alerta)
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  ≥100%: En Rojo (Tope alcanzado)
                </span>
              </div>
            </div>
          </div>

          {/* Categories List */}
          <div className="space-y-2.5">
            {DEFAULT_CATEGORIES.map((cat) => {
              const pct = limits[cat] ?? 5;
              const maxMoney = Math.round((salary * pct) / 100);
              const dotColor = CATEGORY_COLORS[cat] || '#64748B';
              const isPriority = cat === 'Prescindibles' || cat === 'Tarjeta de Crédito';

              return (
                <div 
                  key={cat} 
                  className={`p-3 rounded-xl border transition-all ${
                    isPriority 
                      ? 'bg-slate-800/90 border-emerald-500/40 shadow-xs' 
                      : 'bg-slate-800/50 border-slate-700/60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: dotColor }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{cat}</span>
                          {cat === 'Prescindibles' && (
                            <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded-md font-semibold">
                              Prioridad de Control
                            </span>
                          )}
                          {cat === 'Tarjeta de Crédito' && (
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded-md font-semibold">
                              Límite Bancario
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Tope en dinero: <strong className="text-slate-200">{formatCurrency(maxMoney, config.currency)}</strong> / mes
                        </p>
                      </div>
                    </div>

                    {/* Percentage Stepper & Direct Input */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => handleLimitChange(cat, pct - 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 font-bold text-sm cursor-pointer"
                        >
                          -
                        </button>
                        <div className="flex items-center px-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={pct}
                            onChange={(e) => handleLimitChange(cat, parseFloat(e.target.value) || 0)}
                            className="w-12 text-center bg-transparent text-emerald-400 font-bold text-xs focus:outline-hidden font-mono"
                          />
                          <span className="text-slate-400 text-xs font-semibold">%</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLimitChange(cat, pct + 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 font-bold text-sm cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalLimitsPercent > 100 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                La suma de los límites diarios asignados ({totalLimitsPercent}%) supera el 100% del sueldo. Te sugerimos ajustar para que quede margen para gastos fijos y ahorro.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800 bg-slate-900/90">
          <div className="text-xs text-slate-400">
            Suma de límites diarios: <strong className="text-white">{totalLimitsPercent}% del sueldo</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="btn-save-category-limits"
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Límites</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
