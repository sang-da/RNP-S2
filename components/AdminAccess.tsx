
import React, { useState, useMemo, useEffect } from 'react';
import { Agency, Student } from '../types';
import { Search, Database, UserX, Shield, XCircle, AlertCircle, RefreshCw, KeyRound, Check, ExternalLink, Activity, Clock } from 'lucide-react';
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
    lastLogin?: any; // Firestore Timestamp
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
  const [now, setNow] = useState(Date.now());

  // Update "now" every minute to refresh "Online" status badges
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

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

  // --- HELPERS D'AFFICHAGE ---
  const isOnline = (lastLogin: any) => {
      if (!lastLogin) return false;
      const loginTime = lastLogin.toMillis ? lastLogin.toMillis() : lastLogin;
      const diffMinutes = (now - loginTime) / (1000 * 60);
      return diffMinutes < 15; // Actif depuis moins de 15 minutes
  };

  const getAgencyName = (agencyId?: string | null) => {
      if (!agencyId) return "Non assigné";
      const agency = agencies.find(a => a.id === agencyId);
      return agency ? agency.name : "Studio Inconnu";
  };

  const pendingUsers = allUsers.filter(u => u.role === 'pending');
  const onlineCount = allUsers.filter(u => isOnline(u.lastLogin)).length;

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
              linkedStudentId: firebaseUser.uid, 
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
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.studentProfileName?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
      // Sort by online status first, then name
      const aOn = isOnline(a.lastLogin);
      const bOn = isOnline(b.lastLogin);
      if (aOn && !bOn) return -1;
      if (!aOn && bOn) return 1;
      return a.displayName.localeCompare(b.displayName);
  });

  return (
    <div className="animate-in fade-in duration-500 pb-20">
         <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg"><KeyRound size={32}/></div>
                Gestion des Accès
            </h2>
            <p className="text-slate-500 text-sm mt-1">Surveillez les connexions en temps réel et gérez les identités.</p>
        </div>

        <AccessStats 
            total={allUsers.length} 
            supervisors={allUsers.filter(u => u.role === 'supervisor' || u.role === 'admin').length}
            linked={allUsers.filter(u => u.role === 'student').length}
            pending={pendingUsers.length}
            duplicates={duplicates.length}
            online={onlineCount}
        />

        <DuplicateAlerts duplicates={duplicates} onReset={handleFullResetAccount} />

        <SupervisorsList users={allUsers} />

        {/* SECTION : NOUVELLES CONNEXIONS (PENDING) */}
        {pendingUsers.length > 0 && (
            <div className="mb-8 bg-amber-50 rounded-3xl p-6 border-2 border-amber-200 shadow-lg">
                <h3 className="font-bold text-amber-800 text-lg mb-4 flex items-center gap-2">
                    <AlertCircle size={24} className="animate-pulse text-amber-600"/> 
                    Nouveaux comptes en attente ({pendingUsers.length})
                </h3>
                <div className="space-y-3">
                    {pendingUsers.map(user => (
                        <div key={user.uid} className="bg-white p-4 rounded-xl border border-amber-200 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-sm">
                            <div className="flex items-center gap-4 min-w-[250px]">
                                <img src={user.photoURL} className="w-12 h-12 rounded-full border-2 border-amber-100" />
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
                                    <Shield size={14}/> Prof / Staff
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
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                 <h3 className="font-bold text-slate-700 flex items-center gap-2"><Database size={18} /> Annuaire des Utilisateurs</h3>
                 <div className="relative w-full md:w-80">
                     <Search size={18} className="absolute left-3 top-3 text-slate-400"/>
                     <input 
                        type="text" 
                        placeholder="Nom, Email ou Agence..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    />
                 </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-100">
                        <tr>
                            <th className="p-4">Utilisateur</th>
                            <th className="p-4 text-center">Présence</th>
                            <th className="p-4">Profil Étudiant & Studio</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredDirectory.map(user => {
                            const isLinked = user.role === 'student';
                            const online = isOnline(user.lastLogin);
                            const agencyName = getAgencyName(user.agencyId);

                            return (
                                <tr key={user.uid} className={`hover:bg-indigo-50/30 transition-colors ${online ? 'bg-emerald-50/10' : ''}`}>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <img src={user.photoURL} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                                                {online && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm leading-tight">{user.displayName}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        {online ? (
                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider animate-pulse">
                                                <Activity size={10}/> En ligne
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                                <Clock size={10}/> Hors ligne
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {isLinked ? (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-indigo-900">{user.studentProfileName}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                     <div className="p-1 bg-white border border-slate-200 rounded text-indigo-600">
                                                        <Activity size={12}/>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Studio: {agencyName}</span>
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
                                                className="text-[10px] font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-all flex items-center gap-2 ml-auto shadow-sm"
                                            >
                                                <RefreshCw size={12}/> Détacher
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
