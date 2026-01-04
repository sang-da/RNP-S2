
import React, { useEffect, useState } from 'react';
import { Loader2, TrendingUp, Wallet, Users, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { signOut, auth, db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

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
    const [currentSlide, setCurrentSlide] = useState(0);

    // Auto-reload si le rôle change
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

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500"></div>
            
            <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-8 relative animate-bounce-slow">
                 <div className="absolute inset-0 bg-indigo-50 rounded-2xl animate-ping opacity-20"></div>
                 <Loader2 size={32} className="text-indigo-600 animate-spin" />
            </div>
            
            <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">
                Bienvenue, {userData?.displayName?.split(' ')[0]}
            </h1>
            <p className="text-slate-500 mb-10">
                Votre dossier est en cours de validation par l'administration.
            </p>

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

            <div className="mt-12 flex flex-col gap-4">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-widest animate-pulse">
                    En attente de connexion...
                </p>
                <button 
                    onClick={() => signOut(auth)}
                    className="text-slate-400 hover:text-red-500 font-bold text-sm transition-colors"
                >
                    Annuler et se déconnecter
                </button>
            </div>
        </div>
    );
};
