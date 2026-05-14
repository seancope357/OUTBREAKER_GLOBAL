import { useEffect, useRef, useState, useMemo } from 'react';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore } from '../store/useStore';
import * as turf from '@turf/turf';
import { SpinningBiohazard } from './BiohazardMarker';

export default function GlobeView() {
  const cases = useStore((state) => state.cases);
  const trajectories = useStore((state) => state.trajectories);
  const setSelectedCase = useStore((state) => state.setSelectedCase);
  const [viewState, setViewState] = useState({
    longitude: -40,
    latitude: -10,
    zoom: 2,
    pitch: 45,
    bearing: 0
  });

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

  const historicCases = useMemo(() => cases.filter((c: any) => c.type === 'historic'), [cases]);
  const currentCases = useMemo(() => cases.filter((c: any) => c.type === 'current' || c.type === 'passenger' || c.type === 'osint' || !c.type), [cases]);
  const ratCases = useMemo(() => cases.filter((c: any) => c.type === 'rat' || c.entity === 'rodent'), [cases]);
  const osintCases = useMemo(() => cases.filter((c: any) => c.type === 'osint'), [cases]);

  // Calculate dynamic scale factor based on zoom
  const markerScale = useMemo(() => Math.max(0.3, Math.min(2.5, viewState.zoom / 4)), [viewState.zoom]);

  const onMapLoad = (e: any) => {
    const map = e.target;
    // @ts-ignore
    map.setProjection({ type: 'globe' });
  };

  const mapStyleUrl = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

  return (
    <div className="w-full h-full bg-[#050507] relative">
      <DeckGL
        layers={[]}
        viewState={viewState as any}
        controller={true}
        onViewStateChange={(e: any) => setViewState(e.viewState)}
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

          {/* Historic Cases */}
          {historicCases.map((c: any) => (
            <Marker
              key={c.id}
              longitude={c.lng}
              latitude={c.lat}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedCase(c);
                setViewState((prev) => ({ ...prev, longitude: c.lng, latitude: c.lat, zoom: 5, transitionDuration: 1500 }));
              }}
            >
              <div style={{ transform: `scale(${markerScale})` }} className="w-2 h-2 bg-[#555] rounded-full border border-black cursor-pointer hover:bg-white transition-all duration-75"></div>
            </Marker>
          ))}

          {/* Current Cases */}
          {currentCases.map((c: any) => (
            <Marker
              key={c.id}
              longitude={c.lng}
              latitude={c.lat}
              className="z-10"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedCase(c);
                setViewState((prev) => ({ ...prev, longitude: c.lng, latitude: c.lat, zoom: 7, pitch: 45, transitionDuration: 1500 }));
              }}
            >
              <div style={{ transform: `scale(${markerScale})` }} className="transition-all duration-75 flex flex-col items-center justify-center cursor-pointer group">
                <SpinningBiohazard size={24} className="mb-1" />
                <div className="absolute top-8 left-8 w-max bg-[#1a1a1f]/90 border border-[#ff0000] p-2 rounded-sm backdrop-blur-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <div className="text-[10px] font-mono text-[#ff4d4d] tracking-widest font-bold mb-1" style={{ transform: `scale(${1/markerScale})`, transformOrigin: 'top left' }}>{c.type === 'passenger' ? 'PASSENGER VECTOR' : 'PRIMARY LOCUS'}</div>
                  <div className="text-xs text-white font-bold" style={{ transform: `scale(${1/markerScale})`, transformOrigin: 'top left' }}>{c.title}</div>
                </div>
              </div>
            </Marker>
          ))}

          {/* Rat / Rodent Clusters */}
          {ratCases.map((c: any) => (
            <Marker
              key={c.id}
              longitude={c.lng}
              latitude={c.lat}
              className="z-10"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedCase(c);
                setViewState((prev) => ({ ...prev, longitude: c.lng, latitude: c.lat, zoom: 6, transitionDuration: 1500 }));
              }}
            >
              <div style={{ transform: `scale(${markerScale})` }} className="transition-all duration-75 flex flex-col items-center justify-center cursor-pointer group">
                <div className="w-6 h-6 rounded-full bg-[#7dc7ff]/90 border-2 border-white shadow-[0_0_16px_rgba(125,199,255,0.55)]"></div>
                <div className="absolute top-8 left-8 w-max bg-[#0f172a]/90 border border-[#7dc7ff] p-2 rounded-sm backdrop-blur-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <div className="text-[10px] font-mono text-[#7dc7ff] tracking-widest font-bold mb-1" style={{ transform: `scale(${1/markerScale})`, transformOrigin: 'top left' }}>RODENT CLUSTER</div>
                  <div className="text-xs text-white font-bold" style={{ transform: `scale(${1/markerScale})`, transformOrigin: 'top left' }}>{c.title}</div>
                </div>
              </div>
            </Marker>
          ))}
        </Map>
      </DeckGL>

      {/* Map Overlay UI */}
      <div className="absolute top-6 right-6 z-10 pointer-events-none">
        <div className="bg-[#1a1a1f]/80 backdrop-blur-md border border-[#2d2d30] p-4 rounded-sm shadow-2xl flex flex-col gap-3 min-w-[240px]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-[#808080] font-mono tracking-widest uppercase">Global Filter</span>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-[#0f0f12] border border-[#2d2d30] rounded-sm p-2">
              <div className="text-[#808080] uppercase tracking-widest text-[8px]">Historic</div>
              <div className="font-bold text-[#888]">{historicCases.length}</div>
            </div>
            <div className="bg-[#0f0f12] border border-[#2d2d30] rounded-sm p-2">
              <div className="text-[#808080] uppercase tracking-widest text-[8px]">Live</div>
              <div className="font-bold text-[#ff4d4d]">{currentCases.length}</div>
            </div>
            <div className="bg-[#0f0f12] border border-[#2d2d30] rounded-sm p-2">
              <div className="text-[#808080] uppercase tracking-widest text-[8px]">OSINT</div>
              <div className="font-bold text-[#7dc7ff]">{osintCases.length}</div>
            </div>
            <div className="bg-[#0f0f12] border border-[#2d2d30] rounded-sm p-2">
              <div className="text-[#808080] uppercase tracking-widest text-[8px]">Rodent Signals</div>
              <div className="font-bold text-[#7dc7ff]">{ratCases.length}</div>
            </div>
            <div className="bg-[#0f0f12] border border-[#2d2d30] rounded-sm p-2">
              <div className="text-[#808080] uppercase tracking-widest text-[8px]">Scale</div>
              <div className="font-bold text-[#ffaa00]">{markerScale.toFixed(1)}x</div>
            </div>
          </div>

          <div className="mt-2 text-[9px] text-[#808080] uppercase tracking-wider leading-relaxed">
            * 3D animated pin proxies active.<br/>
            * Hover items for locus intel.<br/>
            * Zoom scaling handled via Deck.gl.
          </div>
        </div>
      </div>
    </div>
  );
}
