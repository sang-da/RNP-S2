
import React, { useEffect, useState } from 'react';
import { Loader2, TrendingUp, Wallet, Users, AlertTriangle, Fingerprint, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { signOut, auth, db, doc, onSnapshot, updateDoc } from '../services/firebase';
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
    const { userData } = useAuth();
    const { agencies } = useGame(); // Accès aux données de jeu pour vérifier si l'étudiant est déjà dedans
    const { toast } = useUI();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isChecking, setIsChecking] = useState(false);

    // Auto-reload si le rôle change dans la base
    useEffect(() => {
        if (!userData?.uid) return;
        try {
            const unsub = onSnapshot(doc(db, "users", userData.uid), (doc) => {
                if (doc.exists() && doc.data().role !== 'pending') {
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

    // --- SELF REPAIR FUNCTION ---
    const handleSelfFix = async () => {
        if (!userData?.uid) return;
        setIsChecking(true);

        try {
            // 1. Chercher si l'UID est présent dans une agence
            let foundAgency = null;
            let foundMember = null;

            for (const agency of agencies) {
                const member = agency.members.find(m => m.id === userData.uid);
                if (member) {
                    foundAgency = agency;
                    foundMember = member;
                    break;
                }
            }

            if (foundAgency && foundMember) {
                // 2. Si trouvé, forcer la mise à jour du profil utilisateur
                await updateDoc(doc(db, "users", userData.uid), {
                    role: 'student',
                    agencyId: foundAgency.id,
                    studentProfileName: foundMember.name,
                    linkedStudentId: userData.uid // Confirmer le lien
                });
                
                toast('success', `Compte retrouvé ! Vous êtes dans "${foundAgency.name}". Redirection...`);
                
                // Petit délai pour l'UX avant reload
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                toast('info', "Votre dossier n'est pas encore validé par l'enseignant. Veuillez patienter.");
            }
        } catch (error) {
            console.error(error);
            toast('error', "Erreur lors de la vérification.");
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
                Votre compte est connecté, mais il n'est pas encore relié à votre profil dans le jeu.
                <br/><br/>
                <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded">Demandez à votre enseignant de valider la liaison.</span>
            </p>

            {/* BOUTON DE DÉPANNAGE (SELF FIX) */}
            <button 
                onClick={handleSelfFix}
                disabled={isChecking}
                className="mb-8 px-6 py-3 bg-white border border-indigo-200 text-indigo-700 font-bold rounded-xl shadow-sm hover:bg-indigo-50 transition-all flex items-center gap-2 text-sm"
            >
                {isChecking ? <Loader2 size={18} className="animate-spin"/> : <RefreshCw size={18}/>}
                Je devrais avoir accès (Vérifier mon statut)
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
                {/* DEBUG UID */}
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono bg-slate-100 px-3 py-1.5 rounded-full select-all cursor-text">
                    <Fingerprint size={12}/> ID: {userData?.uid}
                </div>

                <button 
                    onClick={() => signOut(auth)}
                    className="text-slate-400 hover:text-red-500 font-bold text-sm transition-colors mt-2"
                >
                    Annuler et se déconnecter
                </button>
            </div>
        </div>
    );
};
