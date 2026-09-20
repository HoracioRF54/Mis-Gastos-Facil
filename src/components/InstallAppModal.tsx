import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  X, 
  Smartphone, 
  Monitor,
  Download, 
  Share, 
  MoreVertical, 
  PlusSquare, 
  CheckCircle2, 
  Copy, 
  Check, 
  Zap, 
  WifiOff, 
  Layers, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncCode?: string;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  syncCode,
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  
  // Default tab based on device detection
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'pc' | 'qr'>(
    isIOS ? 'ios' : isAndroid ? 'android' : 'pc'
  );
  const [copied, setCopied] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' 
    ? (syncCode ? `${window.location.origin}${window.location.pathname}?sync=${syncCode}` : window.location.href)
    : '';

  const handleCopyUrl = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTriggerInstall = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div 
        id="modal-install-pwa"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Cómo descargar la App en tu Celular</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PWA Gratuita
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Instálala directamente sin pasar por Play Store o App Store
              </p>
            </div>
          </div>
          <button
            id="btn-close-install-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Device Selection Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'android'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android (Chrome)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'ios'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="text-sm leading-none"></span>
            <span>iPhone / iPad (Safari)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pc')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'pc'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>PC (Escritorio)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'qr'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <QRCodeSVG value={currentUrl} size={14} className="inline" />
            <span>Escanear QR</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          
          {/* If already installed */}
          {isInstalled && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-200">
                  ¡La aplicación ya está instalada en este dispositivo!
                </p>
                <p className="text-[11px] text-emerald-300/80">
                  La estás ejecutando en modo app independiente a pantalla completa.
                </p>
              </div>
            </div>
          )}

          {/* Quick Install Direct Action (Android/Chromium when supported) */}
          {isInstallable && !isInstalled && (
            <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Instalación Automática Detectada</span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Tu navegador permite instalar la app con un solo clic ahora mismo.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTriggerInstall}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>{installSuccess ? '¡Instalada!' : 'Instalar App Ahora'}</span>
              </button>
            </div>
          )}

          {/* TAB 1: ANDROID INSTRUCTIONS */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/60">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Pasos para instalar en cualquier teléfono Android:</span>
                </h4>

                <ol className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                      1
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-100">
                        Abre el enlace en Google Chrome o Samsung Internet
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        Asegúrate de estar en el navegador Google Chrome desde tu teléfono.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                      2
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-100 flex items-center gap-1.5 flex-wrap">
                        <span>Toca el menú de los 3 puntos</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 text-[10px] font-mono">
                          <MoreVertical className="w-3 h-3 inline" /> Arriba a la derecha
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        Aparecerá el menú de opciones del navegador.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                      3
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-100 flex items-center gap-1.5 flex-wrap">
                        <span>Selecciona</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40">
                          "Instalar aplicación" o "Agregar a la pantalla principal"
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        Confirma tocando <strong>"Instalar"</strong>. Se añadirá el icono de la billetera verde a la pantalla de inicio y en la lista de aplicaciones de tu móvil.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: IPHONE / IPAD INSTRUCTIONS */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/60">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-sm"></span>
                  <span>Pasos para instalar en iPhone o iPad:</span>
                </h4>

                <ol className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/30">
                      1
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-100">
                        Abre el enlace usando el navegador Safari
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        Apple requiere usar Safari para instalar aplicaciones en la pantalla de inicio del iPhone.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/30">
                      2
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-100 flex items-center gap-1.5 flex-wrap">
                        <span>Toca el botón</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-700 text-blue-300 text-xs font-bold">
                          <Share className="w-3.5 h-3.5" /> "Compartir"
                        </span>
                        <span className="text-[11px] text-slate-400">(icono con la flecha hacia arriba abajo en la pantalla)</span>
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/30">
                      3
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-100 flex items-center gap-1.5 flex-wrap">
                        <span>Desliza hacia abajo y pulsa</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40">
                          <PlusSquare className="w-3.5 h-3.5" /> "Agregar a inicio"
                        </span>
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/30">
                      4
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-100">
                        Pulsa "Agregar" en la esquina superior derecha
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        ¡Listo! El icono de la aplicación se creará en la pantalla de inicio de tu iPhone y abrirá a pantalla completa como una app real.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: PC / ESCRITORIO (Chrome / Edge) */}
          {activeTab === 'pc' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-emerald-400" />
                  <span>Instalar en el Escritorio de Windows / Mac / Linux</span>
                </h4>
                <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                  Para tener la aplicación en el escritorio de tu computadora con su propio icono sin depender de abrir este editor cada vez:
                </p>

                <ol className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        Opción directa desde la barra de direcciones
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        En Chrome o Edge, fíjate en el extremo derecho de la barra de direcciones (donde escribes la URL). Verás un icono de una pantalla con una flecha hacia abajo <span className="text-emerald-400 font-semibold">(Instalar aplicación)</span>. Haz clic allí y pulsa "Instalar".
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        O desde el menú de los 3 puntos (⋮)
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        Haz clic en los 3 puntos en la esquina superior derecha del navegador → selecciona <strong>"Guardar y compartir"</strong> (o "Más herramientas") → <strong>"Instalar Gestión de Gastos"</strong> o <strong>"Crear acceso directo..."</strong> (marcando la casilla <em>"Abrir como ventana"</em>).
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        Acceso directo independiente
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        Se creará un acceso directo en tu Escritorio y en la barra de tareas. Al hacer doble clic abrirá en su propia ventana limpia, rápida e independiente sin pestañas de navegador.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>

              {/* Install trigger button if browser supports it */}
              {isInstallable && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleTriggerInstall}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Instalar App en este Navegador Ahora</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SCAN QR (When currently on PC) */}
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center justify-center text-center p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="p-3 bg-white rounded-xl shadow-md mb-3">
                <QRCodeSVG 
                  value={currentUrl} 
                  size={160} 
                  level="M" 
                  includeMargin={false}
                />
              </div>
              <p className="text-xs font-bold text-slate-100">
                1. Escanea este código con la cámara de tu celular
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mt-1 leading-relaxed">
                Al escanearlo, se abrirá la aplicación en tu celular con tu misma sala de sincronización. Luego sigue las instrucciones de la pestaña Android o iPhone para guardarla en tu pantalla de inicio.
              </p>
            </div>
          )}

          {/* Direct Link Copier */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Enlace para abrir en tu celular
              </label>
              <span className="text-[11px] text-emerald-400 font-mono">
                {syncCode ? `Sala: ${syncCode}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 font-mono focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Key Advantages Bento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Acceso Rápido</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Abre directo con un toque desde tu pantalla principal sin escribir la dirección.
                </p>
              </div>
            </div>

            <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Pantalla Completa</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Sin barras del navegador, funcionando como una app nativa de Android o iOS.
                </p>
              </div>
            </div>

            <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                <WifiOff className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Modo Offline</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Carga tus gastos aunque no tengas señal y sincroniza al recuperar internet.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 text-xs text-slate-400 flex items-center justify-between shrink-0">
          <span className="text-[11px]">
            Tecnología PWA (Progressive Web App) estándar
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
