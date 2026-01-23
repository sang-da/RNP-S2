
import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Move, Check, X } from 'lucide-react';

interface ImageCropperProps {
    imageSrc: string;
    aspectRatio: number; // 1 = Carré (Logo), 3 = Panoramique (Bannière)
    onCropComplete: (croppedBlob: Blob) => void;
    onCancel: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, aspectRatio, onCropComplete, onCancel }) => {
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Initialisation
    useEffect(() => {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
    }, [imageSrc]);

    // Gestion du Drag
    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging) return;
        e.preventDefault(); 
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        setOffset({ x: clientX - dragStart.x, y: clientY - dragStart.y });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Génération du Crop
    const createCrop = async () => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        const container = containerRef.current;
        if (!canvas || !image || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Dimensions de la zone de crop visible
        const containerRect = container.getBoundingClientRect();
        const cropWidth = containerRect.width;
        const cropHeight = containerRect.width / aspectRatio;

        // Définir la résolution du canvas de sortie (Haute Qualité)
        const outputScale = 2; 
        canvas.width = cropWidth * outputScale;
        canvas.height = cropHeight * outputScale;

        // Remplir fond blanc/transparent
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculs de dessin
        // L'image est affichée avec un scale (zoom).
        // On doit dessiner l'image source dans le canvas.
        
        // Taille affichée de l'image
        const displayedWidth = image.naturalWidth * zoom;
        const displayedHeight = image.naturalHeight * zoom;

        // Position relative de l'image par rapport au centre du crop
        // Le centre du container est (cropWidth/2, cropHeight/2)
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // On applique l'offset utilisateur
        // L'offset est en pixels CSS, on multiplie par outputScale
        const drawX = centerX - (displayedWidth * outputScale / 2) + (offset.x * outputScale);
        const drawY = centerY - (displayedHeight * outputScale / 2) + (offset.y * outputScale);

        // Dessin
        ctx.drawImage(
            image, 
            0, 0, image.naturalWidth, image.naturalHeight, // Source
            drawX, drawY, displayedWidth * outputScale, displayedHeight * outputScale // Destination
        );

        canvas.toBlob((blob) => {
            if (blob) onCropComplete(blob);
        }, 'image/jpeg', 0.95);
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="bg-slate-100 p-2 rounded-lg text-xs text-center text-slate-500 flex items-center justify-center gap-2">
                <Move size={14}/> Glissez pour déplacer l'image | Utilisez le slider pour zoomer
            </div>

            {/* CROPPER AREA */}
            <div 
                ref={containerRef}
                className="relative w-full bg-slate-900 overflow-hidden rounded-xl cursor-move touch-none select-none flex items-center justify-center"
                style={{ aspectRatio: `${aspectRatio}/1` }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
            >
                {/* IMAGE */}
                <img 
                    ref={imageRef}
                    src={imageSrc}
                    alt="Source"
                    className="absolute transition-transform duration-75 ease-linear pointer-events-none"
                    style={{
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                        maxWidth: 'none', // Important pour laisser l'image déborder
                        maxHeight: 'none'
                    }}
                    draggable={false}
                />

                {/* OVERLAY GUIDE (Semi-transparent borders if needed, or simple dashed line) */}
                <div className="absolute inset-0 border-2 border-white/50 pointer-events-none z-10 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
                
                {/* GRID LINES */}
                <div className="absolute inset-0 pointer-events-none opacity-30 z-20">
                    <div className="w-1/3 h-full border-r border-white/50 absolute left-0"></div>
                    <div className="w-1/3 h-full border-r border-white/50 absolute right-0"></div>
                    <div className="h-1/3 w-full border-b border-white/50 absolute top-0"></div>
                    <div className="h-1/3 w-full border-b border-white/50 absolute bottom-0"></div>
                </div>
            </div>

            {/* CONTROLS */}
            <div className="flex items-center gap-4 px-2">
                <ZoomOut size={20} className="text-slate-400"/>
                <input 
                    type="range" 
                    min={0.1} 
                    max={3} 
                    step={0.05} 
                    value={zoom} 
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <ZoomIn size={20} className="text-slate-400"/>
            </div>

            {/* ACTIONS */}
            <div className="flex gap-3 mt-auto pt-4 border-t border-slate-100">
                <button 
                    onClick={onCancel}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
                >
                    <X size={18}/> Annuler
                </button>
                <button 
                    onClick={createCrop}
                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg"
                >
                    <Check size={18}/> Valider le Cadrage
                </button>
            </div>

            {/* Hidden Canvas for Processing */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};
