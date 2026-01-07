
import React from 'react';
import { HelpCircle, TrendingUp, Coins, Zap, ShieldAlert, Rocket, Info, Landmark } from 'lucide-react';

export const FAQView: React.FC = () => {
    const sections = [
        {
            title: "C'est quoi les Notes ?",
            icon: <TrendingUp className="text-indigo-500" />,
            content: "Il y a 2 notes : Note de GROUPE (60% VE, 10% Trésorerie, 30% Projet) et Note INDIVIDUELLE (50% Score, 20% Tréso Perso, 30% Projet)."
        },
        {
            title: "Le PiXi, c'est quoi ?",
            icon: <Coins className="text-yellow-500" />,
            content: "Le PiXi est la monnaie officielle du studio. Il sert à payer votre loyer (500/semaine) et vos salaires personnels. Si votre compte est à sec, vos salaires sont gelés et vous risquez la faillite."
        },
        {
            title: "Comment gagne-t-on de l'argent ?",
            icon: <Zap className="text-emerald-500" />,
            content: "Chaque semaine, votre studio facture ses clients. Le gain est calculé ainsi : (VE x 30) + Bonus Prof. Plus votre VE est haute, plus vos revenus hebdomadaires sont importants."
        },
        {
            title: "À quoi sert mon Wallet Perso ?",
            icon: <Landmark className="text-amber-600" />,
            content: "L'argent que vous recevez sur votre compte personnel peut être ré-injecté dans le studio pour éponger une dette, ou utilisé pour acheter des points de Score (Formation) ou des bonus stratégiques (Délais, Infos)."
        },
        {
            title: "Quelles sont les règles vitales ?",
            icon: <ShieldAlert className="text-red-500" />,
            content: "1. FAILLITE TOTALE si l'agence atteint -5000 PiXi. 2. VE à 0 = Crise majeure mais pas de fermeture immédiate. 3. Sous 40 VE, votre studio est 'Vulnérable' et peut être racheté."
        },
        {
            title: "L'Objectif Final ?",
            icon: <Rocket className="text-purple-500" />,
            content: "Le but est d'arriver au Jury Final avec la plus grosse Levée de Fonds possible et une VE maximum. Votre note finale dépend de votre capacité à générer de la valeur (VE + Cash)."
        }
    ];

    return (
        <div className="animate-in slide-in-from-right-4 duration-500 pb-20 max-w-4xl mx-auto">
            <div className="mb-8 text-center">
                <div className="inline-flex p-3 bg-indigo-100 rounded-2xl text-indigo-600 mb-4">
                    <HelpCircle size={32} />
                </div>
                <h2 className="text-3xl font-display font-bold text-slate-900">Guide de Survie du Studio</h2>
                <p className="text-slate-500 mt-2">Comprendre l'économie et les mécaniques du semestre.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sections.map((item, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">
                                {item.icon}
                            </div>
                            <h3 className="font-bold text-slate-900">{item.title}</h3>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            {item.content}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-12 bg-slate-900 text-white p-8 rounded-[40px] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Info size={120} />
                </div>
                <div className="relative z-10">
                    <h4 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Info className="text-indigo-400" /> Note de l'administration
                    </h4>
                    <p className="text-slate-300 text-sm leading-relaxed max-w-2xl">
                        Ce simulateur est une aide pédagogique. En cas de litige ou de bug, la décision de l'enseignant prévaut. L'économie est ajustée chaque semaine pour garantir l'équité entre les petites et grandes équipes.
                    </p>
                </div>
            </div>
        </div>
    );
};
