import React, { useState } from 'react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallPromptBannerProps {
  onOpenInstallModal: () => void;
}

export const InstallPromptBanner: React.FC<InstallPromptBannerProps> = ({
  onOpenInstallModal,
}) => {
  const { isInstallable, isInstalled, isMobile, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  // Do not show if already running in standalone app mode or user dismissed this session
  if (isInstalled || dismissed) {
    return null;
  }

  // Only show if mobile device or installable prompt is available
  if (!isMobile && !isInstallable) {
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        onOpenInstallModal();
      }
    } else {
      onOpenInstallModal();
    }
  };

  return (
    <div 
      id="pwa-install-banner"
      className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto bg-slate-900/95 border border-emerald-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
            <span>Instalar app en tu celular</span>
            <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
          </p>
          <p className="text-[11px] text-slate-300 truncate">
            Acceso rápido desde tu pantalla de inicio
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleAction}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar</span>
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          title="Cerrar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
