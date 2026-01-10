
import React, { useEffect, useState } from 'react';
import { Loader2, TrendingUp, Wallet, Users, AlertTriangle, Fingerprint, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { signOut, auth, db, doc, onSnapshot, updateDoc, writeBatch, collection, getDocs } from '../services/firebase';
import { MASCOTS } from '../constants';
import { useUI } from '../contexts/UIContext';

const ONBOARDING_SLIDES = [
    {
        icon: <TrendingUp size={48} className="text-emerald-500" />,
        title: "La VE est Reine",
        text: "Votre Valeur d'Entreprise (VE) détermine votre note finale (40%). Elle fluctue selon la qualité de vos rendus et vos décisions."
    },
    {
        icon: <Wallet size={48} className="text-amber-500" />,
        title: "Gérez votre Cash",
        text: "Chaque étudiant coûte un salaire. Gérez votre trésorerie (PiXi) pour éviter la faillite et le malus de VE."
    },
    {
        icon: <Users size={48} className="text-indigo-500" />,
        title: "L'Agence avant tout",
        text: "La performance collective prime. Un bon élément dans une agence qui coule ne suffira pas à valider le semestre."
    },
    {
        icon: <AlertTriangle size={48} className="text-red-500" />,
        title: "Gérez les Crises",
        text: "Le marché est instable. Attendez-vous à des imprévus (Inflation, Pénuries) et réagissez vite."
    }
];

export const WaitingScreen: React.FC = () => {
    const { userData, refreshProfile } = useAuth();
    const { agencies } = useGame();
    const { toast } = useUI();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isChecking, setIsChecking] = useState(false);

    // Auto-reload si le rôle change dans la base
    useEffect(() => {
        if (!userData?.uid) return;
        try {
            const unsub = onSnapshot(doc(db, "users", userData.uid), (doc) => {
                if (doc.exists() && doc.data().role !== 'pending') {
                    // Force refresh context and reload
                    window.location.reload(); 
                }
            });
            return () => unsub();
        } catch (e) { console.error(e); }
    }, [userData]);

    // Carousel Timer
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % ONBOARDING_SLIDES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    // --- SELF REPAIR FUNCTION (Updated to be more robust) ---
    const handleSelfFix = async () => {
        if (!userData?.uid || !userData.displayName) return;
        setIsChecking(true);

        try {
            // Force refresh from AuthContext logic which now has powerful Auto-Heal
            await refreshProfile();
            
            // Re-check locally if it worked
            const userDoc = await onSnapshot(doc(db, "users", userData.uid), (snap) => {
                 if (snap.exists() && snap.data().role === 'student') {
                     toast('success', "Compte réparé ! Redirection...");
                     setTimeout(() => window.location.reload(), 1000);
                 } else {
                     // Fallback: Manual deep scan if Context scan failed (Redundancy)
                     manualDeepScan();
                 }
            });

        } catch (error) {
            console.error(error);
            toast('error', "Erreur lors de la vérification.");
            setIsChecking(false);
        }
    };

    const manualDeepScan = async () => {
        if (!userData?.uid) return;
        
        try {
            const agenciesSnap = await getDocs(collection(db, 'agencies'));
            const googleNameNorm = userData.displayName?.toLowerCase().trim() || "";
            
            let found = false;

            for (const d of agenciesSnap.docs) {
                const agency = d.data();
                if (agency.id === 'unassigned') continue;

                // Match Name Fuzzy
                const member = agency.members.find((m: any) => {
                    const mName = m.name.toLowerCase().trim();
                    return googleNameNorm.includes(mName) || mName.includes(googleNameNorm);
                });

                if (member) {
                    found = true;
                    // FORCE FIX
                    const batch = writeBatch(db);
                    
                    // Update User
                    batch.update(doc(db, "users", userData.uid), {
                        role: 'student',
                        agencyId: agency.id,
                        studentProfileName: member.name,
                        linkedStudentId: member.id,
                        fixedBy: 'manual_button'
                    });

                    // Update Agency (Swap ID)
                    if (member.id !== userData.uid) {
                        const newMembers = agency.members.map((m: any) => 
                            m.id === member.id ? { ...m, id: userData.uid, avatarUrl: userData.photoURL } : m
                        );
                        batch.update(doc(db, "agencies", agency.id), { members: newMembers });
                    }

                    await batch.commit();
                    toast('success', `Profil "${member.name}" retrouvé dans ${agency.name}. Connexion...`);
                    setTimeout(() => window.location.reload(), 1500);
                    break;
                }
            }

            if (!found) {
                toast('warning', "Aucun profil trouvé à votre nom dans les agences. Contactez l'enseignant.");
            }

        } catch (e) {
            console.error(e);
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500"></div>
            
            {/* MASCOTTE WAITING (Cloud) */}
            <div className="mb-8 relative animate-bounce-slow">
                 <img src={MASCOTS.LANDING_HERO} className="w-48 drop-shadow-2xl" alt="En attente..." />
                 {/* Petit loader discret intégré */}
                 <div className="absolute bottom-2 right-10 bg-white p-1.5 rounded-full shadow-sm">
                    <Loader2 size={16} className="text-indigo-600 animate-spin" />
                 </div>
            </div>
            
            <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">
                Bienvenue, {userData?.displayName?.split(' ')[0]}
            </h1>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
                Nous vérifions votre affectation...
                <br/>
                <span className="text-xs text-slate-400">ID: {userData?.uid.slice(0, 8)}...</span>
            </p>

            {/* BOUTON DE DÉPANNAGE (SELF FIX) */}
            <button 
                onClick={handleSelfFix}
                disabled={isChecking}
                className={`mb-8 px-6 py-4 border-2 rounded-2xl font-bold shadow-sm flex items-center gap-3 text-sm transition-all ${
                    isChecking 
                    ? 'bg-slate-100 border-slate-200 text-slate-400' 
                    : 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 hover:shadow-md'
                }`}
            >
                {isChecking ? <Loader2 size={20} className="animate-spin"/> : <RefreshCw size={20}/>}
                <div>
                    <span className="block text-left">Je suis déjà dans une agence</span>
                    <span className="block text-left text-[10px] opacity-70 font-normal">Forcer la détection par Nom & Prénom</span>
                </div>
            </button>

            {/* Carousel Card */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-md w-full text-center relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="h-48 flex flex-col items-center justify-center transition-all duration-500">
                    <div className="mb-6 p-4 bg-slate-50 rounded-full group-hover:scale-110 transition-transform duration-500">
                        {ONBOARDING_SLIDES[currentSlide].icon}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                        {ONBOARDING_SLIDES[currentSlide].title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                        {ONBOARDING_SLIDES[currentSlide].text}
                    </p>
                </div>

                {/* Progress Indicators */}
                <div className="flex justify-center gap-2 mt-8">
                    {ONBOARDING_SLIDES.map((_, idx) => (
                        <div 
                            key={idx} 
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                idx === currentSlide ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-200'
                            }`}
                        />
                    ))}
                </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 items-center">
                <button 
                    onClick={() => signOut(auth)}
                    className="text-slate-400 hover:text-red-500 font-bold text-sm transition-colors mt-2"
                >
                    Me déconnecter et réessayer
                </button>
            </div>
        </div>
    );
};
