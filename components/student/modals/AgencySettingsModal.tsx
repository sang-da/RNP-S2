
import React, { useState } from 'react';
import { Modal } from '../../Modal';
import { BrandColor, Agency } from '../../../types';
import { Upload, Landmark, ImageIcon } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL, storage } from '../../../services/firebase';
import { useUI } from '../../../contexts/UIContext';
import { ImageCropper } from '../../ImageCropper';

interface AgencySettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    agency: Agency;
    onUpdateAgency: (a: Agency) => void;
}

const COLOR_THEMES: Record<BrandColor, { bg: string, text: string }> = {
    indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600' },
    emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600' },
    rose: { bg: 'bg-rose-600', text: 'text-rose-600' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-500' },
    cyan: { bg: 'bg-cyan-500', text: 'text-cyan-500' },
    slate: { bg: 'bg-slate-600', text: 'text-slate-600' },
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // Augmenté à 5Mo pour permettre le crop

export const AgencySettingsModal: React.FC<AgencySettingsModalProps> = ({ isOpen, onClose, agency, onUpdateAgency }) => {
    const { toast } = useUI();
    const brandColor = agency.branding?.color || 'indigo';

    // CROPPER STATE
    const [cropImage, setCropImage] = useState<string | null>(null);
    const [cropType, setCropType] = useState<'LOGO' | 'BANNER' | null>(null);

    const handleColorChange = (color: BrandColor) => {
        onUpdateAgency({ ...agency, branding: { ...agency.branding, color } });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'LOGO' | 'BANNER') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > MAX_IMAGE_SIZE) {
                toast('error', `Image trop lourde (${(file.size/1024/1024).toFixed(1)} Mo). Max 5 Mo.`);
                return;
            }
            // Create Local URL for Cropper
            const url = URL.createObjectURL(file);
            setCropImage(url);
            setCropType(type);
            // Reset input value to allow re-selecting same file if needed
            e.target.value = '';
        }
    };

    const handleCropComplete = async (blob: Blob) => {
        if (!cropType) return;
        
        const path = cropType === 'LOGO' 
            ? `logos/${agency.id}_${Date.now()}.jpg` 
            : `banners/${agency.id}_${Date.now()}.jpg`;

        try {
            toast('info', 'Upload et optimisation en cours...');
            const storageRef = ref(storage, path);
            await uploadBytes(storageRef, blob);
            const url = await getDownloadURL(storageRef);
            
            if (cropType === 'LOGO') {
                onUpdateAgency({ ...agency, logoUrl: url });
            } else {
                onUpdateAgency({ ...agency, branding: { ...agency.branding, bannerUrl: url } });
            }
            
            toast('success', 'Image mise à jour avec succès !');
            setCropImage(null);
            setCropType(null);
        } catch (error) {
            console.error(error);
            toast('error', "Erreur lors de l'upload.");
        }
    };

    // Si on est en mode CROP, on affiche une modale par dessus ou on remplace le contenu
    if (cropImage && cropType) {
        return (
            <Modal isOpen={true} onClose={() => { setCropImage(null); setCropType(null); }} title={cropType === 'LOGO' ? "Ajuster le Logo" : "Ajuster la Bannière"}>
                <div className="h-[400px]">
                    <ImageCropper 
                        imageSrc={cropImage} 
                        aspectRatio={cropType === 'LOGO' ? 1 : 16/5} 
                        onCropComplete={handleCropComplete}
                        onCancel={() => { setCropImage(null); setCropType(null); }}
                    />
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Identité Visuelle du Studio">
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Logo de l'Agence (Format Carré)</label>
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                            {agency.logoUrl ? <img src={agency.logoUrl} className="w-full h-full object-contain" /> : <Landmark className="text-slate-300" size={32}/>}
                        </div>
                        <label className="flex-1 flex flex-col items-center justify-center h-20 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors hover:border-indigo-400">
                            <div className="flex flex-col items-center justify-center">
                                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Importer & Recadrer</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'LOGO')} />
                        </label>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Couleur de Marque</label>
                    <div className="flex gap-3">
                        {(['indigo', 'emerald', 'rose', 'amber', 'cyan'] as BrandColor[]).map(c => (
                            <button key={c} onClick={() => handleColorChange(c)} className={`w-10 h-10 rounded-full border-2 ${COLOR_THEMES[c].bg} ${brandColor === c ? 'ring-4 ring-offset-2 ring-slate-200 border-white' : 'border-transparent opacity-60 hover:opacity-100'}`} />
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Bannière (Format Panoramique)</label>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors hover:border-indigo-400 overflow-hidden relative">
                        {agency.branding?.bannerUrl && (
                            <img src={agency.branding.bannerUrl} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                        )}
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 relative z-10">
                            <ImageIcon className="w-8 h-8 text-slate-600 mb-2 drop-shadow-md" />
                            <p className="text-sm text-slate-800 font-bold bg-white/80 px-2 rounded">Cliquez pour changer la bannière</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'BANNER')} />
                    </label>
                </div>
            </div>
        </Modal>
    );
};
