
import React, { useState } from 'react';
import { Agency, BrandColor, Student } from '../types';
import { Target, Users, History, Wallet, TrendingUp, HelpCircle, Briefcase, Settings, Image as ImageIcon, Shield, Eye, Crown, BookOpen, Send, Repeat } from 'lucide-react';
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
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';

interface StudentViewProps {
  agency: Agency;
  allAgencies: Agency[];
  onUpdateAgency: (agency: Agency) => void;
}

type TabType = 'MARKET' | 'MISSIONS' | 'TEAM' | 'RECRUITMENT' | 'HISTORY' | 'RESOURCES';

const COLOR_THEMES: Record<BrandColor, { bg: string, text: string }> = {
    indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600' },
    emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600' },
    rose: { bg: 'bg-rose-600', text: 'text-rose-600' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-500' },
    cyan: { bg: 'bg-cyan-500', text: 'text-cyan-500' },
    slate: { bg: 'bg-slate-600', text: 'text-slate-600' },
};

export const StudentAgencyView: React.FC<StudentViewProps> = ({ agency, allAgencies, onUpdateAgency }) => {
  const { toast } = useUI();
  const { currentUser } = useAuth();
  const { transferFunds, tradeScoreForCash } = useGame();
  
  const [activeTab, setActiveTab] = useState<TabType>('MARKET');
  const [showVERules, setShowVERules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWallet, setShowWallet] = useState(false);

  const brandColor = agency.branding?.color || 'indigo';
  const theme = COLOR_THEMES[brandColor];
  const leaderboard = [...allAgencies].filter(a => a.id !== 'unassigned').sort((a, b) => b.ve_current - a.ve_current);
  const myRank = leaderboard.findIndex(a => a.id === agency.id) + 1;
  const rawSalary = agency.members.reduce((acc, member) => acc + (member.individualScore * GAME_RULES.SALARY_MULTIPLIER), 0);
  const weeklyCharges = rawSalary * (1 + (agency.weeklyTax || 0)) + GAME_RULES.AGENCY_RENT;
  const veRevenue = agency.ve_current * GAME_RULES.REVENUE_VE_MULTIPLIER;
  const weeklyRevenue = GAME_RULES.REVENUE_BASE + veRevenue + (agency.weeklyRevenueModifier || 0);
  const netWeekly = weeklyRevenue - weeklyCharges;
  const myMemberProfile = agency.members.find(m => m.id === currentUser?.uid);

  const handleColorChange = (color: BrandColor) => {
      onUpdateAgency({ ...agency, branding: { ...agency.branding, color } });
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          try {
              const storageRef = ref(storage, `banners/${agency.id}_${Date.now()}`);
              await uploadBytes(storageRef, e.target.files[0]);
              const url = await getDownloadURL(storageRef);
              onUpdateAgency({ ...agency, branding: { ...agency.branding, bannerUrl: url } });
              toast('success', 'Bannière mise à jour');
          } catch (error) { toast('error', "Erreur d'upload"); }
      }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] font-sans">
        {/* HEADER */}
        <div className="relative mb-8 rounded-b-3xl md:rounded-3xl overflow-hidden bg-slate-100 min-h-[200px] md:min-h-[240px] shadow-md group">
            {agency.branding?.bannerUrl ? (
                <img src={agency.branding.bannerUrl} className="absolute inset-0 w-full h-full object-cover" alt="Banner" />
            ) : (
                <div className={`absolute inset-0 opacity-10 ${theme.bg}`} style={{backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
            {agency.id !== 'unassigned' && (
                <button onClick={() => setShowSettings(true)} className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/50 transition-all opacity-0 group-hover:opacity-100 border border-white/10">
                    <Settings size={20}/>
                </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col xl:flex-row justify-between items-end xl:items-end gap-6 text-white">
                <div className="w-full xl:w-auto">
                    <div className="flex items-center gap-3 mb-1">
                        {agency.id !== 'unassigned' && <span className="bg-white/20 backdrop-blur border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Rang #{myRank}</span>}
                        <span className="text-slate-300 italic text-sm truncate">"{agency.tagline}"</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight drop-shadow-lg leading-none mb-3">{agency.name}</h2>
                    {/* Badges */}
                    <div className="flex items-center gap-1">
                        {BADGE_DEFINITIONS.map(def => {
                            if(Math.random() > 0.8) return <div key={def.id} className="w-6 h-6 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center shadow-lg border border-yellow-200"><Shield size={12}/></div>;
                            return null;
                        })}
                    </div>
                </div>

                {agency.id !== 'unassigned' && (
                <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    {/* Personal Wallet Button */}
                    {myMemberProfile && (
                        <div onClick={() => setShowWallet(true)} className="flex-1 md:text-right md:border-r border-white/20 md:pr-4 cursor-pointer group hover:bg-white/10 rounded-lg p-1 transition-colors">
                            <span className="text-[10px] font-bold text-yellow-300 uppercase tracking-widest block mb-1 group-hover:underline flex items-center gap-1 md:justify-end">
                                <Wallet size={12}/> Banque Perso
                            </span>
                            <div className="text-lg font-bold text-white flex items-center md:justify-end gap-2">
                                <span className="text-yellow-400 font-mono">{myMemberProfile.wallet || 0} PiXi</span>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center justify-between md:justify-start gap-6 pl-2">
                        <div className="text-center">
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block mb-1">Flux Net</span>
                            <div className={`text-xl font-bold ${netWeekly >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{netWeekly > 0 ? '+' : ''}{netWeekly.toFixed(0)}</div>
                        </div>
                        <div className="text-center cursor-pointer group" onClick={() => setShowVERules(true)}>
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block mb-1 flex items-center gap-1 justify-center">VE <HelpCircle size={10}/></span>
                            <div className={`text-3xl font-display font-bold leading-none ${agency.ve_current >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>{agency.ve_current}</div>
                        </div>
                    </div>
                </div>
                )}
            </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 mb-24 md:mb-8">
            {activeTab === 'MARKET' && agency.id !== 'unassigned' && <MarketOverview agency={agency} allAgencies={allAgencies} />}
            {activeTab === 'MISSIONS' && agency.id !== 'unassigned' && <MissionsView agency={agency} onUpdateAgency={onUpdateAgency} />}
            {activeTab === 'TEAM' && agency.id !== 'unassigned' && <TeamView agency={agency} onUpdateAgency={onUpdateAgency} />}
            {(activeTab === 'RECRUITMENT' || agency.id === 'unassigned') && <MercatoView agency={agency} allAgencies={allAgencies} onUpdateAgency={onUpdateAgency} onUpdateAgencies={() => {}} />}
            {activeTab === 'RESOURCES' && <WikiView agency={agency} />}
            {activeTab === 'HISTORY' && <HistoryView agency={agency} />}
        </div>

        {/* FOOTER NAV */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-2 z-50 md:relative md:bg-transparent md:border-t-0 md:p-0 md:mt-auto safe-area-bottom">
             <div className="max-w-7xl mx-auto flex md:justify-start gap-2 md:gap-4 overflow-x-auto no-scrollbar snap-x justify-between">
                {agency.id !== 'unassigned' && (
                    <>
                        <NavButton active={activeTab === 'MARKET'} onClick={() => setActiveTab('MARKET')} icon={<TrendingUp size={20} />} label="Marché" theme={theme} />
                        <NavButton active={activeTab === 'MISSIONS'} onClick={() => setActiveTab('MISSIONS')} icon={<Target size={20} />} label="Missions" theme={theme} />
                        <NavButton active={activeTab === 'TEAM'} onClick={() => setActiveTab('TEAM')} icon={<Users size={20} />} label="Équipe" theme={theme} />
                    </>
                )}
                <NavButton active={activeTab === 'RESOURCES'} onClick={() => setActiveTab('RESOURCES')} icon={<BookOpen size={20} />} label="Wiki" theme={theme} />
                <NavButton active={activeTab === 'RECRUITMENT' || agency.id === 'unassigned'} onClick={() => setActiveTab('RECRUITMENT')} icon={<Briefcase size={20} />} label={agency.id === 'unassigned' ? "Mon Statut" : "Recrutement"} theme={theme} />
                <NavButton active={activeTab === 'HISTORY'} onClick={() => setActiveTab('HISTORY')} icon={<History size={20} />} label="Journal" theme={theme} />
             </div>
        </div>

        {/* WALLET MODAL */}
        {myMemberProfile && (
            <WalletModal 
                isOpen={showWallet} 
                onClose={() => setShowWallet(false)} 
                student={myMemberProfile} 
                allStudents={allAgencies.flatMap(a => a.members)}
                onTransfer={transferFunds}
                onTradeScore={tradeScoreForCash}
            />
        )}

        {/* SETTINGS & HELP MODALS */}
        <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Personnalisation Agence">
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Couleur de Marque</label>
                    <div className="flex gap-3">
                        {(['indigo', 'emerald', 'rose', 'amber', 'cyan'] as BrandColor[]).map(c => (
                            <button key={c} onClick={() => handleColorChange(c)} className={`w-10 h-10 rounded-full border-2 ${COLOR_THEMES[c].bg} ${brandColor === c ? 'ring-4 ring-offset-2 ring-slate-200 border-white' : 'border-transparent opacity-60 hover:opacity-100'}`} />
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
                    <p className="text-sm text-slate-600 leading-relaxed mb-2">VE = Revenus. Chaque point rapporte {GAME_RULES.REVENUE_VE_MULTIPLIER} PiXi/sem.</p>
                    <div className="flex gap-2 text-xs font-bold uppercase"><span className="bg-white px-2 py-1 rounded border">VE : {agency.ve_current}</span></div>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {agency.eventLog.filter(e => e.deltaVE).map(e => (
                        <div key={e.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"><span className="text-slate-600 text-sm">{e.label}</span><span className={`font-mono font-bold ${(e.deltaVE || 0) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{(e.deltaVE || 0) > 0 ? '+' : ''}{e.deltaVE}</span></div>
                    ))}
                </div>
            </div>
        </Modal>
    </div>
  );
};

// --- WALLET COMPONENT ---
const WalletModal: React.FC<{isOpen: boolean, onClose: () => void, student: Student, allStudents: Student[], onTransfer: any, onTradeScore: any}> = ({isOpen, onClose, student, allStudents, onTransfer, onTradeScore}) => {
    const [mode, setMode] = useState<'TRANSFER' | 'TRADE'>('TRANSFER');
    const [targetId, setTargetId] = useState('');
    const [amount, setAmount] = useState(0);
    const [scoreToSell, setScoreToSell] = useState(0);

    const handleTransfer = async () => {
        if(!targetId || amount <= 0) return;
        await onTransfer(student.id, targetId, amount);
        onClose();
    };

    const handleTrade = async () => {
        if(scoreToSell <= 0) return;
        await onTradeScore(student.id, scoreToSell);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Banque & Investissement">
            <div className="space-y-6">
                <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-lg flex justify-between items-center">
                    <div>
                        <p className="text-indigo-300 text-xs font-bold uppercase">Solde Actuel</p>
                        <p className="text-3xl font-display font-bold">{student?.wallet || 0} PiXi</p>
                    </div>
                    <Wallet size={32} className="text-indigo-400"/>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setMode('TRANSFER')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'TRANSFER' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>Virement</button>
                    <button onClick={() => setMode('TRADE')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'TRADE' ? 'bg-white shadow text-amber-600' : 'text-slate-400'}`}>Vendre Score</button>
                </div>

                {mode === 'TRANSFER' ? (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500">Envoyez des fonds à un autre étudiant (soutien de projet).</p>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400">Bénéficiaire</label>
                            <select className="w-full p-3 rounded-xl border bg-white" onChange={e => setTargetId(e.target.value)} value={targetId}>
                                <option value="">-- Choisir --</option>
                                {allStudents.filter(s => s.id !== student.id).map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400">Montant</label>
                            <input type="number" className="w-full p-3 rounded-xl border" placeholder="0" onChange={e => setAmount(Number(e.target.value))} />
                        </div>
                        <button onClick={handleTransfer} disabled={amount > (student.wallet || 0)} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-50">
                            <Send size={16} className="inline mr-2"/> Envoyer
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-800 text-sm">
                            <strong className="block mb-1 flex items-center gap-2"><TrendingUp size={16}/> Sacrifice Stratégique</strong>
                            Échangez vos points de note contre du capital.
                            <br/>Taux : <strong>1 Point Score = 50 PiXi</strong>.
                            <br/><span className="text-xs opacity-75">Attention : Cela réduira votre salaire futur.</span>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400">Points à vendre</label>
                            <input type="number" className="w-full p-3 rounded-xl border" placeholder="0" onChange={e => setScoreToSell(Number(e.target.value))} />
                        </div>
                        <div className="text-center py-2">
                            <span className="text-2xl font-bold text-emerald-600">+{scoreToSell * 50} PiXi</span>
                        </div>
                        <button onClick={handleTrade} disabled={scoreToSell > student.individualScore} className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl disabled:opacity-50">
                            <Repeat size={16} className="inline mr-2"/> Confirmer l'échange
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

const NavButton: React.FC<any> = ({ active, onClick, icon, label, theme }) => (
    <button onClick={onClick} className={`snap-start flex flex-col md:flex-row items-center md:gap-3 p-2 md:p-4 rounded-xl transition-all min-w-[70px] md:min-w-[150px] justify-center md:justify-start ${active ? `${theme.bg} text-white transform scale-105 shadow-md` : 'hover:bg-slate-50 text-slate-400 hover:text-slate-600'}`}>
        <div className={`p-1.5 rounded-full ${active ? 'bg-white/20' : ''}`}>{React.cloneElement(icon, { className: active ? 'text-white' : '' })}</div>
        <span className={`text-[10px] md:text-base font-bold`}>{label}</span>
    </button>
);
