import React, { useState } from 'react';
import { Agency } from '../../../types';
import { AdminShop } from '../shop/AdminShop';
import { JuryModeConfig } from '../settings/JuryModeConfig';
import { JuryPortfolioConfig } from './JuryPortfolioConfig';
import { Store, Presentation, Settings, Gavel } from 'lucide-react';

interface AdminJuryHubProps {
    agencies: Agency[];
    readOnly?: boolean;
}

export const AdminJuryHub: React.FC<AdminJuryHubProps> = ({ agencies, readOnly }) => {
    const [activeTab, setActiveTab] = useState<'PORTFOLIO' | 'SHOP' | 'SETTINGS'>('PORTFOLIO');

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            <div className="mb-8">
                <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-pink-100 rounded-xl text-pink-600"><Gavel size={32}/></div>
                    Espace d'Administration du Jury
                </h2>
                <p className="text-slate-500 text-sm mt-1">Gérez le portfolio, l'accès, le verrouillage et la boutique pour le Grand Jury.</p>
            </div>

            <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                <button 
                    onClick={() => setActiveTab('PORTFOLIO')}
                    className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${activeTab === 'PORTFOLIO' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Presentation size={18} /> Configuration du Portfolio
                </button>
                <button 
                    onClick={() => setActiveTab('SHOP')}
                    className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${activeTab === 'SHOP' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Store size={18} /> Boutique & Avantages
                </button>
                <button 
                    onClick={() => setActiveTab('SETTINGS')}
                    className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${activeTab === 'SETTINGS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Settings size={18} /> Date butoir & Verrouillage
                </button>
            </div>

            <div>
                {activeTab === 'PORTFOLIO' && <JuryPortfolioConfig readOnly={readOnly} />}
                {activeTab === 'SHOP' && <AdminShop agencies={agencies} readOnly={readOnly} hideTitle={true} />}
                {activeTab === 'SETTINGS' && (
                    <div className="max-w-3xl">
                        {!readOnly ? <JuryModeConfig /> : <div className="p-4 bg-slate-100 rounded-xl">Action non autorisée en mode lecture seule</div>}
                    </div>
                )}
            </div>
        </div>
    );
};