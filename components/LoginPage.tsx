
import React, { useState } from 'react';
import { auth, signInWithEmailAndPassword, signInWithGoogle, createUserWithEmailAndPassword } from '../services/firebase';
import { useUI } from '../contexts/UIContext';
import { LogIn, UserPlus } from 'lucide-react';

export const LoginPage: React.FC = () => {
    const { toast } = useUI();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password);
                toast('success', 'Compte créé !');
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                toast('success', 'Connexion réussie');
            }
        } catch (error: any) {
            console.error(error);
            toast('error', error.message || 'Erreur de connexion');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        try {
            await signInWithGoogle();
            toast('success', 'Connexion Google réussie');
        } catch (error) {
            toast('error', 'Erreur Google');
        }
    };

    return (
        <div className="w-full">
            <p className="text-center text-sm text-slate-500 mb-6">
                {isSignUp ? "Créez votre profil pour rejoindre une agence." : "Identifiez-vous pour accéder à votre tableau de bord."}
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email RNP</label>
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        required 
                        placeholder="etudiant@gmail.com"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mot de passe</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        required 
                        placeholder="••••••••"
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2"
                >
                    {isSignUp ? <UserPlus size={18}/> : <LogIn size={18}/>}
                    {loading ? 'Chargement...' : isSignUp ? "Créer mon compte" : 'Valider'}
                </button>
            </form>

            <div className="my-6 flex items-center gap-4">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Ou</span>
                <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            <button 
                onClick={handleGoogle}
                className="w-full py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors flex justify-center items-center gap-2"
            >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                Continuer avec Google
            </button>

            <div className="mt-6 text-center">
                <button 
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm font-bold text-indigo-600 hover:underline"
                >
                    {isSignUp ? "J'ai déjà un compte" : "Je n'ai pas de compte"}
                </button>
            </div>
        </div>
    );
};
