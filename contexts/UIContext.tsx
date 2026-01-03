
import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info, HelpCircle } from 'lucide-react';
import { Modal } from '../components/Modal';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

interface UIContextType {
  toast: (type: ToastType, message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within a UIProvider');
  return context;
};

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Confirm Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result);
      setConfirmState(null);
    }
  };

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}
      
      {/* TOAST CONTAINER */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div 
            key={t.id} 
            className="pointer-events-auto min-w-[300px] max-w-md bg-white rounded-xl shadow-xl border border-slate-100 p-4 flex items-start gap-3 animate-in slide-in-from-right-10 fade-in duration-300"
          >
            <div className={`mt-0.5 ${
              t.type === 'success' ? 'text-emerald-500' :
              t.type === 'error' ? 'text-red-500' :
              t.type === 'warning' ? 'text-amber-500' : 'text-indigo-500'
            }`}>
              {t.type === 'success' && <CheckCircle size={20} />}
              {t.type === 'error' && <AlertTriangle size={20} />}
              {t.type === 'warning' && <AlertTriangle size={20} />}
              {t.type === 'info' && <Info size={20} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800 leading-tight">{t.message}</p>
            </div>
            <button onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* CONFIRM MODAL */}
      {confirmState && (
        <Modal 
          isOpen={confirmState.isOpen} 
          onClose={() => handleConfirm(false)} 
          title={confirmState.options.title}
        >
          <div className="space-y-6">
             <div className="flex items-start gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <HelpCircle size={24} className="text-slate-400 mt-0.5 shrink-0"/>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{confirmState.options.message}</p>
             </div>
             
             <div className="flex gap-3 pt-2">
               <button 
                  onClick={() => handleConfirm(false)}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
               >
                 {confirmState.options.cancelText || 'Annuler'}
               </button>
               <button 
                  onClick={() => handleConfirm(true)}
                  className={`flex-1 py-3 font-bold rounded-xl text-white shadow-lg transition-transform active:scale-95 ${
                    confirmState.options.isDangerous 
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-200' 
                    : 'bg-slate-900 hover:bg-indigo-600 shadow-indigo-200'
                  }`}
               >
                 {confirmState.options.confirmText || 'Confirmer'}
               </button>
             </div>
          </div>
        </Modal>
      )}
    </UIContext.Provider>
  );
};
