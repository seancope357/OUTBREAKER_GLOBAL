import { useState, useMemo, useCallback } from 'react';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, ColumnLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore } from '../store/useStore';
import * as turf from '@turf/turf';
import { SpinningBiohazard } from './BiohazardMarker';
import type { CaseData } from '../types';

const RESET_VIEW = { longitude: -40, latitude: -10, zoom: 2, pitch: 45, bearing: 0 };

export default function GlobeView() {
  const cases = useStore((state) => state.cases);
  const trajectories = useStore((state) => state.trajectories);
  const setSelectedCase = useStore((state) => state.setSelectedCase);
  const [viewState, setViewState] = useState(RESET_VIEW);

  const trajectoryGeoJson = useMemo(() => {
    const features = trajectories.map((t: any) => {
       const start = [t.startLng, t.startLat];
       const end = [t.endLng, t.endLat];
       try {
         const greatCircle = turf.greatCircle(start, end);
         greatCircle.properties = { color: t.color || '#ff4d4d' };
         return greatCircle;
       } catch (e) {
         return turf.lineString([start, end], { color: t.color || '#ff4d4d' });
       }
    });
    return turf.featureCollection(features);
  }, [trajectories]);

  // Signal classes by visualization treatment:
  //   confirmed (gold pulse)     → WHO Disease Outbreak News, country centroid
  //   wastewater (teal column)   → CDC NWSS rows, US state centroid, height = detect %
  //   field/passenger (biohazard)→ confirmed/passenger drama markers
  //   rodent (cyan dot)          → reservoir signals
  //   historic (gray dot)        → archived outbreaks
  //   osint (pink + heatmap)     → unverified chatter density
  const whoDonCases = useMemo(() => cases.filter((c) => c.type === 'who-don'), [cases]);
  const wastewaterCases = useMemo(() => cases.filter((c) => c.type === 'wastewater'), [cases]);
  const historicCases = useMemo(() => cases.filter((c) => c.type === 'historic'), [cases]);
  const ratCases = useMemo(() => cases.filter((c) => c.type === 'rat' || c.entity === 'rodent'), [cases]);
  const osintCases = useMemo(() => cases.filter((c) => c.type === 'osint'), [cases]);
  const dramaticCases = useMemo(
    () => cases.filter((c) => c.type === 'current' || c.type === 'passenger' || !c.type),
    [cases]
  );

  const markerScale = useMemo(() => Math.max(0.3, Math.min(2.5, viewState.zoom / 4)), [viewState.zoom]);

  const onCaseClick = useCallback((c: CaseData, opts?: { zoom?: number; pitch?: number }) => {
    setSelectedCase(c);
    setViewState((prev) => ({
      ...prev,
      longitude: c.lng,
      latitude: c.lat,
      zoom: opts?.zoom ?? 6,
      pitch: opts?.pitch ?? prev.pitch,
      transitionDuration: 1500,
    } as any));
  }, [setSelectedCase]);

  const resetView = useCallback(() => {
    setSelectedCase(null);
    setViewState({ ...RESET_VIEW, transitionDuration: 1500 } as any);
  }, [setSelectedCase]);

  const deckLayers = useMemo(() => {
    const layers: any[] = [];

    // OSINT chatter — density heatmap + individual pink picks.
    if (osintCases.length > 0) {
      layers.push(
        new HeatmapLayer({
          id: 'osint-heat',
          data: osintCases,
          getPosition: (d: CaseData) => [d.lng, d.lat],
          getWeight: (d: CaseData) => (d.isHighRisk ? 3 : 1),
          radiusPixels: 40,
          intensity: 1.2,
          threshold: 0.05,
          aggregation: 'SUM',
        })
      );
      layers.push(
        new ScatterplotLayer({
          id: 'osint-points',
          data: osintCases,
          pickable: true,
          getPosition: (d: CaseData) => [d.lng, d.lat],
          getRadius: 30000,
          radiusMinPixels: 4,
          radiusMaxPixels: 14,
          getFillColor: [255, 0, 170, 220],
          getLineColor: [255, 255, 255, 180],
          lineWidthMinPixels: 1,
          stroked: true,
          onClick: (info: any) => info.object && onCaseClick(info.object, { zoom: 5 }),
        })
      );
    }

    // Rodent reservoir signals — cyan dots.
    if (ratCases.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id: 'rodent-points',
          data: ratCases,
          pickable: true,
          getPosition: (d: CaseData) => [d.lng, d.lat],
          getRadius: 40000,
          radiusMinPixels: 5,
          radiusMaxPixels: 16,
          getFillColor: [125, 199, 255, 200],
          getLineColor: [255, 255, 255, 200],
          lineWidthMinPixels: 1,
          stroked: true,
          onClick: (info: any) => info.object && onCaseClick(info.object, { zoom: 6 }),
        })
      );
    }

    // Historic outbreaks — small gray dots.
    if (historicCases.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id: 'historic-points',
          data: historicCases,
          pickable: true,
          getPosition: (d: CaseData) => [d.lng, d.lat],
          getRadius: 20000,
          radiusMinPixels: 2,
          radiusMaxPixels: 8,
          getFillColor: [136, 136, 136, 200],
          getLineColor: [0, 0, 0, 200],
          lineWidthMinPixels: 1,
          stroked: true,
          onClick: (info: any) => info.object && onCaseClick(info.object, { zoom: 5 }),
        })
      );
    }

    // CDC NWSS wastewater — 3D columns with height proportional to detect proportion (0..100).
    if (wastewaterCases.length > 0) {
      layers.push(
        new ColumnLayer({
          id: 'wastewater-columns',
          data: wastewaterCases,
          pickable: true,
          diskResolution: 12,
          radius: 30000,
          extruded: true,
          getPosition: (d: CaseData) => [d.lng, d.lat],
          getElevation: (d: CaseData) => {
            const detect = d.metric?.detectProp ?? 25;
            // Map 0..100 → 50k..600k meters so even small signals are visible.
            return Math.max(50_000, Math.min(600_000, detect * 6_000));
          },
          getFillColor: (d: CaseData) => {
            const detect = d.metric?.detectProp ?? 25;
            // Teal at low detect → amber-red at high. RGB lerp.
            const t = Math.max(0, Math.min(1, detect / 100));
            const r = Math.round(0 + (255 - 0) * t);
            const g = Math.round(212 + (170 - 212) * t);
            const b = Math.round(170 + (0 - 170) * t);
            return [r, g, b, 220];
          },
          getLineColor: [10, 30, 30, 255],
          onClick: (info: any) => info.object && onCaseClick(info.object, { zoom: 5, pitch: 55 }),
        })
      );
    }

    return layers;
  }, [osintCases, ratCases, historicCases, wastewaterCases, onCaseClick]);

  const onMapLoad = (e: any) => {
    const map = e.target;
    // @ts-ignore - maplibre globe projection
    map.setProjection({ type: 'globe' });
  };

  const mapStyleUrl = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

  return (
    <div className="w-full h-full bg-[#050507] relative">
      <DeckGL
        layers={deckLayers}
        viewState={viewState as any}
        controller={true}
        onViewStateChange={(e: any) => setViewState(e.viewState)}
        getCursor={({ isDragging, isHovering }: { isDragging: boolean; isHovering: boolean }) =>
          isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab'
        }
      >
        <Map
          mapStyle={mapStyleUrl}
          onLoad={onMapLoad}
          reuseMaps
        >
          <NavigationControl position="bottom-right" />

          <Source type="geojson" data={trajectoryGeoJson}>
            <Layer
              id="trajectories"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 2,
                'line-opacity': 0.8,
                'line-dasharray': [2, 2]
              }}
            />
          </Source>

          {/* WHO Disease Outbreak News — pulsing gold authoritative rings at country centroids. */}
          {whoDonCases.map((c) => (
            <Marker
              key={c.id}
              longitude={c.lng}
              latitude={c.lat}
              className="z-20"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onCaseClick(c, { zoom: 4 });
              }}
            >
              <button
                type="button"
                aria-label={`WHO outbreak — ${c.title}`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCaseClick(c, { zoom: 4 }); } }}
                className="who-pulse relative flex items-center justify-center bg-transparent border-0 p-0 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd166] rounded-full"
                style={{ width: 28, height: 28 }}
              >
                <span className="who-pulse-ring absolute inset-0 rounded-full border-2 border-[#ffd166]" aria-hidden="true"></span>
                <span className="absolute inset-1 rounded-full bg-[#ffd166]/30 border border-[#ffd166]" aria-hidden="true"></span>
                <span className="relative w-2 h-2 rounded-full bg-[#ffd166]" aria-hidden="true"></span>
                <div className="absolute top-9 left-9 w-max bg-[#1a1a1f]/95 border border-[#ffd166] p-2 rounded-sm backdrop-blur-sm pointer-events-none opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity z-30">
                  <div className="text-[10px] font-mono text-[#ffd166] tracking-widest font-bold mb-1">WHO OUTBREAK · {c.geoLabel || ''}</div>
                  <div className="text-xs text-white font-bold max-w-[24ch] truncate">{c.title}</div>
                </div>
              </button>
            </Marker>
          ))}

          {/* Field cases — narrative biohazard treatment for confirmed/passenger. */}
          {dramaticCases.map((c) => (
            <Marker
              key={c.id}
              longitude={c.lng}
              latitude={c.lat}
              className="z-10"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onCaseClick(c, { zoom: 7, pitch: 45 });
              }}
            >
              <button
                type="button"
                aria-label={`Open case details for ${c.title}`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCaseClick(c, { zoom: 7, pitch: 45 }); } }}
                style={{ transform: `scale(${markerScale})` }}
                className="bg-transparent border-0 p-0 transition-all duration-75 flex flex-col items-center justify-center cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0000] rounded-full"
              >
                <SpinningBiohazard size={24} className="mb-1" label={c.type === 'passenger' ? 'Passenger vector indicator' : 'Primary locus indicator'} />
                <div className="absolute top-8 left-8 w-max bg-[#1a1a1f]/90 border border-[#ff0000] p-2 rounded-sm backdrop-blur-sm pointer-events-none opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity z-20">
                  <div className="text-[10px] font-mono text-[#ff4d4d] tracking-widest font-bold mb-1" style={{ transform: `scale(${1/markerScale})`, transformOrigin: 'top left' }}>{c.type === 'passenger' ? 'PASSENGER VECTOR' : 'PRIMARY LOCUS'}</div>
                  <div className="text-xs text-white font-bold" style={{ transform: `scale(${1/markerScale})`, transformOrigin: 'top left' }}>{c.title}</div>
                </div>
              </button>
            </Marker>
          ))}
        </Map>
      </DeckGL>

      {/* Reset view */}
      <div className="absolute top-6 left-6 z-20">
        <button
          type="button"
          onClick={resetView}
          className="text-[10px] uppercase tracking-widest font-mono bg-[#1a1a1f]/90 hover:bg-[#25252a] text-[#7dc7ff] border border-[#7dc7ff]/50 px-3 py-1.5 rounded-sm backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7dc7ff]"
        >
          ↺ Reset Global View
        </button>
      </div>

      {/* Map Overlay UI — counts + legend */}
      <div className="absolute top-6 right-6 z-10 pointer-events-none select-none">
        <div className="bg-[#1a1a1f]/85 backdrop-blur-md border border-[#2d2d30] p-4 rounded-sm shadow-2xl flex flex-col gap-3 min-w-[260px]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-[#808080] font-mono tracking-widest uppercase">Signal Layers</span>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" aria-hidden="true"></span>
          </div>

          {/* Legend with counts — researcher reads top-down: most authoritative → least */}
          <ul className="text-[10px] flex flex-col gap-2">
            <LegendRow swatch={<span className="w-3 h-3 rounded-full bg-[#ffd166] ring-2 ring-[#ffd166]/40" />} label="WHO Outbreak (confirmed)" count={whoDonCases.length} hint="country centroid · auth tier" />
            <LegendRow swatch={<span className="w-3 h-3 rounded-full bg-[#ff0000] shadow-[0_0_6px_rgba(255,0,0,0.7)]" />} label="Field Case / Passenger" count={dramaticCases.length} hint="exact lat/lng · biohazard" />
            <LegendRow swatch={<span className="w-3 h-2.5 bg-[#00d4aa] rounded-[1px]" />} label="Wastewater (NWSS)" count={wastewaterCases.length} hint="state · column height = detect %" />
            <LegendRow swatch={<span className="w-3 h-3 rounded-full bg-[#7dc7ff] border border-white/50" />} label="Rodent Reservoir" count={ratCases.length} hint="reservoir signal" />
            <LegendRow swatch={<span className="w-3 h-3 rounded-full bg-[#ff00aa] border border-white/40" />} label="OSINT Chatter" count={osintCases.length} hint="density heatmap · unverified" />
            <LegendRow swatch={<span className="w-3 h-3 rounded-full bg-[#888]" />} label="Historic" count={historicCases.length} hint="archived outbreaks" />
          </ul>

          <div className="mt-1 pt-2 border-t border-[#2d2d30] text-[9px] text-[#808080] uppercase tracking-wider leading-relaxed">
            Z {viewState.zoom.toFixed(1)} · Scale {markerScale.toFixed(1)}x
            <br/>
            Click any signal to open the case file.
          </div>
        </div>
      </div>

      {/* Marker pulse animation (used by WHO DON ring). Respects prefers-reduced-motion. */}
      <style>{`
        @keyframes who-pulse-anim {
          0%   { transform: scale(0.6); opacity: 0.9; }
          70%  { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .who-pulse-ring { animation: who-pulse-anim 2.2s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .who-pulse-ring { animation: none; opacity: 0.55; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function LegendRow({ swatch, label, count, hint }: { swatch: React.ReactNode; label: string; count: number; hint: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 flex w-4 justify-center" aria-hidden="true">{swatch}</span>
      <span className="flex-1">
        <span className="block text-white font-bold tracking-wide">{label} <span className="text-[#808080] font-mono">· {count}</span></span>
        <span className="block text-[#808080] uppercase tracking-widest text-[8px]">{hint}</span>
      </span>
    </li>
  );
}
