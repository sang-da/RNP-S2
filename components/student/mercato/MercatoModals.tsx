
import React from 'react';
import { Modal } from '../../Modal';
import { FileText, Upload, Loader2 } from 'lucide-react';

interface CVModalProps {
    isOpen: boolean;
    onClose: () => void;
    cvFile: File | null;
    setCvFile: (file: File | null) => void;
    handleUploadCV: () => void;
    isUploadingCV: boolean;
}

export const CVModal: React.FC<CVModalProps> = ({isOpen, onClose, cvFile, setCvFile, handleUploadCV, isUploadingCV}) => (
    <Modal isOpen={isOpen} onClose={onClose} title="Mettre à jour mon CV">
        <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600">
                    Importez un fichier PDF (Max 5MB). Ce CV sera visible par les recruteurs.
            </div>
            
            <div className="flex items-center justify-center w-full">
                <label htmlFor="dropzone-file" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors ${cvFile ? 'border-indigo-500 bg-indigo-50' : ''}`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {cvFile ? (
                            <>
                                <FileText className="w-8 h-8 text-indigo-500 mb-2"/>
                                <p className="text-sm text-indigo-900 font-bold">{cvFile.name}</p>
                            </>
                        ) : (
                            <>
                                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                <p className="text-sm text-slate-500"><span className="font-bold">Cliquez</span> pour sélectionner</p>
                                <p className="text-xs text-slate-400">PDF uniquement</p>
                            </>
                        )}
                    </div>
                    <input id="dropzone-file" type="file" accept="application/pdf" className="hidden" onChange={e => setCvFile(e.target.files?.[0] || null)} />
                </label>
            </div> 

            <button 
            onClick={handleUploadCV} 
            disabled={!cvFile || isUploadingCV}
            className={`w-full text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 ${!cvFile || isUploadingCV ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-indigo-600'}`}
            >
                {isUploadingCV ? <Loader2 className="animate-spin" size={20}/> : <Upload size={20}/>}
                {isUploadingCV ? 'Envoi en cours...' : 'Enregistrer le CV'}
            </button>
        </div>
    </Modal>
);

interface MotivationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void;
    motivation: string;
    setMotivation: (s: string) => void;
    title: string;
    subtitle: string;
}

export const MotivationModal: React.FC<MotivationModalProps> = ({isOpen, onClose, onSubmit, motivation, setMotivation, title, subtitle}) => (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
        <div className="space-y-4">
            <p className="text-sm text-slate-500">{subtitle}</p>
            <textarea 
                value={motivation}
                onChange={e => setMotivation(e.target.value)}
                className="w-full h-32 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-900"
                placeholder="Rédigez ici (Min 10 caractères)..."
            />
            <button 
                onClick={onSubmit}
                disabled={motivation.length < 10}
                className={`w-full py-3 font-bold rounded-xl text-white transition-all ${motivation.length < 10 ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
                Envoyer la demande
            </button>
        </div>
    </Modal>
);
