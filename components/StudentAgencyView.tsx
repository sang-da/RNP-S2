
import React, { useState } from 'react';
import { Agency, BrandColor } from '../types';
import { Target, Users, History, Wallet, TrendingUp, HelpCircle, Briefcase, TrendingDown, Settings, Image as ImageIcon, Shield, Eye, Crown, BookOpen } from 'lucide-react';
import { MarketOverview } from './student/MarketOverview';
import { MissionsView } from './student/MissionsView';
import { TeamView } from './student/TeamView';
import { HistoryView } from './student/HistoryView';
import { MercatoView } from './student/MercatoView';
import { WikiView } from './student/WikiView';
import { Modal } from './Modal';
import { GAME_RULES, BADGE_DEFINITIONS } from '../constants';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
import { useUI } from '../contexts/UIContext';

interface StudentViewProps {
  agency: Agency;
  allAgencies: Agency[];
  onUpdateAgency: (agency: Agency) => void;
}

type TabType = 'MARKET' | 'MISSIONS' | 'TEAM' | 'RECRUITMENT' | 'HISTORY' | 'RESOURCES';

// Color Mapping
const COLOR_THEMES: Record<BrandColor, { bg: string, text: string, border: string, ring: string, badge: string }> = {
    indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-200', ring: 'ring-indigo-100', badge: 'bg-indigo-100 text-indigo-700' },
    emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-200', ring: 'ring-emerald-100', badge: 'bg-emerald-100 text-emerald-700' },
    rose: { bg: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-200', ring: 'ring-rose-100', badge: 'bg-rose-100 text-rose-700' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-200', ring: 'ring-amber-100', badge: 'bg-amber-100 text-amber-700' },
    cyan: { bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-200', ring: 'ring-cyan-100', badge: 'bg-cyan-100 text-cyan-700' },
    slate: { bg: 'bg-slate-600', text: 'text-slate-600', border: 'border-slate-200', ring: 'ring-slate-100', badge: 'bg-slate-100 text-slate-700' },
};

export const StudentAgencyView: React.FC<StudentViewProps> = ({ agency, allAgencies, onUpdateAgency }) => {
  const { toast } = useUI();
  const [activeTab, setActiveTab] = useState<TabType>('MARKET');
  const [showVERules, setShowVERules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Branding Safe Access
  const brandColor = agency.branding?.color || 'indigo';
  const theme = COLOR_THEMES[brandColor];

  // Calcul du rang
  const leaderboard = [...allAgencies].filter(a => a.id !== 'unassigned').sort((a, b) => b.ve_current - a.ve_current);
  const myRank = leaderboard.findIndex(a => a.id === agency.id) + 1;

  // --- HANDLERS ---
  const handleColorChange = (color: BrandColor) => {
      onUpdateAgency({
          ...agency,
          branding: { ...agency.branding, color }
      });
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          try {
              const storageRef = ref(storage, `banners/${agency.id}_${Date.now()}`);
              await uploadBytes(storageRef, file);
              const url = await getDownloadURL(storageRef);
              onUpdateAgency({
                  ...agency,
                  branding: { ...agency.branding, bannerUrl: url }
              });
              toast('success', 'Bannière mise à jour');
          } catch (error) {
              toast('error', "Erreur d'upload");
          }
      }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] font-sans">
        
        {/* 1. BRANDED HEADER & BANNER */}
        <div className="relative mb-8 rounded-b-3xl md:rounded-3xl overflow-hidden bg-slate-100 min-h-[160px] md:min-h-[200px] shadow-sm group">
            {/* Banner Image */}
            {agency.branding?.bannerUrl ? (
                <img src={agency.branding.bannerUrl} className="absolute inset-0 w-full h-full object-cover" alt="Banner" />
            ) : (
                <div className={`absolute inset-0 opacity-10 ${theme.bg}`} style={{backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>

            {/* Customize Button */}
            {agency.id !== 'unassigned' && (
                <button 
                    onClick={() => setShowSettings(true)}
                    className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100"
                >
                    <Settings size={20}/>
                </button>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight shadow-black drop-shadow-md">{agency.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                        {agency.id !== 'unassigned' && <span className="bg-white/20 backdrop-blur text-white px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">Rang #{myRank}</span>}
                        <span className="text-slate-200 italic text-sm">"{agency.tagline}"</span>
                        
                        {/* BADGES DISPLAY */}
                        <div className="flex items-center gap-1 ml-2">
                            {BADGE_DEFINITIONS.map(def => {
                                const isEarned = Math.random() > 0.8; // Mock logic
                                if(!isEarned) return null;
                                return (
                                    <div key={def.id} className="w-6 h-6 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center shadow-lg border border-yellow-200" title={def.label}>
                                        {def.icon === 'shield' && <Shield size={12}/>}
                                        {def.icon === 'eye' && <Eye size={12}/>}
                                        {def.icon === 'crown' && <Crown size={12}/>}
                                        {def.icon === 'users' && <Users size={12}/>}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* KPI Widget */}
                {agency.id !== 'unassigned' && (
                <div className="flex gap-6 items-end text-white">
                    <div className="hidden lg:block text-right pr-6 border-r border-white/20">
                        <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest block">Tréso. Réelle</span>
                        <div className={`text-xl font-bold flex items-center gap-2 justify-end`}>
                             {agency.budget_real.toLocaleString()} PiXi
                        </div>
                    </div>
                    <div className="text-right cursor-pointer" onClick={() => setShowVERules(true)}>
                        <span className="text-xs font-bold opacity-70 uppercase tracking-widest flex justify-end items-center gap-1">
                            Valeur (VE) <HelpCircle size={14}/>
                        </span>
                        <div className={`text-6xl font-display font-bold leading-none ${agency.ve_current >= 60 ? 'text-emerald-400' : agency.ve_current >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                            {agency.ve_current}
                        </div>
                    </div>
                </div>
                )}
            </div>
        </div>

        {/* 2. DYNAMIC CONTENT AREA */}
        <div className="flex-1 mb-24 md:mb-8">
            {activeTab === 'MARKET' && agency.id !== 'unassigned' && <MarketOverview agency={agency} allAgencies={allAgencies} />}
            {activeTab === 'MISSIONS' && agency.id !== 'unassigned' && <MissionsView agency={agency} onUpdateAgency={onUpdateAgency} />}
            {activeTab === 'TEAM' && agency.id !== 'unassigned' && <TeamView agency={agency} onUpdateAgency={onUpdateAgency} />}
            
            {(activeTab === 'RECRUITMENT' || agency.id === 'unassigned') && (
                <MercatoView 
                    agency={agency} 
                    allAgencies={allAgencies} 
                    onUpdateAgency={onUpdateAgency} 
                    onUpdateAgencies={() => {}} 
                />
            )}
            
            {activeTab === 'RESOURCES' && <WikiView agency={agency} />}
            {activeTab === 'HISTORY' && <HistoryView agency={agency} />}
        </div>

        {/* 3. NAVIGATION BAR */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-2 z-50 md:relative md:bg-transparent md:border-t-0 md:p-0 md:mt-auto safe-area-bottom">
             <div className="max-w-7xl mx-auto flex md:justify-start gap-2 md:gap-4 overflow-x-auto no-scrollbar snap-x justify-between">
                
                {agency.id !== 'unassigned' && (
                    <>
                        <NavButton 
                            active={activeTab === 'MARKET'} 
                            onClick={() => setActiveTab('MARKET')}
                            icon={<TrendingUp size={20} />}
                            label="Marché"
                            theme={theme}
                        />

                        <NavButton 
                            active={activeTab === 'MISSIONS'} 
                            onClick={() => setActiveTab('MISSIONS')}
                            icon={<Target size={20} />}
                            label="Missions"
                            theme={theme}
                        />

                        <NavButton 
                            active={activeTab === 'TEAM'} 
                            onClick={() => setActiveTab('TEAM')}
                            icon={<Users size={20} />}
                            label="Équipe"
                            theme={theme}
                        />
                    </>
                )}

                <NavButton 
                    active={activeTab === 'RESOURCES'} 
                    onClick={() => setActiveTab('RESOURCES')}
                    icon={<BookOpen size={20} />}
                    label="Wiki"
                    theme={theme}
                />

                <NavButton 
                    active={activeTab === 'RECRUITMENT' || agency.id === 'unassigned'} 
                    onClick={() => setActiveTab('RECRUITMENT')}
                    icon={<Briefcase size={20} />}
                    label={agency.id === 'unassigned' ? "Mon Statut" : "Recrutement"}
                    theme={theme}
                />

                <NavButton 
                    active={activeTab === 'HISTORY'} 
                    onClick={() => setActiveTab('HISTORY')}
                    icon={<History size={20} />}
                    label="Journal"
                    theme={theme}
                />
             </div>
        </div>

        {/* MODALS (Settings, Audit) */}
        <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Personnalisation Agence">
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Couleur de Marque</label>
                    <div className="flex gap-3">
                        {(['indigo', 'emerald', 'rose', 'amber', 'cyan'] as BrandColor[]).map(c => (
                            <button
                                key={c}
                                onClick={() => handleColorChange(c)}
                                className={`w-10 h-10 rounded-full border-2 ${COLOR_THEMES[c].bg} ${brandColor === c ? 'ring-4 ring-offset-2 ring-slate-200 border-white' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            />
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Bannière (Cover)</label>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                            <p className="text-sm text-slate-500">Cliquez pour changer</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} />
                    </label>
                </div>
            </div>
        </Modal>

        <Modal isOpen={showVERules} onClose={() => setShowVERules(false)} title="Audit de Valeur (VE)">
            <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        La <strong>VE (Valeur d'Entreprise)</strong> reflète la santé et la productivité de votre agence.
                    </p>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {agency.eventLog.filter(e => e.deltaVE).map(event => (
                        <div key={event.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                            <span className="text-slate-600 text-sm">{event.label}</span>
                            <span className={`font-mono font-bold ${(event.deltaVE || 0) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {(event.deltaVE || 0) > 0 ? '+' : ''}{event.deltaVE}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    </div>
  );
};

// Responsive Nav Button
const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; theme: any }> = ({ active, onClick, icon, label, theme }) => (
    <button 
        onClick={onClick}
        className={`snap-start flex flex-col md:flex-row items-center md:gap-3 p-2 md:p-4 rounded-xl transition-all min-w-[70px] md:min-w-[150px] justify-center md:justify-start ${
            active 
            ? `${theme.bg} text-white transform scale-105 shadow-md` 
            : 'hover:bg-slate-50 text-slate-400 hover:text-slate-600'
        }`}
    >
        <div className={`p-1.5 rounded-full ${active ? 'bg-white/20' : ''}`}>
            {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: active ? 'text-white' : '' })}
        </div>
        <span className={`text-[10px] md:text-base font-bold`}>
            {label}
        </span>
    </button>
);
