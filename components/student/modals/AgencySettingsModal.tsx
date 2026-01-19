
import React from 'react';
import { Modal } from '../../Modal';
import { BrandColor, Agency } from '../../../types';
import { Upload, Landmark, ImageIcon } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL, storage } from '../../../services/firebase';
import { useUI } from '../../../contexts/UIContext';

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

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

export const AgencySettingsModal: React.FC<AgencySettingsModalProps> = ({ isOpen, onClose, agency, onUpdateAgency }) => {
    const { toast } = useUI();
    const brandColor = agency.branding?.color || 'indigo';

    const handleColorChange = (color: BrandColor) => {
        onUpdateAgency({ ...agency, branding: { ...agency.branding, color } });
    };
  
    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > MAX_IMAGE_SIZE) {
                toast('error', `Image trop lourde (${(file.size/1024/1024).toFixed(1)} Mo). Max 2 Mo.`);
                return;
            }
            try {
                const storageRef = ref(storage, `banners/${agency.id}_${Date.now()}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                onUpdateAgency({ ...agency, branding: { ...agency.branding, bannerUrl: url } });
                toast('success', 'Bannière mise à jour');
            } catch (error) { toast('error', "Erreur d'upload"); }
        }
    };
  
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.size > MAX_IMAGE_SIZE) {
              toast('error', `Image trop lourde (${(file.size/1024/1024).toFixed(1)} Mo). Max 2 Mo.`);
              return;
          }
          try {
              const storageRef = ref(storage, `logos/${agency.id}_${Date.now()}`);
              await uploadBytes(storageRef, file);
              const url = await getDownloadURL(storageRef);
              onUpdateAgency({ ...agency, logoUrl: url });
              toast('success', 'Logo mis à jour');
          } catch (error) { toast('error', "Erreur d'upload du logo"); }
      }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Identité Visuelle du Studio">
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Logo de l'Agence (Carré)</label>
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                            {agency.logoUrl ? <img src={agency.logoUrl} className="w-full h-full object-contain" /> : <Landmark className="text-slate-300" size={32}/>}
                        </div>
                        <label className="flex-1 flex flex-col items-center justify-center h-20 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="flex flex-col items-center justify-center">
                                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Changer le Logo</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
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
                    <label className="block text-sm font-bold text-slate-700 mb-2">Bannière (Cover)</label>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                            <p className="text-sm text-slate-500">Cliquez pour changer la bannière</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} />
                    </label>
                </div>
            </div>
        </Modal>
    );
};
