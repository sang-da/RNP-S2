
import React, { useState } from 'react';
import { Modal } from '../../Modal';
import { Student, Agency } from '../../../types';
import { Save, UserCog, Link2, ShieldAlert, History } from 'lucide-react';
import { doc, updateDoc, db } from '../../../services/firebase';
import { useUI } from '../../../contexts/UIContext';

interface StudentEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student;
    agency: Agency;
}

export const StudentEditModal: React.FC<StudentEditModalProps> = ({ isOpen, onClose, student, agency }) => {
    const { toast } = useUI();
    const [classId, setClassId] = useState<'A' | 'B'>(student.classId);
    const [name, setName] = useState(student.name);
    const [isSaving, setIsSaving] = useState(false);

    // Détection si l'étudiant est lié à un compte utilisateur réel
    const isLinked = !student.id.startsWith('s-'); 

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedMembers = agency.members.map(m => 
                m.id === student.id ? { ...m, name, classId } : m
            );
            
            await updateDoc(doc(db, "agencies", agency.id), { members: updatedMembers });
            toast('success', "Profil étudiant mis à jour.");
            onClose();
        } catch (error) {
            console.error(error);
            toast('error', "Erreur lors de la mise à jour.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Administration Dossier Étudiant">
            <div className="space-y-6">
                
                {/* HEAD INFO */}
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <img src={student.avatarUrl} className="w-16 h-16 rounded-full bg-white border-2 border-slate-200" />
                    <div>
                        <h4 className="font-bold text-slate-900 text-lg">{student.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-1">
                            <span>ID: {student.id}</span>
                            {isLinked ? (
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                                    <Link2 size={12}/> Compte Lié
                                </span>
                            ) : (
                                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                                    <ShieldAlert size={12}/> Non Lié (Virtuel)
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* EDIT FORM */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom & Prénom</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)}
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Classe d'Affectation</label>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setClassId('A')}
                                className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${classId === 'A' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}
                            >
                                CLASSE A
                            </button>
                            <button 
                                onClick={() => setClassId('B')}
                                className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${classId === 'B' ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-slate-100 text-slate-400'}`}
                            >
                                CLASSE B
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 italic">
                            Attention : Changer la classe affecte les filtres de notation et le vivier de recrutement.
                        </p>
                    </div>
                </div>

                {/* HISTORIQUE TECHNIQUE */}
                <div className="border-t border-slate-100 pt-4">
                    <h5 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-3">
                        <History size={14}/> Historique Technique
                    </h5>
                    <div className="bg-slate-100 p-3 rounded-xl text-[10px] text-slate-600 font-mono max-h-32 overflow-y-auto space-y-1">
                        {student.history?.length ? student.history.map((h, i) => (
                            <div key={i} className="flex justify-between border-b border-slate-200 pb-1 last:border-0">
                                <span>{h.date}</span>
                                <span className="font-bold">{h.action}</span>
                                <span className="text-slate-400">{h.agencyName}</span>
                            </div>
                        )) : (
                            <div className="text-center italic opacity-50">Aucun historique disponible.</div>
                        )}
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
                >
                    <Save size={18}/> Enregistrer les modifications
                </button>
            </div>
        </Modal>
    );
};
