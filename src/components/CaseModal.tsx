import { X, ExternalLink, PlayCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store/useStore';
import { playBriefingAudio } from '../utils/tts';

export default function CaseModal() {
  const selectedCase = useStore((state) => state.selectedCase);
  const setSelectedCase = useStore((state) => state.setSelectedCase);
  const [isPlaying, setIsPlaying] = useState(false);

  if (!selectedCase) return null;

  const handlePlayAudio = async () => {
    setIsPlaying(true);
    try {
      const textToSpeak = `Briefing on: ${selectedCase.title}. ${selectedCase.description}`;
      await playBriefingAudio(textToSpeak);
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0c]/80 backdrop-blur-sm">
      <div className="bg-[#0f0f12] border border-[#ff4d4d] w-full max-w-lg rounded-sm shadow-[0_0_20px_rgba(255,77,77,0.15)] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3 px-4 border-b border-[#2d2d30] bg-[#1a1a1f]">
          <h2 className="text-[#ff4d4d] text-[10px] uppercase tracking-widest font-mono font-bold flex items-center gap-2">
            INDICATOR IDENTIFIED // {selectedCase.id}
          </h2>
          <button 
            onClick={() => setSelectedCase(null)}
            className="text-[#808080] hover:text-white transition-colors disabled:opacity-50"
            disabled={isPlaying}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-[#e0e0e0]">
          <h3 className="text-lg font-bold text-white uppercase italic font-serif mb-2 border-l-2 border-[#8b0000] pl-3">{selectedCase.title}</h3>
          
          <div className="flex items-center gap-4 text-[10px] font-mono text-[#8b0000] mb-6 pb-4 border-b border-[#2d2d30]">
            <span>LAT: {selectedCase.lat.toFixed(4)}</span>
            <span>LNG: {selectedCase.lng.toFixed(4)}</span>
            <span className="text-[#808080]">{new Date(selectedCase.date).toLocaleDateString()}</span>
          </div>

          <div className="text-[11px] text-[#e0e0e0] leading-relaxed mb-4">
            <p>{selectedCase.description}</p>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {selectedCase.sourceType && (
              <span className="text-[9px] uppercase tracking-widest bg-[#111111] border border-[#2d2d30] px-2 py-1 rounded-full text-[#7dc7ff]">{selectedCase.sourceType}</span>
            )}
            {selectedCase.confidenceLevel && (
              <span className="text-[9px] uppercase tracking-widest bg-[#111111] border border-[#2d2d30] px-2 py-1 rounded-full text-[#ffd166]">Confidence: {selectedCase.confidenceLevel}</span>
            )}
            {selectedCase.entity && (
              <span className="text-[9px] uppercase tracking-widest bg-[#111111] border border-[#2d2d30] px-2 py-1 rounded-full text-[#ff8c00]">{selectedCase.entity}</span>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <h4 className="text-[9px] uppercase tracking-widest text-[#808080] mb-1">Actions & References</h4>
            
            <button 
              onClick={handlePlayAudio}
              disabled={isPlaying}
              className="flex items-center gap-3 w-full p-3 bg-[#1a1a1f] hover:bg-[#25252a] border border-[#2d2d30] rounded-sm transition-colors text-left text-[11px] text-[#e0e0e0] group disabled:opacity-50 disabled:cursor-not-allowed">
              {isPlaying ? (
                 <Loader2 className="w-4 h-4 text-[#ff4d4d] animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4 text-[#ff4d4d] group-hover:scale-110 transition-transform" />
              )}
              <div>
                <div className="font-bold uppercase tracking-wider text-white">
                  {isPlaying ? 'GENERATING BRIEFING...' : 'Play Audio Briefing'}
                </div>
                <div className="text-[9px] text-[#808080]">Listen to detailed case summary playback</div>
              </div>
            </button>

            {selectedCase.sourceUrl ? (
              <a
                href={selectedCase.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between w-full p-3 bg-[#1a1a1f] hover:bg-[#25252a] border border-[#2d2d30] rounded-sm transition-colors text-left text-[11px] text-[#e0e0e0] group"
              >
                <div className="flex items-center gap-3">
                  <ExternalLink className="w-4 h-4 text-[#808080]" />
                  <div>
                    <div className="font-bold uppercase tracking-wider text-white">{selectedCase.source}</div>
                    <div className="text-[9px] text-[#808080]">View originating intelligence source</div>
                  </div>
                </div>
              </a>
            ) : (
              <div className="flex items-center justify-between w-full p-3 bg-[#1a1a1f] border border-[#2d2d30] rounded-sm text-[11px] text-[#808080] opacity-80">
                <div className="flex items-center gap-3">
                  <ExternalLink className="w-4 h-4 text-[#808080]" />
                  <div>
                    <div className="font-bold uppercase tracking-wider text-white">{selectedCase.source}</div>
                    <div className="text-[9px] text-[#808080]">No direct source link available</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
