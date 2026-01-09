
import React, { useState, useMemo, useEffect } from 'react';
import { Agency, Student } from '../types';
import { Search, Wifi, WifiOff, Link, UserCheck, ShieldCheck, Loader2, Mail, Database, ServerCrash, FileClock, History, UserX, Trash2, Edit, Save, AlertCircle, RefreshCw, PlugZap } from 'lucide-react';
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

  // Filtrage des slots libres (IDs commençant par s- ou temporaires)
  // Ce sont les "coquilles vides" qui attendent un vrai utilisateur
  const availableSlots = useMemo(() => 
    allGameStudents
        .filter(({student}) => student.id.startsWith('s-') || student.id.startsWith('agency_'))
        .sort((a,b) => a.student.name.localeCompare(b.student.name))
  , [allGameStudents]);

  // USERS DISCONNECTED : Ceux qui sont connectés (Auth) mais pas liés au jeu (Agencies)
  const disconnectedUsers = useMemo(() => {
      return allUsers.filter(u => {
          if (u.role === 'admin' || u.role === 'supervisor') return false;
          // L'utilisateur est-il présent dans une agence avec son UID actuel ?
          const isLinked = allGameStudents.some(ags => ags.student.id === u.uid);
          return !isLinked;
      });
  }, [allUsers, allGameStudents]);

  const handleAssignStudent = async (firebaseUser: UserProfile, targetStudentId: string) => {
      if(readOnly) return;
      const targetAgency = agencies.find(a => a.members.some(m => m.id === targetStudentId));
      if (!targetAgency) return;

      const oldMemberData = targetAgency.members.find(m => m.id === targetStudentId);
      if (!oldMemberData) return;

      // Auto-validation si les noms sont très proches
      const similarity = firebaseUser.displayName?.toLowerCase() === oldMemberData.name.toLowerCase();
      
      const confirmed = similarity ? true : await confirm({
          title: "Confirmer la liaison",
          message: `Lier le compte Google "${firebaseUser.displayName}" \n\n➡️ au profil de jeu "${oldMemberData.name}" (${targetAgency.name}) ?\n\nL'ancien ID (${targetStudentId}) sera remplacé par l'ID Google (${firebaseUser.uid}).`,
          confirmText: "Valider la fusion"
      });

      if (!confirmed) return;

      try {
          const batch = writeBatch(db);
          
          // 1. Update User Profile in 'users' collection
          batch.update(doc(db, "users", firebaseUser.uid), {
              role: 'student',
              agencyId: targetAgency.id,
              linkedStudentId: targetStudentId,
              studentProfileName: oldMemberData.name,
              lastLogin: new Date().toISOString()
          });

          // 2. Update Agency Member in 'agencies' collection (SWAP ID)
          const updatedMembers = targetAgency.members.map(member => 
              member.id === targetStudentId 
              ? { 
                  ...member, 
                  id: firebaseUser.uid, // CRITICAL: Swap mock ID with real Auth UID
                  avatarUrl: firebaseUser.photoURL || member.avatarUrl, 
                  connectionStatus: 'online' as const
                } 
              : member
          );
          
          batch.update(doc(db, "agencies", targetAgency.id), { members: updatedMembers });
          
          await batch.commit();
          toast('success', `Compte lié : ${firebaseUser.displayName} est maintenant connecté.`);
      } catch (error) { 
          console.error(error);
          toast('error', "Erreur technique lors de la liaison."); 
      }
  };

  const handleForceOffline = async (student: Student, agencyId: string) => {
       if(readOnly || student.id.startsWith('s-')) return;
       if (await confirm({ title: "Délier l'étudiant ?", message: "L'étudiant sera déconnecté du jeu et retournera en salle d'attente.\nSon profil de jeu redeviendra un slot vide (bot).", confirmText: "Délier (Reset)", isDangerous: true })) {
           try {
               const batch = writeBatch(db);
               // Générer un nouvel ID de bot pour occuper la place
               const newMockId = `s-reset-${Date.now()}`; 
               const agency = agencies.find(a => a.id === agencyId);
               if (!agency) return;

               // On remet un ID "s-..." dans l'agence
               const updatedMembers = agency.members.map(m => m.id === student.id ? { ...m, id: newMockId, connectionStatus: 'offline' as const } : m);
               batch.update(doc(db, "agencies", agencyId), { members: updatedMembers });
               
               // On remet l'user en 'pending'
               batch.update(doc(db, "users", student.id), { role: 'pending', agencyId: null });
               
               await batch.commit();
               toast('success', "Lien rompu. Slot libéré.");
           } catch (e) { toast('error', "Erreur"); }
       }
  };

  const filteredStudents = allGameStudents.filter(s => s.student.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-in fade-in duration-500 pb-20">
         <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><PlugZap size={32}/></div>
                    Accès & Connexions
                </h2>
                <p className="text-slate-500 text-sm mt-1">Réparez les liens entre les comptes Google et les profils du jeu.</p>
            </div>
            {!readOnly && (
                <button onClick={async () => { if(await confirm({title:"Reset Complet", message:"ATTENTION : Ceci va réinitialiser toute la base de données (Agences, Membres, Scores). Tous les liens seront rompus.", isDangerous:true})) { setIsResetting(true); await resetGame(); setIsResetting(false); }}} className="text-xs font-bold text-slate-400 hover:text-red-600 border px-3 py-2 rounded-lg flex items-center gap-2 transition-colors">
                    {isResetting ? <Loader2 className="animate-spin" size={14}/> : <Database size={14}/>} Factory Reset
                </button>
            )}
        </div>

        {/* --- SECTION CRITIQUE : UTILISATEURS DÉCONNECTÉS --- */}
        <div className={`mb-8 border-l-4 rounded-2xl p-6 shadow-lg transition-all ${disconnectedUsers.length > 0 ? 'bg-amber-50 border-amber-500' : 'bg-slate-50 border-slate-300'}`}>
            <h3 className={`font-bold text-lg mb-2 flex items-center gap-2 ${disconnectedUsers.length > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
                {disconnectedUsers.length > 0 ? <AlertCircle size={24} className="animate-pulse"/> : <UserCheck size={24}/>}
                File d'Attente & Problèmes de Connexion ({disconnectedUsers.length})
            </h3>
            
            {disconnectedUsers.length > 0 ? (
                <>
                    <p className="text-sm text-amber-800/80 mb-6">
                        Ces utilisateurs sont connectés à l'application mais <strong>ne sont pas liés</strong> à une agence. 
                        <br/>Sélectionnez leur profil "Jeu" (Slot) dans la liste de droite pour les reconnecter.
                    </p>
                    <div className="space-y-4">
                        {disconnectedUsers.map(user => (
                            <div key={user.uid} className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4 animate-in slide-in-from-left-2">
                                {/* GAUCHE: L'utilisateur Google */}
                                <div className="flex items-center gap-4 min-w-[300px]">
                                    <div className="relative">
                                        <img src={user.photoURL} className="w-12 h-12 rounded-full border-2 border-amber-100" alt="Avatar" />
                                        <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">Google</div>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-base">{user.displayName}</p>
                                        <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                                        <div className="flex gap-2 mt-1">
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${user.role === 'pending' ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-500'}`}>
                                                {user.role === 'pending' ? 'En attente' : 'Lien perdu'}
                                            </span>
                                            <span className="text-[9px] text-slate-300 font-mono" title={user.uid}>ID: ...{user.uid.slice(-4)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* CENTRE: L'action */}
                                <div className="hidden xl:flex text-slate-300">
                                    <Link size={24} />
                                </div>

                                {/* DROITE: Le Slot à remplir */}
                                <div className="flex-1 w-full">
                                    <select 
                                        className="w-full p-3 rounded-xl bg-indigo-50/50 text-indigo-900 text-sm font-bold border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer hover:bg-indigo-50"
                                        onChange={(e) => handleAssignStudent(user, e.target.value)}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>⚡️ Sélectionner le profil à lier...</option>
                                        {availableSlots.map(({student, agency}) => (
                                            <option key={student.id} value={student.id}>
                                                {student.name} — {agency.name} (Classe {agency.classId})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <p className="text-sm text-slate-500 italic">Aucun utilisateur en attente. Tout le monde est connecté.</p>
            )}
        </div>

        {/* SECTION : ANNUAIRE GLOBAL */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                 <h3 className="font-bold text-slate-700 flex items-center gap-2"><ShieldCheck size={18} /> Annuaire & Statut des Liens</h3>
                 <div className="relative w-full md:w-64">
                     <Search size={16} className="absolute left-3 top-3 text-slate-400"/>
                     <input type="text" placeholder="Rechercher un profil..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                 </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                        <tr>
                            <th className="p-4">Profil Jeu</th>
                            <th className="p-4">Agence</th>
                            <th className="p-4">Classe</th>
                            <th className="p-4">État du lien</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map(({student, agency}) => {
                            // Un ID qui commence par "s-" ou "agency_" est un ID généré/bot, donc pas lié à un vrai user Google (qui a un ID alphanumérique long)
                            const isLinked = !student.id.startsWith('s-') && !student.id.startsWith('agency_');
                            
                            return (
                                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <img src={student.avatarUrl} className={`w-8 h-8 rounded-full ${isLinked ? '' : 'grayscale opacity-50'}`} />
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm">{student.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{student.id.slice(0, 8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600 font-medium">{agency.name}</td>
                                    <td className="p-4">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${agency.classId === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                            CLASSE {agency.classId}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {isLinked ? 
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                                <Wifi size={12}/> Connecté
                                            </span> 
                                            : 
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full border border-slate-200" title="En attente de liaison avec un compte Google">
                                                <WifiOff size={12}/> Slot Vide (Bot)
                                            </span>
                                        }
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex gap-2 justify-end">
                                            {isLinked && !readOnly && (
                                                <button 
                                                    onClick={() => handleForceOffline(student, agency.id)} 
                                                    className="text-xs font-bold text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-all flex items-center gap-2" 
                                                    title="Rompre le lien (Kick)"
                                                >
                                                    <UserX size={14}/> Délier
                                                </button>
                                            )}
                                        </div>
                                    </td>
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
