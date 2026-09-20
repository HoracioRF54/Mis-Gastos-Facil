import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  X, 
  Smartphone, 
  Copy, 
  Check, 
  ArrowLeft,
  ShieldCheck,
  Download,
  Upload,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { ConnectionStatus, syncService } from '../services/syncService';

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncCode: string;
  onUpdateSyncCode: (newCode: string) => void;
  syncStatus: ConnectionStatus;
  peerCount: number;
  onOpenInstall?: () => void;
}

export const DeviceSyncModal: React.FC<DeviceSyncModalProps> = ({
  isOpen,
  onClose,
  syncCode,
  onUpdateSyncCode: _onUpdateSyncCode,
  syncStatus,
  peerCount,
  onOpenInstall,
}) => {
  const [copied, setCopied] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close with Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build full mobile pairing URL
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const syncUrl = `${origin}${pathname}?sync=${syncCode}`;

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(syncUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportBackup = () => {
    try {
      const json = syncService.exportBackupJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `respaldo_gastos_${syncCode}_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupMsg('¡Copia de seguridad descargada exitosamente!');
      setTimeout(() => setBackupMsg(null), 4000);
    } catch (err) {
      console.error(err);
      setBackupMsg('Error al exportar la copia.');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = syncService.importBackupJson(content);
        if (ok) {
          setBackupMsg('¡Copia restaurada exitosamente!');
          setTimeout(() => {
            setBackupMsg(null);
            onClose();
          }, 1500);
        } else {
          setBackupMsg('El archivo no tiene un formato válido.');
        }
      }
    };
    reader.readAsText(file);
  };

  const isConnected = syncStatus === 'connected';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div 
        id="modal-device-sync"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Sincronización PC y Celular
              </h3>
              <p className="text-[11px] text-slate-400">
                Tus datos están guardados y respaldados
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a la App</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          
          {/* Quick Notice: Unified Data Always Loaded */}
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-200">
              <p className="font-bold text-emerald-300">¡Tu aplicación ya tiene tus datos cargados!</p>
              <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                Tus gastos cargados ayer siguen intactos y se abren automáticamente en cualquier momento sin necesidad de elegir salas.
              </p>
            </div>
          </div>

          {/* Real-time Status Card */}
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-3 w-3">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${
                  isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}></span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">
                  {isConnected ? 'Conexión en Tiempo Real Activa' : 'Reconectando con el servidor...'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {peerCount > 1 
                    ? `🟢 ${peerCount} dispositivos conectados (PC y Celular sincronizados)`
                    : 'Dispositivo conectado a la base central'}
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-1 bg-slate-900 text-emerald-400 rounded-lg border border-slate-700">
              {syncCode}
            </span>
          </div>

          {/* QR Code Section */}
          <div className="flex flex-col items-center justify-center text-center p-4 bg-slate-950 rounded-2xl border border-slate-800">
            <div className="p-3 bg-white rounded-xl shadow-md mb-3">
              <QRCodeSVG 
                value={syncUrl} 
                size={160} 
                level="M" 
                includeMargin={false}
              />
            </div>
            <p className="text-xs font-semibold text-slate-200">
              Escanea con la cámara de tu celular
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mt-1 leading-relaxed">
              Al abrir el enlace en tu móvil, ambos dispositivos compartirán los gastos instantáneamente sin necesidad de recargar la página.
            </p>

            {onOpenInstall && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInstall();
                }}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>¿Cómo instalarla como App en la pantalla de inicio?</span>
              </button>
            )}
          </div>

          {/* Direct Link Copy */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Enlace directo para tu celular
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={syncUrl}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 font-mono focus:outline-hidden"
              />
              <button
                onClick={handleCopy}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Quick Connect / Cloud Sync Info */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Sincronización en la Nube (Firestore)
              </label>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                Permanente
              </span>
            </div>

            <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-xs text-white font-bold">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Base de Datos Centralizada y Automática</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Ya no necesitas códigos de sala ni configuraciones manuales. Cualquier cambio que hagas en tu celular o en la computadora se guarda en tiempo real en la nube y se refleja inmediatamente en todos tus dispositivos.
              </p>
            </div>
          </div>

          {/* Backup & Safety Section */}
          <div className="pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Copias de Seguridad y Respaldo
              </label>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                100% Protegido
              </span>
            </div>
            
            <p className="text-[11px] text-slate-400 mb-2.5 leading-relaxed">
              Tus gastos se guardan en el servidor y en tu dispositivo. Puedes descargar una copia en cualquier momento:
            </p>

            {backupMsg && (
              <div className="mb-2.5 p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{backupMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs text-slate-200 font-medium transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Descargar Copia</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs text-slate-200 font-medium transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Restaurar Copia</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>
          </div>

        </div>

        {/* Footer with Clear Exit Button */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/95 shrink-0 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Sincronizado y respaldado</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-950"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la pantalla principal</span>
          </button>
        </div>

      </div>
    </div>
  );
};

