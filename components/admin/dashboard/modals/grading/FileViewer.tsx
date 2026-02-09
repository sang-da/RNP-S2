
import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize, ExternalLink, FileText, AlertCircle, RefreshCw } from 'lucide-react';

interface FileViewerProps {
    url?: string;
    type?: string; // 'FILE', 'LINK', 'SPECIAL_LOGO', etc.
    name: string;
}

export const FileViewer: React.FC<FileViewerProps> = ({ url, type, name }) => {
    const [zoom, setZoom] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    // Reset zoom & state when url changes
    useEffect(() => {
        setZoom(1);
        setIsLoading(true);
        setError(false);
    }, [url]);

    if (!url) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <FileText size={64} className="opacity-20 mb-4"/>
                <p className="font-medium">Aucun fichier à prévisualiser</p>
            </div>
        );
    }

    const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('.webm');
    const isPdf = url.includes('.pdf');
    const isImage = !isVideo && !isPdf && (url.includes('.jpg') || url.includes('.png') || url.includes('.jpeg') || url.includes('.gif') || url.includes('logos') || url.includes('banners'));
    
    // Si c'est un lien externe (Google Drive, Figma, Site Web...), on ne peut souvent pas l'iframe
    // On affiche une carte stylée pour ouvrir
    const isExternalLink = type === 'LINK' || (!isVideo && !isPdf && !isImage);

    const handleImageLoad = () => setIsLoading(false);
    const handleError = () => { setIsLoading(false); setError(true); };

    if (isExternalLink) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-white p-8 text-center">
                <div className="bg-white/10 p-6 rounded-full mb-6 animate-pulse">
                    <ExternalLink size={48} />
                </div>
                <h3 className="text-2xl font-bold mb-2">Lien Externe</h3>
                <p className="text-slate-400 mb-8 max-w-md">Ce contenu est hébergé sur une plateforme externe (Drive, Figma, Youtube...). Il ne peut pas être intégré directement.</p>
                
                <a 
                    href={url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg hover:scale-105"
                >
                    Ouvrir "{name}" dans un nouvel onglet <ExternalLink size={18}/>
                </a>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden">
            
            {/* TOOLBAR (ZOOM) - Visible only for images/PDF */}
            {!isVideo && !error && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-4 bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-xl">
                    <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-1 text-white hover:text-indigo-400 transition-colors"><ZoomOut size={18}/></button>
                    <span className="text-xs font-mono font-bold text-white w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
                    <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-1 text-white hover:text-indigo-400 transition-colors"><ZoomIn size={18}/></button>
                    <div className="w-px h-4 bg-white/20"></div>
                    <button onClick={() => setZoom(1)} className="p-1 text-white hover:text-indigo-400 transition-colors" title="Reset"><Maximize size={16}/></button>
                </div>
            )}

            {/* CONTENT AREA */}
            <div className="flex-1 flex items-center justify-center overflow-auto p-4 custom-scrollbar">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center text-indigo-400">
                        <RefreshCw size={48} className="animate-spin"/>
                    </div>
                )}

                {error && (
                    <div className="text-center text-red-400 bg-red-900/20 p-8 rounded-2xl border border-red-900/50">
                        <AlertCircle size={48} className="mx-auto mb-4"/>
                        <p className="font-bold">Erreur de chargement du fichier.</p>
                        <a href={url} target="_blank" rel="noreferrer" className="text-sm underline mt-2 block hover:text-white">Essayer d'ouvrir le lien direct</a>
                    </div>
                )}

                {/* IMAGE VIEWER */}
                {isImage && (
                    <img 
                        src={url} 
                        alt="Preview"
                        className={`transition-transform duration-200 ease-out shadow-2xl rounded-sm`}
                        style={{ transform: `scale(${zoom})`, maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        onLoad={handleImageLoad}
                        onError={handleError}
                    />
                )}

                {/* VIDEO VIEWER */}
                {isVideo && (
                    <video 
                        src={url} 
                        controls 
                        className="max-w-full max-h-full rounded-lg shadow-2xl bg-black"
                        onLoadedData={handleImageLoad}
                        onError={handleError}
                    />
                )}

                {/* PDF VIEWER */}
                {isPdf && (
                    <object 
                        data={url} 
                        type="application/pdf" 
                        className="w-full h-full rounded-lg shadow-2xl bg-white"
                        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                        onLoad={handleImageLoad}
                        onError={handleError}
                    >
                        <div className="flex flex-col items-center justify-center h-full text-white">
                            <p>L'aperçu PDF n'est pas supporté.</p>
                            <a href={url} target="_blank" rel="noreferrer" className="underline">Télécharger le PDF</a>
                        </div>
                    </object>
                )}
            </div>
        </div>
    );
};
