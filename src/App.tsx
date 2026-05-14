/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, useEffect } from 'react';
import { FluentProvider, webDarkTheme, Button } from '@fluentui/react-components';
import Sidebar from './components/Sidebar';
import CaseModal from './components/CaseModal';
import RightPanel from './components/RightPanel';
import { connectWebSocket } from './store/useStore';

const GlobeView = lazy(() => import('./components/GlobeView'));

export default function App() {
  useEffect(() => {
    connectWebSocket();
  }, []);

  return (
    <FluentProvider theme={webDarkTheme}>
      <div className="flex flex-col md:flex-row w-full h-screen bg-[#0a0a0c] text-[#e0e0e0] overflow-hidden font-sans select-none">
        <div className="absolute inset-x-0 top-0 z-20 pointer-events-none">
          <div className="mx-auto max-w-[1800px] px-4 py-2 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-[#7c7c7c]">
            <span>Hantavirus Rat & Case Threat Matrix</span>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[#2d2d30] bg-[#111111]/80 px-2 py-1 text-[#7dc7ff]">Live Intelligence Feed</span>
              <Button appearance="secondary" size="small" onClick={() => connectWebSocket()}>
                Refresh Feed
              </Button>
            </div>
          </div>
        </div>

      <Sidebar />
      <Suspense fallback={
        <div className="flex-1 h-full flex items-center justify-center bg-[#0a0a0c] text-[#808080] font-mono text-xs uppercase tracking-widest">
          INITIALIZING GEOSPATIAL RENDERER...
        </div>
      }>
        <div className="flex-1 h-[50vh] md:h-screen relative border-r border-l border-[#2d2d30]">
           <GlobeView />
        </div>
      </Suspense>
      <RightPanel />
      <CaseModal />
    </div>
    </FluentProvider>
  );
}
