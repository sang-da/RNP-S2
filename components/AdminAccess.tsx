
import React, { useState, useMemo, useEffect } from 'react';
import { Agency, Student } from '../types';
import { Search, Wifi, WifiOff, Link, UserCheck, ShieldCheck, Loader2, Mail, RefreshCw, Database, ServerCrash } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useUI } from '../contexts/UIContext';
import { useGame } from '../contexts/GameContext'; // Pour resetGame

interface AdminAccessProps {
  agencies: Agency[];
  onUpdateAgencies: (agencies: Agency[]) => void;
}

interface PendingUser {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
    role: string;
}

export const AdminAccess: React.FC<AdminAccessProps> = ({ agencies, onUpdateAgencies }) => {
  const { toast, confirm } = useUI();
  const { resetGame } = useGame();
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isResetting, setIsResetting] = useState(false);

  // 1. REAL-TIME LISTENER FOR PENDING USERS
  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const users: PendingUser[] = [];
        snapshot.forEach((doc) => {
            users.push(doc.data() as PendingUser);
        });
        setPendingUsers(users);
    }, (error) => {
        console.error("Auth Listener Error", error);
    });
    return () => unsubscribe();
  }, []);

  // Flatten all students from Game State
  const allGameStudents = useMemo(() => {
    const students: { student: Student, agency: Agency }[] = [];
    agencies.forEach(agency => {
        agency.members.forEach(member => {
            students.push({ student: member, agency });
        });
    });
    return students;
  }, [agencies]);

  const filteredStudents = allGameStudents.filter(s => 
      s.student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter only students who have a "Mock ID" (starting with s-)
  // If ID is a long string, it means it's already linked to a Real User.
  const availableSlots = allGameStudents
    .filter(({student}) => student.id.startsWith('s-')) 
    .sort((a,b) => a.student.name.localeCompare(b.student.name));

  const handleAssignStudent = async (firebaseUser: PendingUser, targetStudentId: string) => {
      // Find target agency and student in Game State
      let targetAgency: Agency | undefined;
      let targetMemberIndex = -1;

      for (const agency of agencies) {
          const idx = agency.members.findIndex(m => m.id === targetStudentId);
          if (idx !== -1) {
              targetAgency = agency;
              targetMemberIndex = idx;
              break;
          }
      }

      if (!targetAgency || targetMemberIndex === -1) {
          toast('error', "Profil étudiant introuvable.");
          return;
      }

      const oldMemberData = targetAgency.members[targetMemberIndex];

      try {
          const batch = writeBatch(db);

          // 1. Update USER doc (Auth side)
          const userRef = doc(db, "users", firebaseUser.uid);
          batch.update(userRef, {
              role: 'student',
              agencyId: targetAgency.id,
              linkedStudentId: targetStudentId // Traceability
          });

          // 2. Update AGENCY doc (Game side)
          // We replace the mock ID with the real Firebase UID to link them
          const updatedMembers = [...targetAgency.members];
          updatedMembers[targetMemberIndex] = {
              ...oldMemberData,
              id: firebaseUser.uid, // CRITICAL: Link Auth UID to Game Entity
              avatarUrl: firebaseUser.photoURL || oldMemberData.avatarUrl, // Use Google Photo if available
              // We keep the Game Name (e.g. "Kassandra") or update it? Let's keep Game Name but maybe append info if needed.
              // For now, we trust the preset names or let them update it later.
              connectionStatus: 'online'
          };

          const agencyRef = doc(db, "agencies", targetAgency.id);
          batch.update(agencyRef, { members: updatedMembers });

          await batch.commit();
          toast('success', `${firebaseUser.displayName} relié au profil "${oldMemberData.name}"`);

      } catch (error) {
          console.error(error);
          toast('error', "Erreur lors de l'assignation");
      }
  };

  const handleForceOffline = async (student: Student, agencyId: string) => {
       const agency = agencies.find(a => a.id === agencyId);
       if(!agency) return;

       const updatedMembers = agency.members.map(m => 
           m.id === student.id ? { ...m, connectionStatus: 'offline' as const } : m
       );
       
       const agencyRef = doc(db, "agencies", agencyId);
       await updateDoc(agencyRef, { members: updatedMembers });
       toast('info', `${student.name} marqué hors ligne.`);
  };

  const handleResetDatabase = async () => {
      const confirmed = await confirm({
          title: "Réinitialiser la Base de Données ?",
          message: "ATTENTION : Ceci va écraser les données actuelles avec les équipes par défaut.\n\nUtile si votre base est vide ou corrompue.",
          confirmText: "Oui, initialiser les données",
          isDangerous: true
      });

      if (confirmed) {
          setIsResetting(true);
          try {
            await resetGame();
          } catch(e) {
            // Error handled in context
          } finally {
            setIsResetting(false);
          }
      }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
         <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><ShieldCheck size={32}/></div>
                    Accès & Comptes
                </h2>
                <p className="text-slate-500 text-sm mt-1">Liez les comptes Google entrants aux profils étudiants pré-existants.</p>
            </div>
            
            <button 
                onClick={handleResetDatabase}
                disabled={isResetting}
                className="text-xs font-bold text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
                {isResetting ? <Loader2 className="animate-spin" size={14}/> : <Database size={14}/>}
                Restaurer / Initialiser
            </button>
        </div>

        {/* SECTION 1: GATEKEEPER (Real Pending Connections) */}
        {pendingUsers.length > 0 && (
            <div className="mb-8 bg-white border border-indigo-100 rounded-2xl p-6 shadow-sm ring-4 ring-indigo-50/50">
                <h3 className="text-indigo-900 font-bold mb-4 flex items-center gap-2">
                    <Loader2 size={20} className="animate-spin text-indigo-500"/> Salle d'Attente ({pendingUsers.length})
                </h3>
                <div className="space-y-3">
                    {pendingUsers.map(user => (
                        <div key={user.uid} className="flex flex-col md:flex-row items-center justify-between bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 gap-4">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <img 
                                    src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                                    alt="Google Profile" 
                                    className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                                />
                                <div>
                                    <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                        {user.displayName}
                                    </p>
                                    <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                                        <Mail size={12}/> {user.email}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full md:w-auto bg-white p-2 rounded-xl border border-indigo-100 shadow-sm">
                                <span className="text-xs font-bold text-slate-400 uppercase hidden md:inline whitespace-nowrap px-2">C'est qui ?</span>
                                <select 
                                    className="flex-1 md:w-64 p-2 rounded-lg bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 border-none"
                                    onChange={(e) => {
                                        if(e.target.value) handleAssignStudent(user, e.target.value);
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Choisir un profil libre...</option>
                                    {availableSlots.length > 0 ? (
                                        availableSlots.map(({student, agency}) => (
                                            <option key={student.id} value={student.id}>
                                                {student.name} ({agency.name})
                                            </option>
                                        ))
                                    ) : (
                                        <option disabled>Aucun profil libre</option>
                                    )}
                                </select>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* SECTION 2: STUDENT DIRECTORY */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50">
                 <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <UserCheck size={18} /> Annuaire Étudiants
                 </h3>
                 <div className="relative w-full md:w-64">
                    <Search size={16} className="absolute left-3 top-3 text-slate-400"/>
                    <input 
                        type="text" 
                        placeholder="Rechercher..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                 </div>
            </div>
            
            {filteredStudents.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                            <tr>
                                <th className="p-4">Étudiant</th>
                                <th className="p-4">Agence / Groupe</th>
                                <th className="p-4">Classe</th>
                                <th className="p-4">Statut</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStudents.map(({student, agency}) => {
                                // Check if it's a "Mock ID" (s-123) or a "Real ID" (long string)
                                const isLinked = !student.id.startsWith('s-');

                                return (
                                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <img src={student.avatarUrl} className={`w-8 h-8 rounded-full object-cover ${isLinked ? 'bg-indigo-100' : 'bg-slate-200 grayscale'}`} />
                                                {student.connectionStatus === 'online' && isLinked && (
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm">{student.name}</div>
                                                {isLinked ? (
                                                    <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 rounded w-fit flex items-center gap-1">
                                                        <Link size={8}/> Compte Relié
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] text-slate-400 font-medium italic">En attente liaison</div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600 font-medium">
                                        {agency.name}
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${student.classId === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                            CLASSE {student.classId}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {student.connectionStatus === 'online' && isLinked ? (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                                <Wifi size={12}/> En Ligne
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                                                <WifiOff size={12}/> Hors Ligne
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        {isLinked && (
                                            <button 
                                                onClick={() => handleForceOffline(student, agency.id)}
                                                className="text-xs font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-red-200 transition-all"
                                                title="Forcer déconnexion / délier (Fonction avancée)"
                                            >
                                                <WifiOff size={14}/>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400 gap-4">
                    <ServerCrash size={48} className="text-slate-200"/>
                    <div>
                        <p className="text-lg font-bold text-slate-500">Aucune donnée trouvée.</p>
                        <p className="text-sm">La base de données semble vide ou inaccessible.</p>
                    </div>
                    <button 
                        onClick={handleResetDatabase}
                        className="mt-4 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                    >
                        Initialiser les données par défaut
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};
