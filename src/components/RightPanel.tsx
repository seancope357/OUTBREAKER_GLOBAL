import { useStore } from '../store/useStore';
import { Activity, Beaker, BrainCircuit, Loader2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import ThreatListPanel from './ThreatListPanel';

export default function RightPanel() {
  const { cases, news, isConnected, feedHealth } = useStore();
  const [aiRisk, setAiRisk] = useState<{ level: string, reason: string, score: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const summary = useMemo(() => {
    return cases.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.type === 'rat' || item.entity === 'rodent') acc.rodents += 1;
        if (item.type === 'current' || item.type === 'passenger') acc.live += 1;
        if (item.isHighRisk) acc.highRisk += 1;
        return acc;
      },
      { total: 0, live: 0, rodents: 0, highRisk: 0 }
    );
  }, [cases]);

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
  }, [cases, news]);

  return (
    <div className="w-full md:w-[26rem] bg-[#0f0f12] flex flex-col h-screen text-[#e0e0e0] overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)] relative z-10 font-sans">
      
      {/* Top Half: Nextstrain Embed */}
      <div className="flex-1 flex flex-col border-b border-[#2d2d30]">
        <div className="p-3 border-b border-[#2d2d30] bg-[#1a1a1f] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] text-[#808080] uppercase font-bold tracking-widest flex items-center gap-2">
              <Activity className="w-3 h-3 text-[#ffaa00]" /> Nextstrain Genomics
            </h2>
            <span className={`text-[9px] border px-1 py-0.5 font-mono ${isConnected ? 'bg-[#0f1a2a] border-[#7dc7ff] text-[#7dc7ff]' : 'bg-[#2a0f0f] border-[#ff4d4d] text-[#ff4d4d]'}`}>
              {isConnected ? 'DATA LIVE' : 'OFFLINE MODE'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[9px] uppercase tracking-[0.2em] text-[#868686]">
            <div className="bg-[#0d0d0f] border border-[#2d2d30] rounded-sm p-2">
              <div className="text-[#808080]">TOTAL CASES</div>
              <div className="font-bold text-[#ffffff]">{summary.total}</div>
            </div>
            <div className="bg-[#0d0d0f] border border-[#2d2d30] rounded-sm p-2">
              <div className="text-[#808080]">LIVE CASES</div>
              <div className="font-bold text-[#ff4d4d]">{summary.live}</div>
            </div>
            <div className="bg-[#0d0d0f] border border-[#2d2d30] rounded-sm p-2">
              <div className="text-[#808080]">RODENT SIGNALS</div>
              <div className="font-bold text-[#7dc7ff]">{summary.rodents}</div>
            </div>
          </div>
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
      <div className="flex-1 overflow-y-auto bg-[#0a0a0c]">
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
        
        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[9px] text-[#808080] uppercase tracking-widest mb-1">Calculated Global Risk</div>
                {loading ? (
                  <div className="flex items-center gap-2 text-[#4d4dff] font-mono text-sm font-bold">
                    <Loader2 className="w-4 h-4 animate-spin" /> PROCESSING
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className={`font-mono text-lg font-bold ${aiRisk?.level === 'CRITICAL' ? 'text-[#ff4d4d]' : aiRisk?.level === 'HIGH' ? 'text-[#ffaa00]' : 'text-green-500'}`}>
                      {aiRisk?.level || 'AWAITING DATA'}
                    </div>
                    {aiRisk && (
                      <div className="text-[10px] text-[#808080] uppercase tracking-widest">Score: {aiRisk.score}/100</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-widest text-[#808080]">
              <div className="bg-[#111111] border border-[#2d2d30] rounded-sm p-3">
                <div className="text-[8px] uppercase tracking-[0.25em] mb-1">Trend</div>
                <div className="font-bold text-[#ffffff]">{news.length > 0 ? 'Active OSINT surge' : 'Awaiting intercepts'}</div>
              </div>
              <div className="bg-[#111111] border border-[#2d2d30] rounded-sm p-3">
                <div className="text-[8px] uppercase tracking-[0.25em] mb-1">Feed Health</div>
                <div className={`font-bold ${feedHealth.status === 'healthy' ? 'text-[#7dc7ff]' : feedHealth.status === 'degraded' ? 'text-[#ffaa00]' : 'text-[#ff4d4d]'}`}>
                  {feedHealth.status.toUpperCase()}
                </div>
                <div className="text-[8px] mt-1 text-[#808080] leading-snug">{feedHealth.message}</div>
              </div>
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

          <ThreatListPanel />
        </div>
      </div>

    </div>
  );
}
