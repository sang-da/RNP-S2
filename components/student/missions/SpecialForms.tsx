
import React from 'react';
import { Modal } from '../../Modal';
import { Save, PenTool, Crown } from 'lucide-react';

interface CharterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void;
    form: any;
    setForm: (f: any) => void;
}

export const CharterModal: React.FC<CharterModalProps> = ({ isOpen, onClose, onSubmit, form, setForm }) => (
    <Modal isOpen={isOpen} onClose={onClose} title="Charte de Projet">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-sm text-indigo-800">
                Définissez l'identité de votre projet. Ces informations seront visibles par l'administration et sur votre tableau de bord.
            </div>

            {/* SECTION 1: IDENTITÉ */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 pb-2">1. Identité</h4>
                <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Thème Principal</label>
                    <input 
                    type="text"
                    value={form.theme}
                    onChange={e => setForm({...form, theme: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm"
                    placeholder="Ex: Écologie Urbaine / Cyber-Surveillance..."
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Direction Artistique (Intention)</label>
                    <textarea 
                    value={form.direction}
                    onChange={e => setForm({...form, direction: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm h-20"
                    placeholder="Ex: Minimaliste, néon, textures brutes..."
                    />
                </div>
            </div>

            {/* SECTION 2: PROBLÉMATIQUE */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 pb-2">2. Problématique</h4>
                <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Contexte (Sociétal/Urbain)</label>
                    <textarea 
                    value={form.context}
                    onChange={e => setForm({...form, context: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm h-20"
                    placeholder="Ex: Dans une ville saturée par la publicité..."
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Problème Identifié</label>
                    <textarea 
                    value={form.problem}
                    onChange={e => setForm({...form, problem: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm h-20"
                    placeholder="Quel problème local essayez-vous de résoudre ?"
                    />
                </div>
            </div>

            {/* SECTION 3: CIBLE & LIEU */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 pb-2">3. Ancrage</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 block">Cible (Persona)</label>
                        <input 
                        type="text"
                        value={form.target}
                        onChange={e => setForm({...form, target: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm"
                        placeholder="Qui est votre utilisateur ?"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 block">Lieu</label>
                        <input 
                        type="text"
                        value={form.location}
                        onChange={e => setForm({...form, location: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm"
                        placeholder="Adresse ou Quartier"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Geste Architectural</label>
                    <input 
                    type="text"
                    value={form.gesture}
                    onChange={e => setForm({...form, gesture: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm"
                    placeholder="Ex: Kiosque, Passerelle..."
                    />
                </div>
            </div>

            <div className="pt-2 sticky bottom-0 bg-white pb-2">
                <button 
                onClick={onSubmit}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                    <Save size={18} /> Enregistrer & Soumettre
                </button>
            </div>
        </div>
    </Modal>
);

interface NamingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void;
    form: any;
    setForm: (f: any) => void;
}

export const NamingModal: React.FC<NamingModalProps> = ({ isOpen, onClose, onSubmit, form, setForm }) => (
    <Modal isOpen={isOpen} onClose={onClose} title="Déclaration d'Identité">
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 rounded-2xl text-white shadow-lg">
                <Crown size={32} className="mb-2 text-yellow-300"/>
                <h3 className="text-xl font-bold mb-1">Baptême du Studio</h3>
                <p className="text-sm opacity-90">C'est le moment de choisir votre nom officiel. Ce changement sera visible par tout le monde.</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nom du Studio</label>
                    <input 
                        type="text" 
                        value={form.name}
                        onChange={e => setForm({...form, name: e.target.value})}
                        className="w-full p-4 text-xl font-display font-bold border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none"
                        placeholder="Ex: Studio Kage"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Tagline (Slogan)</label>
                    <input 
                        type="text" 
                        value={form.tagline}
                        onChange={e => setForm({...form, tagline: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-xl italic text-slate-600"
                        placeholder="Ex: Design for the future"
                    />
                </div>
            </div>

            <button 
                onClick={onSubmit}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
                <PenTool size={18}/> Officialiser le Nom
            </button>
        </div>
    </Modal>
);
