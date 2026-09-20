import React, { useState } from 'react';
import { 
  X, 
  Crown, 
  Check, 
  Sparkles, 
  Download, 
  ShieldCheck, 
  KeyRound, 
  CreditCard,
  Zap,
  FileSpreadsheet
} from 'lucide-react';
import { AppData, DailyExpense } from '../types';

interface CommercialLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  license: AppData['license'];
  onActivateLicense: (newLicense: AppData['license']) => void;
  expenses: DailyExpense[];
  currency: string;
}

export const CommercialLicenseModal: React.FC<CommercialLicenseModalProps> = ({
  isOpen,
  onClose,
  license,
  onActivateLicense,
  expenses,
  currency,
}) => {
  const [billingCycle, setBillingCycle] = useState<'annual' | 'lifetime'>('annual');
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleActivateDemo = (plan: 'annual' | 'lifetime') => {
    const isAnnual = plan === 'annual';
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);

    onActivateLicense({
      plan,
      isActive: true,
      expiresAt: isAnnual ? expires.toISOString().slice(0, 10) : undefined,
      licenseKey: `${plan.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
    });
    setFeedback(`¡Plan ${isAnnual ? 'Suscripción Anual' : 'Pago Único Vitalicio'} activado con éxito!`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleApplyKey = (e: React.FormEvent) => {
    e.preventDefault();
    const key = licenseKeyInput.trim().toUpperCase();
    if (!key) return;

    if (key.includes('LIFE') || key.includes('UNICO')) {
      handleActivateDemo('lifetime');
    } else {
      handleActivateDemo('annual');
    }
    setLicenseKeyInput('');
  };

  const handleExportCSV = () => {
    if (expenses.length === 0) {
      alert('No hay gastos registrados para exportar.');
      return;
    }

    const headers = ['ID', 'Fecha', 'Categoria', 'Descripcion', 'Monto', 'MetodoPago'];
    const rows = expenses.map((e) => [
      e.id,
      e.date,
      `"${e.category}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      e.amount,
      `"${e.paymentMethod || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `gastos_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div 
        id="modal-commercial-license"
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Modelo Comercial y Planes
              </h3>
              <p className="text-xs text-slate-400">
                Opciones de suscripción anual y pago único para comercializar tu app
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Current License Status Banner */}
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado Actual:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  license.isActive 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {license.isActive 
                    ? (license.plan === 'lifetime' ? 'LICENCIA VITALICIA ACTIVA' : 'SUSCRIPCIÓN ANUAL ACTIVA') 
                    : 'VERSIÓN DE PRUEBA'}
                </span>
              </div>
              {license.isActive && license.licenseKey && (
                <p className="text-[11px] text-slate-400 font-mono mt-1">
                  Clave: {license.licenseKey} {license.expiresAt ? `· Vence: ${license.expiresAt}` : '· Acceso de por vida'}
                </p>
              )}
            </div>

            {feedback && (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                {feedback}
              </span>
            )}
          </div>

          {/* Pricing Strategy Selector */}
          <div className="text-center space-y-2">
            <h4 className="text-base font-bold text-white">
              Estrategia de Monetización Preparada
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Diseñado para permitirte comercializar la aplicación a usuarios finales mediante suscripción o pago único:
            </p>

            {/* Toggle buttons */}
            <div className="inline-flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold mt-2">
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                  billingCycle === 'annual' 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Suscripción Anual</span>
                <span className="bg-emerald-900/80 text-emerald-200 text-[10px] px-1.5 py-0.2 rounded-md ml-1">Recomendado</span>
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('lifetime')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                  billingCycle === 'lifetime' 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Pago Único (Lifetime)</span>
              </button>
            </div>
          </div>

          {/* Plan Cards Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Annual Card */}
            <div className={`p-5 rounded-2xl border transition-all ${
              billingCycle === 'annual'
                ? 'bg-emerald-950/20 border-emerald-500/50 shadow-lg'
                : 'bg-slate-800/40 border-slate-700/60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Plan Anual</span>
                <span className="text-xs text-slate-400">Facturación anual</span>
              </div>
              <div className="flex items-baseline gap-1 my-3">
                <span className="text-3xl font-black text-white">$24.99</span>
                <span className="text-xs text-slate-400">/ año</span>
              </div>
              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                Ingresos recurrentes predecibles. Ideal para usuarios que valoran sincronización continua y soporte de nuevas funciones.
              </p>
              
              <ul className="space-y-2 text-xs text-slate-300 mb-5">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Sincronización ilimitada en tiempo real PC + Móvil</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Alertas en tiempo real (Rojo / Verde de límite diario)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Panel analítico con gráficos mensuales exportables</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Actualizaciones y mejoras durante 12 meses</span>
                </li>
              </ul>

              <button
                type="button"
                onClick={() => handleActivateDemo('annual')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Simular Activación Anual</span>
              </button>
            </div>

            {/* Lifetime Card */}
            <div className={`p-5 rounded-2xl border transition-all ${
              billingCycle === 'lifetime'
                ? 'bg-amber-950/20 border-amber-500/50 shadow-lg'
                : 'bg-slate-800/40 border-slate-700/60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Pago Único</span>
                <span className="text-xs text-slate-400">De por vida</span>
              </div>
              <div className="flex items-baseline gap-1 my-3">
                <span className="text-3xl font-black text-white">$49.99</span>
                <span className="text-xs text-slate-400">pago único</span>
              </div>
              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                Sin suscripciones ni cobros recurrentes. Ideal para clientes que prefieren pagar una sola vez y adueñarse del software.
              </p>

              <ul className="space-y-2 text-xs text-slate-300 mb-5">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Acceso vitalicio completo a todas las funciones</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Sin renovaciones ni cargos futuros</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Sincronización multi-dispositivo permanente</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Exportación de datos a Excel/CSV sin restricciones</span>
                </li>
              </ul>

              <button
                type="button"
                onClick={() => handleActivateDemo('lifetime')}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Simular Pago Único (Lifetime)</span>
              </button>
            </div>

          </div>

          {/* License Key Validation Tester */}
          <form onSubmit={handleApplyKey} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Validar / Activar Clave de Licencia Comercial</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
                placeholder="Ej. PRO-2026 o LIFETIME-VIP"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white uppercase font-mono tracking-wider focus:outline-hidden focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold shrink-0 transition-colors"
              >
                Activar Clave
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Códigos de prueba rápidos: <code>PRO-2026</code> (Anual) o <code>LIFETIME-VIP</code> (De por vida).
            </p>
          </form>

          {/* Data Export Feature (Commercial Value-Add) */}
          <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-2xl border border-slate-700/60">
            <div>
              <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Exportar Registro Completo (Excel / CSV)</span>
              </h5>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Descarga tus transacciones para contabilidad o respaldo personal
              </p>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar .CSV</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
