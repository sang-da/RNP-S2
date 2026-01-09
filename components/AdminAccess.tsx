
import React, { useState, useMemo, useEffect } from 'react';
import { Agency, Student } from '../types';
import { Search, Wifi, WifiOff, Link, UserCheck, ShieldCheck, Loader2, Mail, Database, ServerCrash, FileClock, History, UserX, Trash2, Edit, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, writeBatch, updateDoc, deleteDoc, db } from '../services/firebase';
import { useUI } from '../contexts/UIContext';
import { useGame } from '../contexts/GameContext'; 
import { Modal } from './Modal';

interface AdminAccessProps {
  agencies: Agency[];
  onUpdateAgencies: (agencies: Agency[]) => void;
  readOnly?: boolean;
}

interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
    role: 'admin' | 'student' | 'pending' | 'supervisor';
}

export const AdminAccess: React.FC<AdminAccessProps> = ({ agencies, onUpdateAgencies, readOnly }) => {
  const { toast, confirm } = useUI();
  const { resetGame } = useGame();
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);

  // EDIT STATE
  const [editingStudent, setEditingStudent] = useState<{ student: Student, agencyId: string } | null>(null);
  const [editForm, setEditForm] = useState<{ name: string, classId: 'A' | 'B' }>({ name: '', classId: 'A' });

  // 1. ÉCOUTE DE TOUS LES UTILISATEURS (Pour détecter les orphelins)
  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const users: UserProfile[] = [];
        snapshot.forEach((doc) => {
            users.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });
        setAllUsers(users);
    });
    return () => unsubscribe();
  }, []);

  // Extraction des données de jeu
  const allGameStudents = useMemo(() => {
    const students: { student: Student, agency: Agency }[] = [];
    agencies.forEach(agency => {
        agency.members.forEach(member => {
            students.push({ student: member, agency });
        });
    });
    return students;
  }, [agencies]);

  // Filtrage des slots libres (IDs commençant par s-)
  const availableSlots = useMemo(() => 
    allGameStudents.filter(({student}) => student.id.startsWith('s-'))
    .sort((a,b) => a.student.name.localeCompare(b.student.name))
  , [allGameStudents]);

  // Détection des "PENDING" réels
  const pendingUsers = useMemo(() => allUsers.filter(u => u.role === 'pending'), [allUsers]);

  // DÉTECTION DES ORPHELINS (Role student mais ID absent des agences)
  const orphanUsers = useMemo(() => {
      return allUsers.filter(u => {
          if (u.role !== 'student') return false;
          // Est-ce que cet UID est présent dans une des agences ?
          return !allGameStudents.some(ags => ags.student.id === u.uid);
      });
  }, [allUsers, allGameStudents]);

  const handleAssignStudent = async (firebaseUser: UserProfile, targetStudentId: string) => {
      if(readOnly) return;
      const targetAgency = agencies.find(a => a.members.some(m => m.id === targetStudentId));
      if (!targetAgency) return;

      const oldMemberData = targetAgency.members.find(m => m.id === targetStudentId);
      if (!oldMemberData) return;

      const confirmed = await confirm({
          title: "Lier le compte ?",
          message: `Voulez-vous lier ${firebaseUser.displayName} au profil "${oldMemberData.name}" ?`,
          confirmText: "Lier maintenant"
      });

      if (!confirmed) return;

      try {
          const batch = writeBatch(db);
          // 1. Update User
          batch.update(doc(db, "users", firebaseUser.uid), {
              role: 'student',
              agencyId: targetAgency.id,
              linkedStudentId: targetStudentId,
              studentProfileName: oldMemberData.name
          });
          // 2. Update Agency
          const updatedMembers = targetAgency.members.map(member => 
              member.id === targetStudentId ? { ...member, id: firebaseUser.uid, avatarUrl: firebaseUser.photoURL || member.avatarUrl, connectionStatus: 'online' } : member
          );
          batch.update(doc(db, "agencies", targetAgency.id), { members: updatedMembers });
          await batch.commit();
          toast('success', "Lien effectué avec succès !");
      } catch (error) { toast('error', "Erreur technique"); }
  };

  const handleForceOffline = async (student: Student, agencyId: string) => {
       if(readOnly || student.id.startsWith('s-')) return;
       if (await confirm({ title: "Délier l'étudiant ?", message: "L'étudiant retournera en salle d'attente.", confirmText: "Délier", isDangerous: true })) {
           try {
               const batch = writeBatch(db);
               const newMockId = `s-reset-${Date.now()}`; 
               const agency = agencies.find(a => a.id === agencyId);
               if (!agency) return;
               const updatedMembers = agency.members.map(m => m.id === student.id ? { ...m, id: newMockId, connectionStatus: 'offline' } : m);
               batch.update(doc(db, "agencies", agencyId), { members: updatedMembers });
               batch.update(doc(db, "users", student.id), { role: 'pending', agencyId: null });
               await batch.commit();
               toast('success', "Lien rompu.");
           } catch (e) { toast('error', "Erreur"); }
       }
  };

  const filteredStudents = allGameStudents.filter(s => s.student.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-in fade-in duration-500 pb-20">
         <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><ShieldCheck size={32}/></div>
                    Accès & Comptes
                </h2>
                <p className="text-slate-500 text-sm mt-1">Gérez les connexions et réparez les liens rompus.</p>
            </div>
            {!readOnly && (
                <button onClick={async () => { if(await confirm({title:"Reset", message:"Ceci efface tous les liens.", isDangerous:true})) { setIsResetting(true); await resetGame(); setIsResetting(false); }}} className="text-xs font-bold text-slate-400 hover:text-red-600 border px-3 py-2 rounded-lg flex items-center gap-2 transition-colors">
                    {isResetting ? <Loader2 className="animate-spin" size={14}/> : <Database size={14}/>} Restaurer / Initialiser
                </button>
            )}
        </div>

        {/* --- SECTION : ÉTUDIANTS ORPHELINS (DÉSACTIVÉS PAR RESET) --- */}
        {orphanUsers.length > 0 && (
            <div className="mb-8 border-2 border-amber-300 bg-amber-50 rounded-2xl p-6 shadow-lg animate-bounce-slow">
                <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                    <AlertCircle size={20} className="text-amber-600"/>
                    ALERTE : Étudiants déconnectés ({orphanUsers.length})
                </h3>
                <p className="text-sm text-amber-800 mb-4">Ces étudiants ont été validés mais ne sont plus liés à un studio (souvent après un Reset). <strong>Ils sont actuellement bloqués en salle d'attente.</strong></p>
                <div className="space-y-3">
                    {orphanUsers.map(user => (
                        <div key={user.uid} className="bg-white p-4 rounded-xl border border-amber-200 flex flex-col lg:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <img src={user.photoURL} className="w-10 h-10 rounded-full border border-amber-100" />
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">{user.displayName}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 w-full lg:w-auto">
                                <select 
                                    className="flex-1 lg:w-64 p-2 rounded-lg bg-slate-50 text-xs font-bold border-amber-200 outline-none focus:ring-2 focus:ring-amber-500"
                                    onChange={(e) => handleAssignStudent(user, e.target.value)}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Ré-assigner à un profil...</option>
                                    {availableSlots.map(({student, agency}) => (
                                        <option key={student.id} value={student.id}>{student.name} ({agency.name})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* SECTION : NOUVELLES DEMANDES */}
        <div className={`mb-8 border rounded-2xl p-6 shadow-sm transition-all ${pendingUsers.length > 0 ? 'bg-white border-indigo-100 ring-4 ring-indigo-50/50' : 'bg-slate-50 border-dashed border-slate-200 opacity-60'}`}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${pendingUsers.length > 0 ? 'text-indigo-900' : 'text-slate-400'}`}>
                {pendingUsers.length > 0 ? <RefreshCw size={20} className="animate-spin text-indigo-500"/> : <WifiOff size={20}/>}
                Nouvelles demandes ({pendingUsers.length})
            </h3>
            {pendingUsers.length > 0 && (
                <div className="space-y-3">
                    {pendingUsers.map(user => (
                        <div key={user.uid} className="flex flex-col xl:flex-row items-center justify-between bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 gap-4">
                            <div className="flex items-center gap-4">
                                <img src={user.photoURL} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                                <div className="text-sm font-bold text-slate-900">{user.displayName} <span className="block text-[10px] font-normal text-slate-500">{user.email}</span></div>
                            </div>
                            <select className="xl:w-64 p-2 rounded-lg bg-white text-xs font-bold border-indigo-200 outline-none" onChange={(e) => handleAssignStudent(user, e.target.value)} defaultValue=""><option value="" disabled>Lier à un profil...</option>{availableSlots.map(({student, agency}) => (<option key={student.id} value={student.id}>{student.name} ({agency.name})</option>))}</select>
                        </div>
                    ))}
                </div>
            )}
            {pendingUsers.length === 0 && <p className="text-sm text-slate-400 italic">Aucune nouvelle demande.</p>}
        </div>

        {/* SECTION : ANNUAIRE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50">
                 <h3 className="font-bold text-slate-700 flex items-center gap-2"><UserCheck size={18} /> Annuaire Étudiants</h3>
                 <div className="relative w-full md:w-64"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input type="text" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/></div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold"><tr><th className="p-4">Étudiant</th><th className="p-4">Agence</th><th className="p-4">Classe</th><th className="p-4">Statut</th><th className="p-4 text-right">Action</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map(({student, agency}) => {
                            const isLinked = !student.id.startsWith('s-');
                            return (
                                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4"><div className="flex items-center gap-3"><img src={student.avatarUrl} className={`w-8 h-8 rounded-full ${isLinked ? '' : 'grayscale opacity-50'}`} /><div><div className="font-bold text-slate-900 text-sm">{student.name}</div><div className="text-[10px] text-slate-400">{isLinked ? 'Compte lié' : 'Bot / Inactif'}</div></div></div></td>
                                    <td className="p-4 text-sm text-slate-600 font-medium">{agency.name}</td>
                                    <td className="p-4"><span className={`text-[10px] font-bold px-2 py-1 rounded ${student.classId === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>CLASSE {student.classId}</span></td>
                                    <td className="p-4">{student.connectionStatus === 'online' && isLinked ? <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100"><Wifi size={12}/> En Ligne</span> : <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full border border-slate-200"><WifiOff size={12}/> Hors Ligne</span>}</td>
                                    <td className="p-4 text-right"><div className="flex gap-2 justify-end">{isLinked && !readOnly && <button onClick={() => handleForceOffline(student, agency.id)} className="text-xs font-bold text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all" title="Délier (Reset lien)"><UserX size={16}/></button>}</div></td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};
