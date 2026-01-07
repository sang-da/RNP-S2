
import React, { useState, useMemo, useEffect } from 'react';
import { Agency, Student, StudentHistoryEntry } from '../types';
import { Search, Wifi, WifiOff, Link, UserCheck, ShieldCheck, Loader2, Mail, Database, ServerCrash, FileClock, History, ArrowRight, UserX, Briefcase, Eye, Trash2, Edit, Save, X } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, writeBatch, updateDoc, deleteDoc, db } from '../services/firebase';
import { useUI } from '../contexts/UIContext';
import { useGame } from '../contexts/GameContext'; 
import { Modal } from './Modal';

interface AdminAccessProps {
  agencies: Agency[];
  onUpdateAgencies: (agencies: Agency[]) => void;
  readOnly?: boolean;
}

interface PendingUser {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
    role: string;
}

export const AdminAccess: React.FC<AdminAccessProps> = ({ agencies, onUpdateAgencies, readOnly }) => {
  const { toast, confirm } = useUI();
  const { resetGame } = useGame();
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);

  // EDIT STATE
  const [editingStudent, setEditingStudent] = useState<{ student: Student, agencyId: string } | null>(null);
  const [editForm, setEditForm] = useState<{ name: string, classId: 'A' | 'B' }>({ name: '', classId: 'A' });

  // 1. REAL-TIME LISTENER FOR PENDING USERS
  useEffect(() => {
    // Listen to users where role is 'pending'
    const q = query(collection(db, "users"), where("role", "==", "pending"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const users: PendingUser[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            users.push({
                uid: doc.id,
                displayName: data.displayName || 'Sans Nom',
                email: data.email || '',
                photoURL: data.photoURL || '',
                role: data.role
            });
        });
        setPendingUsers(users);
    }, (error) => {
        console.error("Error listening to pending users:", error);
        toast('error', "Erreur de synchro Salle d'Attente");
    });
    return () => unsubscribe();
  }, [toast]);

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
  // These are the empty shells waiting for a real soul.
  const availableSlots = allGameStudents
    .filter(({student}) => student.id.startsWith('s-')) 
    .sort((a,b) => a.student.name.localeCompare(b.student.name));

  const handleAssignStudent = async (firebaseUser: PendingUser, targetStudentId: string) => {
      if(readOnly) return;
      // Find target agency in Game State
      const targetAgency = agencies.find(a => a.members.some(m => m.id === targetStudentId));

      if (!targetAgency) {
          toast('error', "Agence cible introuvable pour cet étudiant.");
          return;
      }

      const oldMemberData = targetAgency.members.find(m => m.id === targetStudentId);
      if (!oldMemberData) {
          toast('error', "Profil étudiant introuvable.");
          return;
      }

      // Safety Check: Profil déjà pris ?
      if (!oldMemberData.id.startsWith('s-')) {
          toast('error', "Ce profil semble déjà occupé par un utilisateur réel.");
          return;
      }

      const confirmed = await confirm({
          title: "Lier le compte ?",
          message: `Voulez-vous donner le contrôle de "${oldMemberData.name}" (Agence: ${targetAgency.name}) à ${firebaseUser.displayName} ?`,
          confirmText: "Valider la Liaison"
      });

      if (!confirmed) return;

      try {
          const batch = writeBatch(db);

          // 1. Update USER doc (Auth side) -> Gives them the role and access
          // C'est ce qui débloque le WaitingScreen côté étudiant
          const userRef = doc(db, "users", firebaseUser.uid);
          batch.update(userRef, {
              role: 'student',
              agencyId: targetAgency.id,
              linkedStudentId: targetStudentId, // Garde une trace de l'ID original (mock)
              studentProfileName: oldMemberData.name, // Nom d'origine
              lastLogin: new Date().toISOString()
          });

          // 2. Update AGENCY doc (Game side) -> Replaces the Mock ID with Real UID
          // C'est ce qui permet au jeu de savoir que ce membre est un "vrai" joueur
          const updatedMembers = targetAgency.members.map(member => {
              if (member.id === targetStudentId) {
                  return {
                      ...member,
                      id: firebaseUser.uid, // LE PLUS IMPORTANT : On remplace l'ID fictif par l'UID Firebase
                      avatarUrl: firebaseUser.photoURL || member.avatarUrl,
                      connectionStatus: 'online' as const, // Force le statut en ligne
                      // On peut aussi stocker l'email pour référence admin facile
                      email: firebaseUser.email 
                  };
              }
              return member;
          });

          const agencyRef = doc(db, "agencies", targetAgency.id);
          batch.update(agencyRef, { members: updatedMembers });

          await batch.commit();
          toast('success', `${firebaseUser.displayName} est maintenant connecté au profil ${oldMemberData.name} !`);

      } catch (error) {
          console.error("Assign Error:", error);
          toast('error', "Erreur lors de l'assignation. Vérifiez les droits.");
      }
  };

  const handleRejectPending = async (firebaseUser: PendingUser) => {
      if(readOnly) return;
      const confirmed = await confirm({
          title: "Refuser l'accès ?",
          message: `Voulez-vous supprimer la demande de ${firebaseUser.displayName} ?\nL'utilisateur devra se reconnecter pour refaire une demande.`,
          confirmText: "Refuser et Supprimer",
          isDangerous: true
      });

      if (!confirmed) return;

      try {
          await deleteDoc(doc(db, "users", firebaseUser.uid));
          toast('success', "Utilisateur retiré de la salle d'attente.");
      } catch (error) {
          console.error(error);
          toast('error', "Erreur lors de la suppression.");
      }
  };

  const handlePromoteSupervisor = async (firebaseUser: PendingUser) => {
      if(readOnly) return;
      const confirmed = await confirm({
          title: "Nommer Superviseur ?",
          message: `Voulez-vous accorder le rôle de SUPERVISEUR à ${firebaseUser.displayName} ?\n\nCe rôle permet de consulter TOUTES les données (Admin + Étudiant) mais sans pouvoir de modification.`,
          confirmText: "Nommer Superviseur",
          isDangerous: false
      });

      if (!confirmed) return;

      try {
          const userRef = doc(db, "users", firebaseUser.uid);
          await updateDoc(userRef, {
              role: 'supervisor',
              lastLogin: new Date().toISOString()
          });
          toast('success', `${firebaseUser.displayName} est maintenant Superviseur.`);
      } catch (e) {
          console.error(e);
          toast('error', "Erreur promotion superviseur");
      }
  };

  const handleForceOffline = async (student: Student, agencyId: string) => {
       if(readOnly) return;
       // Only allows unlinking if it's a real user (not a mock id starting with s-)
       if (student.id.startsWith('s-')) return;

       const confirmed = await confirm({
           title: "Délier l'étudiant ?",
           message: "Attention : L'étudiant perdra l'accès à ce profil et retournera en salle d'attente.\nLe profil agence redeviendra un 'bot' inactif.",
           confirmText: "Délier / Réinitialiser",
           isDangerous: true
       });

       if (!confirmed) return;

       try {
           const batch = writeBatch(db);

           const agency = agencies.find(a => a.id === agencyId);
           if (!agency) return;

           // 1. Reset Agency Member to a NEW Mock ID
           // Cela libère le "slot" pour qu'il réapparaisse dans la liste déroulante "availableSlots"
           const newMockId = `s-reset-${Date.now()}`; 
           
           const updatedMembers = agency.members.map(m => 
               m.id === student.id ? { 
                   ...m, 
                   id: newMockId, // Nouvel ID Mock
                   connectionStatus: 'offline' as const,
                   avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newMockId}` // Reset avatar
               } : m
           );
           
           const agencyRef = doc(db, "agencies", agencyId);
           batch.update(agencyRef, { members: updatedMembers });

           // 2. Reset User Doc to Pending
           // L'utilisateur retourne dans la liste "Salle d'Attente"
           const userRef = doc(db, "users", student.id);
           batch.update(userRef, { 
               role: 'pending', 
               agencyId: null,
               linkedStudentId: null
           });

           await batch.commit();
           toast('success', "Liaison supprimée. L'utilisateur est retourné en attente.");
       } catch (e) {
           console.error(e);
           toast('error', "Erreur lors du déliage.");
       }
  };

  const openEditStudent = (student: Student, agencyId: string) => {
      setEditingStudent({ student, agencyId });
      setEditForm({ name: student.name, classId: student.classId });
  };

  const handleSaveStudent = async () => {
      if (!editingStudent || readOnly) return;
      if (!editForm.name.trim()) return;

      try {
          const batch = writeBatch(db);
          
          // 1. Update Agency Member
          const agency = agencies.find(a => a.id === editingStudent.agencyId);
          if (!agency) return;

          const updatedMembers = agency.members.map(m => 
              m.id === editingStudent.student.id 
              ? { ...m, name: editForm.name, classId: editForm.classId } 
              : m
          );

          const agencyRef = doc(db, "agencies", agency.id);
          batch.update(agencyRef, { members: updatedMembers });

          // 2. If student is real (linked), update User profile for consistency
          if (!editingStudent.student.id.startsWith('s-')) {
              const userRef = doc(db, "users", editingStudent.student.id);
              batch.update(userRef, { studentProfileName: editForm.name });
          }

          await batch.commit();
          toast('success', "Profil étudiant mis à jour.");
          setEditingStudent(null);
      } catch (e) {
          console.error(e);
          toast('error', "Erreur lors de la modification.");
      }
  };

  const handleResetDatabase = async () => {
      if(readOnly) return;
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
            
            {!readOnly && (
                <button 
                    onClick={handleResetDatabase}
                    disabled={isResetting}
                    className="text-xs font-bold text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    {isResetting ? <Loader2 className="animate-spin" size={14}/> : <Database size={14}/>}
                    Restaurer / Initialiser
                </button>
            )}
        </div>

        {/* SECTION 1: GATEKEEPER (Real Pending Connections) */}
        <div className={`mb-8 border rounded-2xl p-6 shadow-sm transition-all ${pendingUsers.length > 0 ? 'bg-white border-indigo-100 ring-4 ring-indigo-50/50' : 'bg-slate-50 border-dashed border-slate-200 opacity-60'}`}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${pendingUsers.length > 0 ? 'text-indigo-900' : 'text-slate-400'}`}>
                {pendingUsers.length > 0 ? <Loader2 size={20} className="animate-spin text-indigo-500"/> : <WifiOff size={20}/>}
                Salle d'Attente ({pendingUsers.length})
            </h3>
            
            {pendingUsers.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Aucun nouvel utilisateur en attente de validation.</p>
            ) : (
                <div className="space-y-3">
                    {pendingUsers.map(user => (
                        <div key={user.uid} className="flex flex-col xl:flex-row items-start xl:items-center justify-between bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 gap-4">
                            <div className="flex items-center gap-4 w-full xl:w-auto">
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
                            
                            {!readOnly && (
                            <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
                                <button 
                                    onClick={() => handlePromoteSupervisor(user)}
                                    className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap"
                                >
                                    <Eye size={14}/> Nommer Superviseur
                                </button>

                                <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-indigo-100 shadow-sm w-full">
                                    <span className="text-xs font-bold text-slate-400 uppercase hidden xl:inline whitespace-nowrap px-2">Lier à :</span>
                                    <select 
                                        className="flex-1 w-full xl:w-64 p-2 rounded-lg bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 border-none cursor-pointer"
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
                                
                                <button 
                                    onClick={() => handleRejectPending(user)}
                                    className="bg-red-100 text-red-600 hover:bg-red-200 p-3 rounded-lg transition-colors"
                                    title="Refuser et Supprimer"
                                >
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>

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
                                        <div className="flex gap-2 justify-end">
                                            {!readOnly && (
                                                <button 
                                                    onClick={() => openEditStudent(student, agency.id)}
                                                    className="text-xs font-bold text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-indigo-100 transition-all flex items-center gap-2"
                                                    title="Modifier Nom/Classe"
                                                >
                                                    <Edit size={14}/>
                                                </button>
                                            )}
                                            
                                            <button 
                                                onClick={() => setSelectedStudentForHistory(student)}
                                                className="text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-transparent hover:border-slate-200 transition-all flex items-center gap-2"
                                                title="Voir l'historique"
                                            >
                                                <FileClock size={14}/>
                                            </button>
                                            
                                            {isLinked && !readOnly && (
                                                <button 
                                                    onClick={() => handleForceOffline(student, agency.id)}
                                                    className="text-xs font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-red-200 transition-all"
                                                    title="Délier / Réinitialiser (Attention)"
                                                >
                                                    <WifiOff size={14}/>
                                                </button>
                                            )}
                                        </div>
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
                    {!readOnly && (
                        <button 
                            onClick={handleResetDatabase}
                            className="mt-4 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                        >
                            Initialiser les données par défaut
                        </button>
                    )}
                </div>
            )}
        </div>

        {/* MODAL HISTORIQUE */}
        <Modal isOpen={!!selectedStudentForHistory} onClose={() => setSelectedStudentForHistory(null)} title="Historique de Carrière">
            <div className="space-y-6">
                {selectedStudentForHistory && (
                    <>
                        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <img src={selectedStudentForHistory.avatarUrl} className="w-16 h-16 rounded-xl bg-slate-200"/>
                            <div>
                                <h4 className="font-bold text-slate-900 text-lg">{selectedStudentForHistory.name}</h4>
                                <p className="text-sm text-slate-500">
                                    Actuellement : {filteredStudents.find(fs => fs.student.id === selectedStudentForHistory.id)?.agency.name}
                                </p>
                            </div>
                        </div>

                        {/* TIMELINE */}
                        <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 py-2">
                            {(!selectedStudentForHistory.history || selectedStudentForHistory.history.length === 0) && (
                                <div className="pl-6 text-sm text-slate-400 italic">Aucun mouvement enregistré.</div>
                            )}
                            
                            {[...(selectedStudentForHistory.history || [])].reverse().map((entry, idx) => (
                                <div key={idx} className="relative pl-6">
                                    <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-4 border-white ${
                                        entry.action === 'FIRED' ? 'bg-red-500' : 
                                        entry.action === 'JOINED' ? 'bg-emerald-500' :
                                        entry.action === 'LEFT' ? 'bg-amber-500' : 'bg-slate-400'
                                    }`}></div>
                                    
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs font-bold text-slate-400">{entry.date}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                                entry.action === 'FIRED' ? 'bg-red-100 text-red-700' : 
                                                entry.action === 'JOINED' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>{entry.action === 'JOINED' ? 'Rejoint' : entry.action === 'FIRED' ? 'Licencié' : 'Départ'}</span>
                                        </div>
                                        
                                        <p className="font-bold text-slate-800 text-sm">{entry.agencyName}</p>
                                        
                                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-xs mt-1">
                                            {entry.reason && <p className="text-slate-600 mb-2 italic">"{entry.reason}"</p>}
                                            <div className="flex gap-2">
                                                <span className={`font-bold px-1.5 rounded ${entry.contextVE < 40 ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600'}`}>
                                                    VE: {entry.contextVE}
                                                </span>
                                                <span className={`font-bold px-1.5 rounded ${entry.contextBudget < 0 ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600'}`}>
                                                    Tréso: {entry.contextBudget}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
                <button onClick={() => setSelectedStudentForHistory(null)} className="w-full py-3 bg-slate-100 font-bold text-slate-600 rounded-xl hover:bg-slate-200">Fermer</button>
            </div>
        </Modal>

        {/* MODAL EDITION */}
        {editingStudent && (
            <Modal isOpen={true} onClose={() => setEditingStudent(null)} title="Éditer le profil Étudiant">
                <div className="space-y-6">
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-sm text-indigo-800">
                        La modification du nom sera répercutée sur le profil Agence et le profil Utilisateur (si lié).
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom de l'étudiant</label>
                        <input 
                            value={editForm.name} 
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Classe</label>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setEditForm({ ...editForm, classId: 'A' })}
                                className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${editForm.classId === 'A' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}
                            >
                                CLASSE A
                            </button>
                            <button 
                                onClick={() => setEditForm({ ...editForm, classId: 'B' })}
                                className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${editForm.classId === 'B' ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-slate-100 text-slate-400'}`}
                            >
                                CLASSE B
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                         <button onClick={() => setEditingStudent(null)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">Annuler</button>
                         <button onClick={handleSaveStudent} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 flex items-center justify-center gap-2">
                            <Save size={18}/> Enregistrer
                         </button>
                    </div>
                </div>
            </Modal>
        )}
    </div>
  );
};
