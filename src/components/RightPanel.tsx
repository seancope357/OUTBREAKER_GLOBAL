import { useStore } from '../store/useStore';
import { Activity, Beaker, BrainCircuit, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function RightPanel() {
  const { cases, news } = useStore();
  const [aiRisk, setAiRisk] = useState<{ level: string, reason: string, score: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const determineRisk = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assess-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cases, news })
      });
      const data = await res.json();
      setAiRisk(data.riskAssessment);
    } catch (e) {
      console.error(e);
      setAiRisk({ level: 'UNKNOWN', reason: 'Failed to reach AI assessment core.', score: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cases.length > 0 || news.length > 0) {
      determineRisk();
    }
  }, []);

  return (
    <div className="w-full md:w-[26rem] bg-[#0f0f12] flex flex-col h-screen text-[#e0e0e0] overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)] relative z-10 font-sans">
      
      {/* Top Half: Nextstrain Embed */}
      <div className="flex-1 flex flex-col border-b border-[#2d2d30]">
        <div className="p-3 border-b border-[#2d2d30] bg-[#1a1a1f] flex items-center justify-between">
          <h2 className="text-[10px] text-[#808080] uppercase font-bold tracking-widest flex items-center gap-2">
            <Activity className="w-3 h-3 text-[#ffaa00]" /> Nextstrain Genomics
          </h2>
          <span className="text-[9px] bg-[#ffaa00]/10 text-[#ffaa00] border border-[#ffaa00] px-1 py-0.5 font-mono">LIVE IFRAME</span>
        </div>
        <div className="flex-1 relative bg-black">
          {/* Note: Nextstrain allows embedding. We embed a general pathogen or zika if hantavirus is unavailable. */}
          <iframe 
            src="https://nextstrain.org/zika?embed=1&legend=closed" 
            className="w-full h-full border-none"
            title="Nextstrain Embed"
          />
        </div>
      </div>

      {/* Bottom Half: AI Risk Assessor Context */}
      <div className="h-[40vh] flex flex-col bg-[#0a0a0c]">
        <div className="p-3 border-b border-[#2d2d30] bg-[#1a1a1f] flex items-center justify-between">
          <h2 className="text-[10px] text-[#808080] uppercase font-bold tracking-widest flex items-center gap-2">
            <BrainCircuit className="w-3 h-3 text-[#4d4dff]" /> AI Threat Synthesis
          </h2>
          <button 
            onClick={determineRisk} 
            disabled={loading}
            className="text-[9px] bg-[#4d4dff]/10 text-[#4d4dff] border border-[#4d4dff] px-2 py-0.5 font-mono hover:bg-[#4d4dff]/20 transition-colors"
          >
            {loading ? 'ANALYZING...' : 'FORCE REEVAL'}
          </button>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4">
          
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[9px] text-[#808080] uppercase tracking-widest mb-1">Calculated Global Risk</div>
              {loading ? (
                <div className="flex items-center gap-2 text-[#4d4dff] font-mono text-sm font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" /> PROCESSING
                </div>
              ) : (
                <div className={`font-mono text-lg font-bold ${aiRisk?.level === 'CRITICAL' ? 'text-[#ff4d4d]' : aiRisk?.level === 'HIGH' ? 'text-[#ffaa00]' : 'text-green-500'}`}>
                  {aiRisk?.level || 'AWAITING DATA'} // {aiRisk ? `SCORE: ${aiRisk.score}/100` : 'N/A'}
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#1a1a1f] border border-[#2d2d30] p-3 rounded-sm">
            <div className="text-[10px] text-[#808080] font-bold uppercase tracking-widest mb-2 border-b border-[#2d2d30] pb-1 flex items-center gap-2">
              <Beaker className="w-3 h-3" /> Synthesis Rationale
            </div>
            {loading ? (
              <div className="space-y-2">
                <div className="h-2 bg-[#2d2d30] rounded-sm animate-pulse w-full"></div>
                <div className="h-2 bg-[#2d2d30] rounded-sm animate-pulse w-5/6"></div>
                <div className="h-2 bg-[#2d2d30] rounded-sm animate-pulse w-4/6"></div>
              </div>
            ) : (
              <p className="text-[11px] text-[#e0e0e0] leading-relaxed">
                {aiRisk?.reason || 'Initiate scan to begin synthesis of current cases and OSINT intercepts.'}
              </p>
            )}
          </div>
          
        </div>
      </div>

    </div>
  );
}
