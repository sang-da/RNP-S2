
import React, { useState } from 'react';
import { Modal } from '../../Modal';
import { Student, Agency, Badge, CareerHistoryItem, StudentNote } from '../../../types';
import { Save, Link2, ShieldAlert, History, Medal, Plus, X, Trash2, StickyNote, PenTool, Lock, Globe, MessageSquare, AlertTriangle } from 'lucide-react';
import { doc, updateDoc, db } from '../../../services/firebase';
import { useUI } from '../../../contexts/UIContext';
import { BADGE_DEFINITIONS } from '../../../constants';
import { useAuth } from '../../../contexts/AuthContext';

interface StudentEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student;
    agency: Agency;
    allAgencies: Agency[];
}

type TabType = 'GENERAL' | 'HISTORY' | 'NOTES';

export const StudentEditModal: React.FC<StudentEditModalProps> = ({ isOpen, onClose, student, agency, allAgencies }) => {
    const { toast, confirm } = useUI();
    const { userData } = useAuth();
    
    // UI State
    const [activeTab, setActiveTab] = useState<TabType>('GENERAL');
    const [isSaving, setIsSaving] = useState(false);

    // Data State (Buffered)
    const [classId, setClassId] = useState<'A' | 'B' | 'ALL'>(student.classId);
    const [name, setName] = useState(student.name);
    const [badges, setBadges] = useState<Badge[]>(student.badges || []);
    const [history, setHistory] = useState<CareerHistoryItem[]>(student.history || []);
    const [notes, setNotes] = useState<StudentNote[]>(student.notes || []);

    // Form Inputs
    const [selectedBadgeId, setSelectedBadgeId] = useState<string>("");
    
    // New Note Input
    const [newNoteContent, setNewNoteContent] = useState("");
    const [newNoteVisibility, setNewNoteVisibility] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');

    // New History Input
    const [newHistoryWeek, setNewHistoryWeek] = useState("");
    const [newHistoryAgency, setNewHistoryAgency] = useState("");
    const [newHistoryAction, setNewHistoryAction] = useState<CareerHistoryItem['action']>('JOINED');

    // Détection si l'étudiant est lié à un compte utilisateur réel
    const isLinked = !student.id.startsWith('s-'); 

    // --- LOGIC BADGES ---
    const handleAddBadge = () => {
        if (!selectedBadgeId) return;
        const badgeDef = BADGE_DEFINITIONS.find(b => b.id === selectedBadgeId);
        if (badgeDef) {
            if (badges.some(b => b.id === badgeDef.id)) {
                toast('warning', "L'étudiant possède déjà ce badge.");
                return;
            }
            setBadges([...badges, { ...badgeDef, unlockedAt: new Date().toISOString().split('T')[0] }]);
            setSelectedBadgeId("");
        }
    };
    const handleRemoveBadge = (badgeId: string) => setBadges(badges.filter(b => b.id !== badgeId));

    // --- LOGIC NOTES ---
    const handleAddNote = () => {
        if (!newNoteContent.trim()) return;
        const note: StudentNote = {
            id: `note-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            authorName: userData?.displayName || "Admin",
            content: newNoteContent,
            visibility: newNoteVisibility,
            type: 'NEUTRAL'
        };
        setNotes([note, ...notes]);
        setNewNoteContent("");
    };
    const handleDeleteNote = (noteId: string) => setNotes(notes.filter(n => n.id !== noteId));

    // --- LOGIC HISTORY ---
    const handleAddHistory = () => {
        if (!newHistoryWeek || !newHistoryAgency) return;
        const item: CareerHistoryItem = {
            id: `hist-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            weekId: newHistoryWeek,
            agencyName: newHistoryAgency,
            action: newHistoryAction,
            reason: "Correction manuelle"
        };
        setHistory([item, ...history]);
        setNewHistoryWeek("");
        setNewHistoryAgency("");
    };
    const handleDeleteHistory = (itemId: string) => setHistory(history.filter(h => h.id !== itemId));

    // --- DELETE STUDENT ---
    const handleDeleteStudent = async () => {
        const confirmed = await confirm({
            title: `Supprimer ${student.name} ?`,
            message: "Cette action retirera l'étudiant de l'agence.\nS'il est lié à un compte utilisateur, ce compte sera détaché mais pas supprimé.",
            confirmText: "SUPPRIMER DÉFINITIVEMENT",
            isDangerous: true
        });

        if (!confirmed) return;

        try {
            // 1. Update Agency (Remove Member)
            const updatedMembers = agency.members.filter(m => m.id !== student.id);
            await updateDoc(doc(db, "agencies", agency.id), { members: updatedMembers });

            // 2. Unlink User (if applicable)
            if (isLinked) {
                await updateDoc(doc(db, "users", student.id), { 
                    role: 'pending', 
                    agencyId: null, 
                    linkedStudentId: null,
                    studentProfileName: null
                });
            }

            toast('success', "Profil étudiant supprimé.");
            onClose();
        } catch (error) {
            console.error(error);
            toast('error', "Erreur lors de la suppression.");
        }
    };

    // --- SAVE ---
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedMembers = agency.members.map(m => 
                m.id === student.id ? { 
                    ...m, 
                    name, 
                    classId, 
                    badges,
                    history,
                    notes
                } : m
            );
            
            await updateDoc(doc(db, "agencies", agency.id), { members: updatedMembers });
            toast('success', "Dossier étudiant sauvegardé.");
            onClose();
        } catch (error) {
            console.error(error);
            toast('error', "Erreur lors de la mise à jour.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gestion Dossier Étudiant">
            <div className="space-y-6 flex flex-col h-[70vh]">
                
                {/* HEAD INFO */}
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 shrink-0">
                    <img src={student.avatarUrl} className="w-16 h-16 rounded-full bg-white border-2 border-slate-200" />
                    <div>
                        <h4 className="font-bold text-slate-900 text-lg">{name}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-1">
                            <span>ID: {student.id}</span>
                            {isLinked ? (
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                                    <Link2 size={12}/> Lié
                                </span>
                            ) : (
                                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                                    <ShieldAlert size={12}/> Virtuel
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                    <button onClick={() => setActiveTab('GENERAL')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'GENERAL' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Général & Badges</button>
                    <button onClick={() => setActiveTab('HISTORY')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'HISTORY' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Historique (Parcours)</button>
                    <button onClick={() => setActiveTab('NOTES')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'NOTES' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Notes & Remarques</button>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                    
                    {/* --- TAB: GENERAL --- */}
                    {activeTab === 'GENERAL' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Identité</label>
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Classe</label>
                                    <div className="flex gap-4">
                                        <button onClick={() => setClassId('A')} className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${classId === 'A' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}>CLASSE A</button>
                                        <button onClick={() => setClassId('B')} className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${classId === 'B' ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-slate-100 text-slate-400'}`}>CLASSE B</button>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <h5 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-3"><Medal size={14} className="text-yellow-500"/> Palmarès</h5>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {badges.length === 0 && <span className="text-xs text-slate-400 italic">Aucun badge.</span>}
                                    {badges.map((badge, index) => (
                                        <div key={`${badge.id}-${index}`} className="flex items-center gap-1 pl-2 pr-1 py-1 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg text-xs font-bold shadow-sm">
                                            <span>{badge.label}</span>
                                            <button onClick={() => handleRemoveBadge(badge.id)} className="p-1 hover:bg-yellow-200 rounded-md text-yellow-600 transition-colors"><X size={12}/></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <select value={selectedBadgeId} onChange={(e) => setSelectedBadgeId(e.target.value)} className="flex-1 p-2 border border-slate-200 rounded-xl text-sm bg-white outline-none">
                                        <option value="">-- Ajouter un badge --</option>
                                        {BADGE_DEFINITIONS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                                    </select>
                                    <button onClick={handleAddBadge} disabled={!selectedBadgeId} className="p-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors"><Plus size={20}/></button>
                                </div>
                            </div>

                            {/* DANGER ZONE */}
                            <div className="border-t border-slate-100 pt-6 mt-6">
                                <button 
                                    onClick={handleDeleteStudent}
                                    className="w-full py-3 border-2 border-red-100 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 hover:border-red-300 transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={18}/> Supprimer ce profil étudiant
                                </button>
                                <p className="text-center text-[10px] text-red-400 mt-2">
                                    Attention : Action irréversible.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: HISTORY --- */}
                    {activeTab === 'HISTORY' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-xs text-amber-800">
                                <strong>Attention :</strong> Modifier l'historique ne recalcule pas rétroactivement les notes ou les salaires. Cela sert uniquement à la traçabilité.
                            </div>

                            {/* ADD ENTRY */}
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                                <label className="text-[10px] font-bold uppercase text-slate-400">Ajouter une étape (Correction)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <input type="text" placeholder="Semaine (ex: 3)" value={newHistoryWeek} onChange={e => setNewHistoryWeek(e.target.value)} className="p-2 rounded-lg border text-sm"/>
                                    
                                    {/* SELECT AGENCY */}
                                    <select 
                                        value={newHistoryAgency} 
                                        onChange={e => setNewHistoryAgency(e.target.value)} 
                                        className="p-2 rounded-lg border text-sm bg-white"
                                    >
                                        <option value="">-- Agence --</option>
                                        {allAgencies.filter(a => a.id !== 'unassigned').sort((a,b) => a.name.localeCompare(b.name)).map(a => (
                                            <option key={a.id} value={a.name}>{a.name}</option>
                                        ))}
                                        <option value="Vivier / Chômage">Vivier / Chômage</option>
                                    </select>

                                    <select value={newHistoryAction} onChange={e => setNewHistoryAction(e.target.value as any)} className="p-2 rounded-lg border text-sm bg-white">
                                        <option value="JOINED">Rejoint</option>
                                        <option value="LEFT">Quitte</option>
                                        <option value="PROMOTED">Pormu</option>
                                        <option value="TRANSFER">Transfert</option>
                                    </select>
                                </div>
                                <button onClick={handleAddHistory} className="w-full py-2 bg-slate-900 text-white font-bold rounded-lg text-xs hover:bg-slate-700">Ajouter l'entrée</button>
                            </div>

                            {/* LIST */}
                            <div className="space-y-2">
                                {history.length === 0 && <p className="text-center text-slate-400 text-xs italic">Historique vide.</p>}
                                {history.sort((a,b) => parseInt(b.weekId || '0') - parseInt(a.weekId || '0')).map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-xs text-slate-500">S{item.weekId}</div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{item.agencyName}</p>
                                                <p className="text-[10px] text-slate-500 uppercase">{item.action} • {item.date}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteHistory(item.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- TAB: NOTES --- */}
                    {activeTab === 'NOTES' && (
                        <div className="space-y-6 animate-in fade-in">
                            {/* ADD NOTE */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-2"><StickyNote size={12}/> Nouvelle Note</label>
                                    <div className="flex bg-white rounded-lg p-0.5 border border-slate-200">
                                        <button onClick={() => setNewNoteVisibility('PRIVATE')} className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${newNoteVisibility === 'PRIVATE' ? 'bg-amber-100 text-amber-700' : 'text-slate-400'}`}><Lock size={10}/> Privé</button>
                                        <button onClick={() => setNewNoteVisibility('PUBLIC')} className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${newNoteVisibility === 'PUBLIC' ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}><Globe size={10}/> Public</button>
                                    </div>
                                </div>
                                <textarea 
                                    value={newNoteContent} 
                                    onChange={e => setNewNoteContent(e.target.value)} 
                                    className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                                    placeholder="Note pédagogique, observation comportementale..."
                                />
                                <button onClick={handleAddNote} disabled={!newNoteContent.trim()} className="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs hover:bg-indigo-700 disabled:opacity-50">Ajouter la note</button>
                            </div>

                            {/* NOTES LIST */}
                            <div className="space-y-3">
                                {notes.length === 0 && <p className="text-center text-slate-400 text-xs italic">Aucune note pour le moment.</p>}
                                {notes.sort((a,b) => b.date.localeCompare(a.date)).map((note) => (
                                    <div key={note.id} className={`p-4 rounded-xl border relative group ${note.visibility === 'PRIVATE' ? 'bg-amber-50/50 border-amber-200' : 'bg-blue-50/50 border-blue-200'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                {note.visibility === 'PRIVATE' ? <Lock size={12} className="text-amber-500"/> : <Globe size={12} className="text-blue-500"/>}
                                                <span className={`text-[10px] font-bold uppercase ${note.visibility === 'PRIVATE' ? 'text-amber-700' : 'text-blue-700'}`}>{note.visibility === 'PRIVATE' ? 'Staff Only' : 'Visible par l\'étudiant'}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400">{note.date} par {note.authorName}</div>
                                        </div>
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                                        <button onClick={() => handleDeleteNote(note.id)} className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>

                {/* FOOTER */}
                <div className="pt-4 border-t border-slate-100 shrink-0">
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Save size={18}/> Enregistrer le dossier
                    </button>
                </div>
            </div>
        </Modal>
    );
};
