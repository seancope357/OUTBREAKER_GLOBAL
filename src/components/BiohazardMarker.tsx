import { Biohazard } from 'lucide-react';

export function SpinningBiohazard({ className = "", size = 24, label = "Biohazard indicator" }: { className?: string; size?: number; label?: string }) {
  return (
    <div
      className={`spin-biohazard relative flex items-center justify-center ${className}`}
      role="img"
      aria-label={label}
      style={{
        width: size,
        height: size,
        transformStyle: 'preserve-3d',
      }}
    >
      <Biohazard
        size={size}
        color="#ff0000"
        aria-hidden="true"
        style={{ filter: 'drop-shadow(0 0 8px rgba(255,0,0,0.8))' }}
      />
      <style>{`
        @keyframes spin-3d {
          from { transform: perspective(400px) rotateY(0deg); }
          to { transform: perspective(400px) rotateY(360deg); }
        }
        .spin-biohazard { animation: spin-3d 3s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .spin-biohazard { animation: none; }
        }
      `}</style>
    </div>
  );
}
