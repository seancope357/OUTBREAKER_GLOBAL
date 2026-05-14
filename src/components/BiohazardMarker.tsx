import { Biohazard } from 'lucide-react';

export function SpinningBiohazard({ className = "", size = 24 }: { className?: string; size?: number }) {
  return (
    <div 
      className={`relative flex items-center justify-center ${className}`} 
      style={{ 
        width: size, 
        height: size, 
        transformStyle: 'preserve-3d',
        animation: 'spin-3d 3s linear infinite'
      }}
    >
      <Biohazard 
        size={size} 
        color="#ff0000" 
        style={{ filter: 'drop-shadow(0 0 8px rgba(255,0,0,0.8))' }} 
      />
      <style>{`
        @keyframes spin-3d {
          from { transform: perspective(400px) rotateY(0deg); }
          to { transform: perspective(400px) rotateY(360deg); }
        }
      `}</style>
    </div>
  );
}
