
import React, { useState } from 'react';
import { WikiResource } from '../../../types';
import { Plus, Trash2, ExternalLink, FileText, Video, Link, Box, Upload } from 'lucide-react';
import { storage } from '../../../services/firebase';

interface WikiManagerProps {
    resources: WikiResource[];
    onAdd: (res: WikiResource) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    readOnly?: boolean;
}

export const WikiManager: React.FC<WikiManagerProps> = ({ resources, onAdd, onDelete, readOnly }) => {
    const [wikiForm, setWikiForm] = useState<{title: string, url: string, type: 'PDF' | 'VIDEO' | 'LINK' | 'ASSET', targetClass: 'ALL' | 'A' | 'B'}>({
        title: '', url: '', type: 'PDF', targetClass: 'ALL'
    });
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const storageRef = storage.ref(`wiki/${Date.now()}_${file.name}`);
            await storageRef.put(file);
            const url = await storageRef.getDownloadURL();
            setWikiForm(prev => ({ ...prev, url }));
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Erreur lors de l'upload du fichier.");
        } finally {
            setUploading(false);
        }
    };

    const handleAdd = async () => {
        if(!wikiForm.title || !wikiForm.url) return;
        const newRes: WikiResource = {
            id: `wiki-${Date.now()}`,
            title: wikiForm.title,
            url: wikiForm.url,
            type: wikiForm.type,
            targetClass: wikiForm.targetClass,
            date: new Date().toISOString().split('T')[0]
        };
        await onAdd(newRes);
        setWikiForm({ title: '', url: '', type: 'PDF', targetClass: 'ALL' });
    };

    return (
        <div className="space-y-6">
            {/* ADD FORM */}
            {!readOnly && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Plus size={20} className="text-cyan-600"/> Ajouter une ressource</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">Titre</label>
                        <input value={wikiForm.title} onChange={e => setWikiForm({...wikiForm, title: e.target.value})} className="w-full p-2 border rounded-lg text-sm" placeholder="Ex: Cours Lighting"/>
                    </div>
                    <div className="md:col-span-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">URL ou Fichier</label>
                        <div className="flex gap-2">
                            <input value={wikiForm.url} onChange={e => setWikiForm({...wikiForm, url: e.target.value})} className="w-full p-2 border rounded-lg text-sm" placeholder="https://..."/>
                            <label className="cursor-pointer p-2 bg-slate-100 rounded-lg hover:bg-slate-200">
                                <Upload size={18} className="text-slate-600"/>
                                <input type="file" className="hidden" onChange={handleFileChange} />
                            </label>
                        </div>
                        {uploading && <p className="text-[10px] text-cyan-600 mt-1">Upload en cours...</p>}
                    </div>
                    <div className="md:col-span-1 flex gap-2">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Type</label>
                            <select value={wikiForm.type} onChange={e => setWikiForm({...wikiForm, type: e.target.value as any})} className="w-full p-2 border rounded-lg text-sm bg-white">
                                <option value="PDF">PDF</option>
                                <option value="VIDEO">Vidéo</option>
                                <option value="LINK">Lien</option>
                                <option value="ASSET">Asset 3D</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Cible</label>
                            <select value={wikiForm.targetClass} onChange={e => setWikiForm({...wikiForm, targetClass: e.target.value as any})} className="w-full p-2 border rounded-lg text-sm bg-white">
                                <option value="ALL">Tous</option>
                                <option value="A">Classe A</option>
                                <option value="B">Classe B</option>
                            </select>
                        </div>
                    </div>
                    <div className="md:col-span-1">
                        <button onClick={handleAdd} className="w-full py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-cyan-600 transition-colors">Ajouter</button>
                    </div>
                </div>
            </div>
            )}

            {/* LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resources.map(res => (
                    <div key={res.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 relative group hover:border-cyan-300 transition-all">
                        <div className={`p-3 rounded-lg ${
                            res.type === 'PDF' ? 'bg-red-50 text-red-500' :
                            res.type === 'VIDEO' ? 'bg-purple-50 text-purple-500' :
                            res.type === 'ASSET' ? 'bg-amber-50 text-amber-500' :
                            'bg-blue-50 text-blue-500'
                        }`}>
                            {res.type === 'PDF' ? <FileText size={24}/> :
                                res.type === 'VIDEO' ? <Video size={24}/> :
                                res.type === 'ASSET' ? <Box size={24}/> :
                                <Link size={24}/>}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <h4 className="font-bold text-slate-800 text-sm truncate">{res.title}</h4>
                            <div className="flex gap-2 mt-1">
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 rounded">{res.type}</span>
                                <span className={`text-[10px] font-bold px-1.5 rounded text-white ${res.targetClass === 'A' ? 'bg-blue-400' : res.targetClass === 'B' ? 'bg-purple-400' : 'bg-slate-400'}`}>
                                    {res.targetClass === 'ALL' ? 'TOUS' : `CLASSE ${res.targetClass}`}
                                </span>
                            </div>
                        </div>
                        <a href={res.url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-cyan-600"><ExternalLink size={18}/></a>
                        {!readOnly && (
                        <button onClick={() => onDelete(res.id)} className="absolute -top-2 -right-2 bg-red-100 text-red-500 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-500 hover:text-white">
                            <Trash2 size={14}/>
                        </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
