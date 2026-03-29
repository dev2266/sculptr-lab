import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Download, RefreshCw, Zap, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { haptics } from '../lib/haptics';

interface PumpModeProps {
  onClose: () => void;
}

export const PumpMode: React.FC<PumpModeProps> = ({ onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setIsCameraReady(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Please allow camera access to use 'The Pump' mode.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Mirror if user camera
        if (facingMode === 'user') {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Reset transform for overlay
        context.setTransform(1, 0, 0, 1, 0, 0);
        
        // Add Growth Overlay
        context.fillStyle = 'rgba(255, 69, 0, 0.5)';
        context.font = 'bold 40px monospace';
        context.textAlign = 'right';
        context.fillText('ELITE GROWTH PROTOCOL', canvas.width - 20, canvas.height - 60);
        context.font = 'bold 20px monospace';
        context.fillText(new Date().toLocaleDateString(), canvas.width - 20, canvas.height - 30);
        
        const dataUrl = canvas.toDataURL('image/png');
        setCapturedImage(dataUrl);
        haptics.success();
      }
    }
  };

  const downloadPhoto = () => {
    if (capturedImage) {
      const link = document.createElement('a');
      link.href = capturedImage;
      link.download = `elite-growth-pump-${new Date().getTime()}.png`;
      link.click();
      haptics.medium();
    }
  };

  const sharePhoto = async () => {
    if (capturedImage && navigator.share) {
      try {
        const blob = await (await fetch(capturedImage)).blob();
        const file = new File([blob], 'pump.png', { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: 'Elite Growth Pump',
          text: 'Just finished an Elite Growth session. The pump is real.'
        });
        haptics.success();
      } catch (err) {
        console.error("Error sharing:", err);
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    haptics.light();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
    >
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
        <button onClick={onClose} className="p-3 bg-white/10 backdrop-blur-xl rounded-full text-white">
          <X size={24} />
        </button>
        <div className="px-4 py-2 bg-stress-red/20 backdrop-blur-xl rounded-full border border-stress-red/30 flex items-center gap-2">
          <Zap size={14} className="text-stress-red animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-stress-red">The Pump Mode</span>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {!capturedImage ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className={facingMode === 'user' ? 'scale-x-[-1] w-full h-full object-cover' : 'w-full h-full object-cover'}
            />
            <div className="absolute inset-0 border-[20px] border-white/5 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-96 border border-white/20 rounded-3xl" />
            </div>
          </>
        ) : (
          <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="p-10 bg-black flex justify-around items-center">
        {!capturedImage ? (
          <>
            <button onClick={toggleCamera} className="p-4 bg-white/5 rounded-full text-white/60">
              <RefreshCw size={24} />
            </button>
            <button 
              onClick={capturePhoto}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-4 border-white/20 active:scale-95 transition-all"
            >
              <div className="w-16 h-16 bg-white border-2 border-black rounded-full" />
            </button>
            <div className="w-12" />
          </>
        ) : (
          <div className="flex flex-col gap-4 w-full px-6">
            <div className="flex justify-around items-center mb-2">
              <button onClick={() => setCapturedImage(null)} className="flex flex-col items-center gap-2 text-white/60">
                <RefreshCw size={20} />
                <span className="text-[10px] font-bold uppercase">Retake</span>
              </button>
              <button onClick={downloadPhoto} className="flex flex-col items-center gap-2 text-white/60">
                <Download size={20} />
                <span className="text-[10px] font-bold uppercase">Save</span>
              </button>
              {navigator.share && (
                <button onClick={sharePhoto} className="flex flex-col items-center gap-2 text-white/60">
                  <Share2 size={20} />
                  <span className="text-[10px] font-bold uppercase">Share</span>
                </button>
              )}
            </div>
            <button 
              onClick={onClose}
              className="w-full py-4 bg-white text-black rounded-full font-bold uppercase tracking-widest"
            >
              Finish Session
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
