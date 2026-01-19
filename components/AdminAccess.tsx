
import React, { useState, useMemo, useEffect } from 'react';
import { Agency, Student } from '../types';
import { Search, Database, UserX, Shield, XCircle, AlertCircle, RefreshCw, KeyRound, Check, ExternalLink } from 'lucide-react';
import { collection, query, onSnapshot, doc, writeBatch, updateDoc, deleteDoc, db } from '../services/firebase';
import { useUI } from '../contexts/UIContext';

// SUB-COMPONENTS
import { AccessStats } from './admin/access/AccessStats';
import { DuplicateAlerts } from './admin/access/DuplicateAlerts';
import { SupervisorsList } from './admin/access/SupervisorsList';

export interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
    role: 'admin' | 'student' | 'pending' | 'supervisor';
    linkedStudentId?: string | null;
    studentProfileName?: string | null;
    agencyId?: string | null;
}

interface AdminAccessProps {
  agencies: Agency[];
  onUpdateAgencies: (agencies: Agency[]) => void;
  readOnly?: boolean;
}

export const AdminAccess: React.FC<AdminAccessProps> = ({ agencies, onUpdateAgencies, readOnly }) => {
  const { toast, confirm } = useUI();
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // 1. ÉCOUTER LES COMPTS FIREBASE
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

  // 2. LOGIQUE DES DOUBLONS
  const duplicates = useMemo(() => {
      const studentMap: Record<string, UserProfile[]> = {};
      allUsers.forEach(u => {
          if (u.linkedStudentId) {
              if (!studentMap[u.linkedStudentId]) studentMap[u.linkedStudentId] = [];
              studentMap[u.linkedStudentId].push(u);
          }
      });
      return Object.entries(studentMap)
          .filter(([_, accounts]) => accounts.length > 1)
          .map(([id, accounts]) => ({
              studentName: accounts[0].studentProfileName || id,
              accounts
          }));
  }, [allUsers]);

  // 3. VIVIER DES SLOTS DE JEU DISPONIBLES
  const availableSlots = useMemo(() => {
      const slots: { student: Student, agency: Agency }[] = [];
      agencies.forEach(agency => {
          agency.members.forEach(member => {
              if (member.id.startsWith('s-') || member.id.startsWith('agency_') || member.id.startsWith('unassigned_')) {
                  slots.push({ student: member, agency });
              }
          });
      });
      return slots.sort((a,b) => a.student.name.localeCompare(b.student.name));
  }, [agencies]);

  const pendingUsers = allUsers.filter(u => u.role === 'pending');

  // --- ACTIONS ---

  const handleFullResetAccount = async (uid: string, displayName: string) => {
      if(readOnly) return;
      if (await confirm({ 
          title: "Réinitialiser le compte ?", 
          message: `L'utilisateur "${displayName}" sera déconnecté de tout profil étudiant et repassera en attente de validation.`, 
          confirmText: "Réinitialiser", 
          isDangerous: true 
      })) {
           try {
               const batch = writeBatch(db);
               // Libérer le slot dans l'agence si nécessaire
               agencies.forEach(agency => {
                   const member = agency.members.find(m => m.id === uid);
                   if (member) {
                       const newMockId = `s-reset-${Date.now()}`;
                       const updatedMembers = agency.members.map(m => m.id === uid ? { ...m, id: newMockId, connectionStatus: 'offline' as const } : m);
                       batch.update(doc(db, "agencies", agency.id), { members: updatedMembers });
                   }
               });
               
               batch.update(doc(db, "users", uid), { 
                   role: 'pending', agencyId: null, linkedStudentId: null, studentProfileName: null
               });
               
               await batch.commit();
               toast('success', "Le compte a été remis en attente.");
           } catch (e) { toast('error', "Échec du reset."); }
      }
  };

  const handleAssign = async (firebaseUser: UserProfile, targetStudentId: string) => {
      if(readOnly) return;
      const target = availableSlots.find(s => s.student.id === targetStudentId);
      if (!target) return;

      const confirmed = await confirm({
          title: "Confirmer la liaison",
          message: `Lier "${firebaseUser.displayName}" au profil "${target.student.name}" ?`,
          confirmText: "Lier le compte"
      });

      if (!confirmed) return;

      try {
          const batch = writeBatch(db);
          batch.update(doc(db, "users", firebaseUser.uid), {
              role: 'student',
              agencyId: target.agency.id,
              linkedStudentId: firebaseUser.uid, // On utilise l'UID final pour l'agence
              studentProfileName: target.student.name
          });
          const updatedMembers = target.agency.members.map(m => 
              m.id === targetStudentId ? { ...m, id: firebaseUser.uid, connectionStatus: 'online' as const } : m
          );
          batch.update(doc(db, "agencies", target.agency.id), { members: updatedMembers });
          await batch.commit();
          toast('success', `Compte lié.`);
      } catch (error) { toast('error', "Erreur technique."); }
  };

  const handlePromote = async (uid: string) => {
      if(readOnly) return;
      if (await confirm({ title: "Promouvoir Superviseur ?", message: "Cet utilisateur pourra voir toutes les agences en lecture seule." })) {
          await updateDoc(doc(db, "users", uid), { role: 'supervisor', linkedStudentId: null, agencyId: null });
          toast('success', "Promu !");
      }
  };

  const filteredDirectory = allUsers.filter(u => 
      u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-500 pb-20">
         <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg"><KeyRound size={32}/></div>
                Gestion des Accès
            </h2>
            <p className="text-slate-500 text-sm mt-1">Surveillez les connexions et corrigez les erreurs d'identité.</p>
        </div>

        <AccessStats 
            total={allUsers.length} 
            supervisors={allUsers.filter(u => u.role === 'supervisor' || u.role === 'admin').length}
            linked={allUsers.filter(u => u.role === 'student').length}
            pending={pendingUsers.length}
            duplicates={duplicates.length}
        />

        <DuplicateAlerts duplicates={duplicates} onReset={handleFullResetAccount} />

        <SupervisorsList users={allUsers} />

        {/* SECTION : NOUVELLES CONNEXIONS (PENDING) */}
        {pendingUsers.length > 0 && (
            <div className="mb-8 bg-amber-50 rounded-3xl p-6 border-2 border-amber-200 shadow-lg">
                <h3 className="font-bold text-amber-800 text-lg mb-4 flex items-center gap-2">
                    <AlertCircle size={24} className="animate-pulse text-amber-600"/> 
                    Comptes en attente d'affectation ({pendingUsers.length})
                </h3>
                <div className="space-y-3">
                    {pendingUsers.map(user => (
                        <div key={user.uid} className="bg-white p-4 rounded-xl border border-amber-200 flex flex-col lg:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-[250px]">
                                <img src={user.photoURL} className="w-10 h-10 rounded-full" />
                                <div>
                                    <p className="font-bold text-slate-900">{user.displayName}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex-1 w-full max-w-md">
                                <select 
                                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500"
                                    onChange={(e) => handleAssign(user, e.target.value)}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Lier à un profil Étudiant...</option>
                                    {availableSlots.map(({student, agency}) => (
                                        <option key={student.id} value={student.id}>{student.name} ({agency.name})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button onClick={() => handlePromote(user.uid)} className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2">
                                    <Shield size={14}/> Superviseur
                                </button>
                                <button onClick={() => handleFullResetAccount(user.uid, user.displayName)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                    <XCircle size={20}/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* ANNUAIRE COMPLET */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                 <h3 className="font-bold text-slate-700 flex items-center gap-2"><Database size={18} /> Annuaire des Authentifiés</h3>
                 <div className="relative w-full md:w-64">
                     <Search size={18} className="absolute left-3 top-2.5 text-slate-400"/>
                     <input 
                        type="text" 
                        placeholder="Chercher email ou nom..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                 </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-100">
                        <tr>
                            <th className="p-4">Utilisateur Firebase</th>
                            <th className="p-4">Statut / Lien Jeu</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredDirectory.map(user => {
                            const isLinked = user.role === 'student';
                            return (
                                <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <img src={user.photoURL} className="w-8 h-8 rounded-full bg-slate-100" />
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm">{user.displayName}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {isLinked ? (
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 bg-emerald-100 text-emerald-600 rounded">
                                                    <Check size={12}/>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700">{user.studentProfileName}</p>
                                                    <p className="text-[10px] text-slate-400">Agence ID: {user.agencyId}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                                                user.role === 'admin' ? 'bg-indigo-600 text-white' : 
                                                user.role === 'supervisor' ? 'bg-purple-100 text-purple-700' : 
                                                'bg-slate-100 text-slate-400'
                                            }`}>
                                                {user.role}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        {user.role !== 'admin' && !readOnly && (
                                            <button 
                                                onClick={() => handleFullResetAccount(user.uid, user.displayName)}
                                                className="text-[10px] font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-all flex items-center gap-2 ml-auto"
                                            >
                                                <RefreshCw size={12}/> Réinitialiser
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};
