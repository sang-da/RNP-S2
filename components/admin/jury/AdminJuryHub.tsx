import React, { useState } from 'react';
import { Agency } from '../../../types';
import { AdminShop } from '../shop/AdminShop';
import { JuryModeConfig } from '../settings/JuryModeConfig';
import { JuryPortfolioConfig } from './JuryPortfolioConfig';
import { JuryFundsConfig } from './JuryFundsConfig';
import { JuryResults } from './JuryResults';
import { Store, Presentation, Settings, Gavel, Landmark, BarChart3 } from 'lucide-react';

interface AdminJuryHubProps {
    agencies: Agency[];
    readOnly?: boolean;
}

export const AdminJuryHub: React.FC<AdminJuryHubProps> = ({ agencies, readOnly }) => {
    const [activeTab, setActiveTab] = useState<'PORTFOLIO' | 'SHOP' | 'FUNDS' | 'RESULTS' | 'SETTINGS'>('RESULTS');

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            <div className="mb-8">
                <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-pink-100 rounded-xl text-pink-600"><Gavel size={32}/></div>
                    Espace d'Administration du Jury
                </h2>
                <p className="text-slate-500 text-sm mt-1">Gérez le portfolio, l'accès, les fonds et consultez les résultats du Grand Jury.</p>
            </div>

            <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                <button 
                    onClick={() => setActiveTab('RESULTS')}
                    className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${activeTab === 'RESULTS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <BarChart3 size={18} /> Bilan & Résultats
                </button>
                <button 
                    onClick={() => setActiveTab('PORTFOLIO')}
                    className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${activeTab === 'PORTFOLIO' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Presentation size={18} /> Portfolio
                </button>
                <button 
                    onClick={() => setActiveTab('FUNDS')}
                    className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${activeTab === 'FUNDS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Landmark size={18} /> Dotations
                </button>
                <button 
                    onClick={() => setActiveTab('SHOP')}
                    className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${activeTab === 'SHOP' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Store size={18} /> Boutique
                </button>
                <button 
                    onClick={() => setActiveTab('SETTINGS')}
                    className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${activeTab === 'SETTINGS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Settings size={18} /> Paramètres
                </button>
            </div>

            <div>
                {activeTab === 'RESULTS' && <JuryResults agencies={agencies} />}
                {activeTab === 'PORTFOLIO' && <JuryPortfolioConfig readOnly={readOnly} />}
                {activeTab === 'SHOP' && <AdminShop agencies={agencies} readOnly={readOnly} hideTitle={true} />}
                {activeTab === 'FUNDS' && <JuryFundsConfig />}
                {activeTab === 'SETTINGS' && (
                    <div className="max-w-3xl">
                        {!readOnly ? <JuryModeConfig /> : <div className="p-4 bg-slate-100 rounded-xl">Action non autorisée en mode lecture seule</div>}
                    </div>
                )}
            </div>
        </div>
    );
};