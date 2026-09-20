import React from 'react';
import { 
  Wallet, 
  Smartphone, 
  Settings, 
  Crown, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Wifi,
  WifiOff,
  Download
} from 'lucide-react';
import { ConnectionStatus } from '../services/syncService';

interface NavbarProps {
  currentMonth: string;
  onMonthChange: (newMonth: string) => void;
  syncStatus: ConnectionStatus;
  peerCount: number;
  syncCode: string;
  onOpenSync: () => void;
  onOpenConfig: () => void;
  onOpenLicense: () => void;
  onOpenInstall?: () => void;
  isPro: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMonth,
  onMonthChange,
  syncStatus,
  peerCount,
  syncCode,
  onOpenSync,
  onOpenConfig,
  onOpenLicense,
  onOpenInstall,
  isPro,
}) => {
  // Format month for display (e.g., "Septiembre 2026")
  const [yearStr, monthStr] = currentMonth.split('-');
  const dateObj = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  const formattedMonth = dateObj.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const capitalizedMonth = formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1);

  const handlePrevMonth = () => {
    const prevDate = new Date(Number(yearStr), Number(monthStr) - 2, 1);
    const y = prevDate.getFullYear();
    const m = String(prevDate.getMonth() + 1).padStart(2, '0');
    onMonthChange(`${y}-${m}`);
  };

  const handleNextMonth = () => {
    const nextDate = new Date(Number(yearStr), Number(monthStr), 1);
    const y = nextDate.getFullYear();
    const m = String(nextDate.getMonth() + 1).padStart(2, '0');
    onMonthChange(`${y}-${m}`);
  };

  const isConnected = syncStatus === 'connected';

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-slate-100">
                  Gestión de Gastos
                </span>
                {isPro && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Crown className="w-3 h-3" /> PRO
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Límite Diario & Sincronización en Tiempo Real
              </p>
            </div>
          </div>

          {/* Month Selector */}
          <div className="flex items-center bg-slate-800/90 rounded-lg p-1 border border-slate-700">
            <button
              id="btn-prev-month"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-700 rounded-md text-slate-300 hover:text-white transition-colors"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2.5 text-xs sm:text-sm font-medium text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{capitalizedMonth}</span>
            </div>
            <button
              id="btn-next-month"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-700 rounded-md text-slate-300 hover:text-white transition-colors"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Real-time Sync Button & Badge */}
            <button
              id="btn-open-sync"
              onClick={onOpenSync}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              title="Sincronizar PC y Celular"
            >
              {isConnected ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              ) : (
                <WifiOff className="w-3 h-3 text-amber-400" />
              )}
              <Smartphone className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden md:inline text-slate-200">
                {isConnected ? `Sincronizado (${peerCount})` : 'Conectar Celular'}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono hidden sm:inline">
                {syncCode}
              </span>
            </button>

            {/* Install App on Phone Button */}
            {onOpenInstall && (
              <button
                id="btn-open-install"
                onClick={onOpenInstall}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer shadow-xs"
                title="Descargar e instalar como App en el celular"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Instalar en Celular</span>
                <span className="lg:hidden">App Móvil</span>
              </button>
            )}

            {/* Budget Settings */}
            <button
              id="btn-open-config"
              onClick={onOpenConfig}
              className="p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors"
              title="Configurar Sueldo, Gastos Fijos y Ahorro"
            >
              <Settings className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">Presupuesto</span>
            </button>

            {/* Commercial Model / Plans */}
            <button
              id="btn-open-license"
              onClick={onOpenLicense}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm transition-colors"
              title="Planes y Suscripción Comercial"
            >
              <Crown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Planes & Licencia</span>
              <span className="sm:hidden">Plan</span>
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
