import { useMemo, useState } from 'react';
import { Bell, BellOff, ShieldAlert, Newspaper } from 'lucide-react';
import { useStore } from '../store/useStore';
import { requestNotificationPermission, playUrgentAlert, sendPushNotification } from '../utils/audio';
import { SpinningBiohazard } from './BiohazardMarker';
import { isValidSourceUrl } from '../utils/links';

const CASE_TYPE_LABELS: Record<string, string> = {
  historic: 'Historic',
  current: 'Confirmed',
  passenger: 'Passenger',
  osint: 'OSINT',
  rat: 'Rodent',
  'who-don': 'WHO Outbreak',
  wastewater: 'Wastewater'
};

export default function Sidebar() {
  const { cases, news, alertsEnabled, setAlertsEnabled, setSelectedCase, isConnected } = useStore();
  const [caseFilters, setCaseFilters] = useState({ historic: true, current: true, passenger: true, osint: true, rat: true, 'who-don': true, wastewater: true });
  const [newsFilters, setNewsFilters] = useState({ MAINSTREAM: true, RAW_DATA: true, INDEPENDENT: true });

  const filteredCases = useMemo(
    () => cases.filter((c) => caseFilters[(c.type ?? 'current') as keyof typeof caseFilters]),
    [cases, caseFilters]
  );

  const caseSummary = useMemo(() => {
    return cases.reduce(
      (acc, c) => {
        const type = c.type ?? 'current';
        acc[type] = (acc[type] || 0) + 1;
        if (c.entity === 'rodent') acc.rodent = (acc.rodent || 0) + 1;
        if (c.entity === 'human') acc.human = (acc.human || 0) + 1;
        if (c.isHighRisk) acc.highRisk += 1;
        return acc;
      },
      { historic: 0, current: 0, passenger: 0, osint: 0, rat: 0, 'who-don': 0, wastewater: 0, human: 0, rodent: 0, highRisk: 0 } as Record<string, number>
    );
  }, [cases]);

  const filteredNews = useMemo(
    () => news.filter((n) => newsFilters[n.category ?? 'MAINSTREAM']),
    [news, newsFilters]
  );

  const toggleCaseFilter = (type: string) => {
    setCaseFilters((prev) => ({ ...prev, [type]: !prev[type as keyof typeof prev] }));
  };

  const toggleNewsFilter = (category: string) => {
    setNewsFilters((prev) => ({ ...prev, [category]: !prev[category as keyof typeof prev] }));
  };

  const handleToggleAlerts = async () => {
    if (!alertsEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        setAlertsEnabled(true);
        sendPushNotification('Alerts Enabled', { body: 'You will now receive critical epidemiological updates.' });
      } else {
        alert('Notification permissions were denied by the browser.');
      }
    } else {
      setAlertsEnabled(false);
    }
  };

  const simulateNewCase = () => {
    playUrgentAlert();
    // In a real app, this would be a WebSocket event listener triggering this function.
  };

  return (
    <div className="w-full md:w-[22rem] bg-[#0f0f12] border-l border-[#2d2d30] flex flex-col h-screen text-[#e0e0e0] overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)] relative z-10 font-sans">
      
      {/* Header */}
      <div className="p-5 border-b border-[#2d2d30] bg-[#0f0f12]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <SpinningBiohazard size={16} />
            <div>
              <h1 className="text-lg font-bold tracking-tighter text-white uppercase font-serif">OUTBREAKER <span className="text-[#8b0000]">GLOBAL</span></h1>
              <p className="text-[9px] text-[#808080] uppercase tracking-widest leading-none mt-1">Real-Time Pathogen Surveillance</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleAlerts}
            aria-pressed={alertsEnabled}
            aria-label={alertsEnabled ? 'Disable push notification alerts' : 'Enable push notification alerts'}
            className={`px-3 py-1.5 bg-[#1a1a1f] border border-[#2d2d30] text-[10px] font-semibold hover:bg-[#25252a] transition-colors flex items-center gap-2 uppercase tracking-wider focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4d4d] ${alertsEnabled ? 'text-[#ff4d4d]' : 'text-[#808080]'}`}
            title="Toggle Push Notifications"
          >
            {alertsEnabled ? <Bell className="w-3 h-3" aria-hidden="true" /> : <BellOff className="w-3 h-3" aria-hidden="true" />}
          </button>
        </div>
        <div className="flex flex-col items-end pt-2 border-t border-[#2d2d30]/50 mt-2">
          <span className="text-[9px] text-[#808080] uppercase tracking-widest">Global Risk Level</span>
          <span className="text-[11px] font-bold text-[#ff4d4d] animate-pulse">CRITICAL // TIER 2</span>
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        
        {/* Filters */}
        <div className="p-4 border-b border-[#2d2d30]">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div>
              <h2 className="text-[10px] text-[#808080] uppercase font-bold tracking-widest">Threat Filters</h2>
              <p className="text-[9px] text-[#606060] mt-1">Refine visible cases and feeds by category.</p>
            </div>
            <span className={`text-[10px] font-mono uppercase tracking-widest ${isConnected ? 'text-[#7dc7ff]' : 'text-[#ff4d4d]'}`}>
              {isConnected ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>

          <div role="group" aria-label="Case type filters" className="grid grid-cols-2 gap-2">
            {Object.entries(caseFilters).map(([key, enabled]) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleCaseFilter(key)}
                aria-pressed={enabled}
                aria-label={`Toggle ${CASE_TYPE_LABELS[key] || key} filter`}
                className={`px-2 py-2 text-[9px] uppercase tracking-widest rounded-sm border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4d4d] ${enabled ? 'bg-[#ff4d4d] text-black border-[#ff4d4d]' : 'bg-[#1a1a1f] text-[#808080] border-[#2d2d30] hover:bg-[#25252a]'}`}
              >
                {CASE_TYPE_LABELS[key] || key}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4 text-[10px] uppercase tracking-widest text-[#808080]">
            <div className="bg-[#111111] border border-[#2d2d30] rounded-sm p-2">
              <div className="text-[8px] uppercase tracking-[0.25em] text-[#808080]">High-Risk Signals</div>
              <div className="text-base font-bold text-[#ff4d4d]">{caseSummary.highRisk}</div>
            </div>
            <div className="bg-[#111111] border border-[#2d2d30] rounded-sm p-2">
              <div className="text-[8px] uppercase tracking-[0.25em] text-[#808080]">Rodent Indicators</div>
              <div className="text-base font-bold text-[#7dc7ff]">{caseSummary.rodent}</div>
            </div>
            <div className="bg-[#111111] border border-[#2d2d30] rounded-sm p-2">
              <div className="text-[8px] uppercase tracking-[0.25em] text-[#808080]">Human Cases</div>
              <div className="text-base font-bold text-[#ffaa00]">{caseSummary.human}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-[9px] text-[#808080] uppercase tracking-widest mb-2">News Feed</div>
            <div role="group" aria-label="News category filters" className="grid grid-cols-3 gap-2">
              {Object.entries(newsFilters).map(([category, enabled]) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleNewsFilter(category)}
                  aria-pressed={enabled}
                  aria-label={`Toggle ${category.replace('_', ' ')} news filter`}
                  className={`px-2 py-2 text-[9px] uppercase tracking-widest rounded-sm border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffaa00] ${enabled ? 'bg-[#ffaa00] text-black border-[#ffaa00]' : 'bg-[#1a1a1f] text-[#808080] border-[#2d2d30] hover:bg-[#25252a]'}`}
                >
                  {category.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Threat Vectors */}
        <div className="p-4 border-b border-[#2d2d30]">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="text-[10px] text-[#808080] uppercase font-bold tracking-widest flex items-center gap-2">
              <ShieldAlert className="w-3 h-3" /> Validated Signatures
            </h2>
            <span className="text-[9px] text-[#808080] uppercase tracking-widest">{filteredCases.length} visible</span>
          </div>
          <div className="space-y-3">
            {filteredCases.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCase(c)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCase(c); } }}
                role="button"
                tabIndex={0}
                aria-label={`View case details for ${c.title}`}
                className="bg-[#1a1a1f] border border-[#2d2d30] p-3 rounded-sm hover:border-[#ff4d4d]/50 hover:bg-[#25252a] transition-all cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4d4d]"
              >
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="text-[11px] font-bold text-[#e0e0e0] group-hover:text-[#ff4d4d] transition-colors line-clamp-1">{c.title}</h3>
                  <div className="flex items-center gap-2">
                    {c.isHighRisk && <span className="flex min-w-[6px] min-h-[6px] rounded-full bg-[#ff4d4d] mt-1 shadow-[0_0_5px_rgba(255,77,77,0.8)] animate-pulse" />}
                    <span className="text-[8px] uppercase tracking-widest bg-[#1a1a1f] border border-[#2d2d30] px-2 py-1 rounded-full text-[#808080]">{CASE_TYPE_LABELS[c.type || 'current']}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  {c.sourceType && <span className="text-[9px] uppercase tracking-widest bg-[#111111] border border-[#2d2d30] px-2 py-1 rounded-full text-[#7dc7ff]">{c.sourceType}</span>}
                  {c.confidenceLevel && <span className="text-[9px] uppercase tracking-widest bg-[#111111] border border-[#2d2d30] px-2 py-1 rounded-full text-[#ffd166]">{c.confidenceLevel}</span>}
                </div>
                <div className="text-[10px] text-[#8b0000] mb-2 font-mono uppercase tracking-wider">Lat: {c.lat.toFixed(2)} / Lng: {c.lng.toFixed(2)}</div>
                <p className="text-[10px] text-[#808080] leading-tight line-clamp-2">{c.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* News Feeds */}
        <div className="p-4 mb-4">
          <div className="mb-6">
            <h2 className="text-[10px] text-[#ffaa00] uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
              <Newspaper className="w-3 h-3" /> Mainstream Narrative
            </h2>
            <div className="space-y-3">
              {filteredNews.filter(n => n.category === 'MAINSTREAM').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((n) => {
                const linkable = isValidSourceUrl(n.url);
                const Inner = (
                  <>
                    {n.imageUrl && (
                      <div className="h-20 w-full overflow-hidden">
                         <img src={n.imageUrl} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0" />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-[10px] font-bold text-[#ffaa00] mb-1 line-clamp-1 uppercase">{n.title}</p>
                      <p className="text-[11px] text-[#e0e0e0] leading-tight mb-2 line-clamp-2">"{n.summary}"</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] text-[#808080] font-mono uppercase">{new Date(n.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} GMT // {n.source}</span>
                        {linkable && <span className="text-[9px] text-[#ffaa00] font-mono">OPEN ↗</span>}
                      </div>
                    </div>
                  </>
                );
                return linkable ? (
                  <a
                    key={n.id}
                    href={n.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`Open mainstream source: ${n.title}`}
                    className="block bg-[#1a1a1f] border border-[#2d2d30] overflow-hidden hover:border-[#ffaa00]/50 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffaa00]"
                  >{Inner}</a>
                ) : (
                  <div key={n.id} className="block bg-[#1a1a1f] border border-[#2d2d30] overflow-hidden opacity-90 group">{Inner}</div>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-[10px] text-[#ff0000] uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
              <Newspaper className="w-3 h-3" /> Raw / Live Data Intercepts
            </h2>
            <div className="space-y-3">
              {filteredNews.filter(n => n.category === 'RAW_DATA').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((n) => {
                const linkable = isValidSourceUrl(n.url);
                const Inner = (
                  <>
                    {n.imageUrl && (
                      <div className="h-24 w-full overflow-hidden relative">
                         <div className="absolute inset-0 bg-[#ff0000]/20 mix-blend-overlay z-10"></div>
                         <img src={n.imageUrl} alt="" className="w-full h-full object-cover grayscale mix-blend-luminosity opacity-80 group-hover:scale-105 transition-transform duration-700" />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-[10px] font-bold text-[#ff0000] mb-1 line-clamp-2 uppercase">{n.title}</p>
                      <p className="text-[11px] text-[#e0e0e0] leading-tight mb-2 line-clamp-3">"{n.summary}"</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] text-[#808080] font-mono uppercase">{new Date(n.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} GMT // {n.source}</span>
                        {linkable && <span className="text-[9px] text-[#ff0000] font-mono">OPEN ↗</span>}
                      </div>
                    </div>
                  </>
                );
                return linkable ? (
                  <a
                    key={n.id}
                    href={n.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`Open raw data source: ${n.title}`}
                    className="block bg-[#1a1a1f] border-l-2 border-[#ff0000] border-y border-r border-[#2d2d30]/50 overflow-hidden hover:bg-[#25252a] hover:border-r-transparent transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0000]"
                  >{Inner}</a>
                ) : (
                  <div key={n.id} className="block bg-[#1a1a1f] border-l-2 border-[#ff0000] border-y border-r border-[#2d2d30]/50 overflow-hidden opacity-90 group">{Inner}</div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Footer Controls */}
      <div className="p-4 border-t border-[#2d2d30] bg-[#0f0f12] flex flex-col gap-2 mt-auto">
        <button
          type="button"
          onClick={simulateNewCase}
          aria-label="Test audio alert pipeline"
          className="w-full py-2 bg-[#1a1a1f] hover:bg-[#25252a] text-[#808080] hover:text-white text-[10px] font-mono rounded-sm border text-center border-[#2d2d30] uppercase tracking-widest transition-colors flex justify-center items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4d4d]"
        >
          <div className="w-1.5 h-1.5 bg-[#8b0000] border border-[#ff4d4d] rounded-full" aria-hidden="true"></div> TEST AUDIO PIPELINE
        </button>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <div className="text-[9px] text-[#404040] text-center uppercase tracking-widest">
            {isConnected ? 'SAT-COMM STABLE (4.2ms)' : 'SAT-COMM DOWN // RETRYING...'}
          </div>
        </div>
      </div>
    </div>
  );
}
