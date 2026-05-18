import { useMemo } from 'react';
import { Button, Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@fluentui/react-components';
import { useStore } from '../store/useStore';
import { isValidSourceUrl } from '../utils/links';

function formatDate(value: string) {
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ThreatListPanel() {
  const { cases, news, feedHealth, setSelectedCase, isConnected } = useStore();

  const liveCases = useMemo(
    () => cases.filter((c) => c.type === 'current' || c.type === 'passenger' || c.type === 'osint' || c.type === 'rat'),
    [cases]
  );

  const osintAlerts = useMemo(
    () => [...news].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8),
    [news]
  );

  const hotspotWatchlist = useMemo(() => {
    const buckets: Record<string, { name: string; count: number; risk: number; lat: number; lng: number }> = {};
    cases.forEach((c) => {
      const latKey = Math.round(c.lat * 10) / 10;
      const lngKey = Math.round(c.lng * 10) / 10;
      const key = `${latKey}:${lngKey}`;
      buckets[key] = buckets[key] || { name: `Zone ${latKey.toFixed(1)}, ${lngKey.toFixed(1)}`, count: 0, risk: 0, lat: latKey, lng: lngKey };
      buckets[key].count += 1;
      buckets[key].risk += c.isHighRisk ? 2 : 1;
    });
    return Object.values(buckets)
      .sort((a, b) => b.risk - a.risk || b.count - a.count)
      .slice(0, 6);
  }, [cases]);

  const containmentActions = useMemo(() => {
    const totalCases = cases.length;
    const activeCases = liveCases.length;
    const actions = [
      {
        id: 'action-1',
        name: 'Deploy rodent surveillance teams',
        status: feedHealth.status === 'healthy' ? 'ACTIVE' : 'URGENT',
        owner: 'Vector Ops',
        due: 'ASAP'
      },
      {
        id: 'action-2',
        name: 'Audit latest OSINT alerts',
        status: activeCases > 0 ? 'IN REVIEW' : 'PENDING',
        owner: 'Intel Desk',
        due: '2h'
      },
      {
        id: 'action-3',
        name: 'Validate high-risk case clusters',
        status: totalCases > 5 ? 'IN PROGRESS' : 'STANDBY',
        owner: 'Epidemiology',
        due: '4h'
      },
      {
        id: 'action-4',
        name: 'Publish containment advisory',
        status: feedHealth.status === 'degraded' ? 'REQUIRED' : 'READY',
        owner: 'Crisis Comm',
        due: '6h'
      }
    ];
    return actions;
  }, [cases.length, feedHealth.status, liveCases.length]);

  const intelligenceMetrics = useMemo(
    () => [
      { label: 'Feed Status', value: feedHealth.status.toUpperCase() },
      { label: 'Live Alerts', value: String(osintAlerts.length) },
      { label: 'Active Cases', value: String(liveCases.length) },
      { label: 'Hotspot Zones', value: String(hotspotWatchlist.length) },
      { label: 'High-Risk Signals', value: String(cases.filter((c) => c.isHighRisk).length) },
      { label: 'Connection', value: isConnected ? 'ONLINE' : 'OFFLINE' }
    ],
    [feedHealth.status, osintAlerts.length, liveCases.length, hotspotWatchlist.length, isConnected, cases]
  );

  return (
    <div className="space-y-4">
      <section className="bg-[#111111] border border-[#2d2d30] rounded-sm p-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[9px] text-[#808080] uppercase tracking-widest">Intelligence Dashboard</div>
            <div className="text-[12px] font-bold text-[#ffffff]">Operational Metrics</div>
          </div>
          <span className="px-2 py-1 rounded-full text-[9px] uppercase tracking-[0.25em] bg-[#0f1420] text-[#7dc7ff]">Live</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {intelligenceMetrics.map((metric) => (
            <div key={metric.label} className="bg-[#0f0f14] border border-[#222] rounded-sm p-3">
              <div className="text-[9px] uppercase tracking-[0.25em] text-[#808080]">{metric.label}</div>
              <div className="text-[13px] font-bold text-[#ffffff] mt-1">{metric.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#111111] border border-[#2d2d30] rounded-sm p-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[9px] text-[#808080] uppercase tracking-widest">Live Case Feed</div>
            <div className="text-[12px] font-bold text-[#ffffff]">Real-time incident stream</div>
          </div>
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#ff4d4d]">{liveCases.length} cases</span>
        </div>
        <Table as="div" className="w-full border border-[#222]">
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Case</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Risk</TableHeaderCell>
              <TableHeaderCell>Location</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {liveCases.slice(0, 6).map((item) => (
              <TableRow key={item.id} className="hover:bg-[#18181d] cursor-pointer" onClick={() => setSelectedCase(item)}>
                <TableCell>{item.title}</TableCell>
                <TableCell>{item.type || 'current'}</TableCell>
                <TableCell>{item.isHighRisk ? 'HIGH' : 'MEDIUM'}</TableCell>
                <TableCell>{`${item.lat.toFixed(1)}, ${item.lng.toFixed(1)}`}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-3 flex justify-end">
          <Button appearance="secondary" size="small" onClick={() => setSelectedCase(liveCases[0] ?? null)}>
            Focus Top Case
          </Button>
        </div>
      </section>

      <section className="bg-[#111111] border border-[#2d2d30] rounded-sm p-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[9px] text-[#808080] uppercase tracking-widest">OSINT Alert Queue</div>
            <div className="text-[12px] font-bold text-[#ffffff]">Newest verified intercepts</div>
          </div>
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#7dc7ff]">{osintAlerts.length} alerts</span>
        </div>
        <div className="space-y-2">
          {osintAlerts.map((alert) => (
            <div key={alert.id} className="bg-[#0b0c10] border border-[#222] rounded-sm p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="text-[11px] font-bold text-[#ffffff] line-clamp-1">{alert.title}</div>
                <span className="text-[8px] uppercase tracking-[0.25em] text-[#808080]">{formatDate(alert.date)}</span>
              </div>
              <div className="text-[10px] text-[#c8c8c8] line-clamp-2">{alert.summary}</div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[9px] uppercase tracking-[0.25em] text-[#7dc7ff]">{alert.source}</span>
                {isValidSourceUrl(alert.url) ? (
                  <a
                    className="text-[9px] text-[#7dc7ff] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7dc7ff]"
                    href={alert.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`Open source: ${alert.source} — ${alert.title}`}
                  >
                    View Source ↗
                  </a>
                ) : (
                  <span className="text-[9px] text-[#555]" aria-label="No source link available">no link</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#111111] border border-[#2d2d30] rounded-sm p-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[9px] text-[#808080] uppercase tracking-widest">Containment Action List</div>
            <div className="text-[12px] font-bold text-[#ffffff]">Response tasks in priority order</div>
          </div>
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#ffaa00]">{containmentActions.length} tasks</span>
        </div>
        <Table as="div" className="w-full border border-[#222]">
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Task</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Owner</TableHeaderCell>
              <TableHeaderCell>Due</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {containmentActions.map((task) => (
              <TableRow key={task.id}>
                <TableCell>{task.name}</TableCell>
                <TableCell>{task.status}</TableCell>
                <TableCell>{task.owner}</TableCell>
                <TableCell>{task.due}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="bg-[#111111] border border-[#2d2d30] rounded-sm p-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[9px] text-[#808080] uppercase tracking-widest">Hotspot Watchlist</div>
            <div className="text-[12px] font-bold text-[#ffffff]">Current exposure clusters</div>
          </div>
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#ff4d4d]">{hotspotWatchlist.length}</span>
        </div>
        <Table as="div" className="w-full border border-[#222]">
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Cluster</TableHeaderCell>
              <TableHeaderCell>Case Count</TableHeaderCell>
              <TableHeaderCell>Risk Index</TableHeaderCell>
              <TableHeaderCell>Coords</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hotspotWatchlist.map((hotspot) => (
              <TableRow key={`${hotspot.lat}-${hotspot.lng}`}>
                <TableCell>{hotspot.name}</TableCell>
                <TableCell>{hotspot.count}</TableCell>
                <TableCell>{hotspot.risk}</TableCell>
                <TableCell>{`${hotspot.lat.toFixed(1)}, ${hotspot.lng.toFixed(1)}`}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
