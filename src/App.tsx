/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, useEffect, useState } from 'react';
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
    <div className="flex flex-col md:flex-row w-full h-screen bg-[#0a0a0c] text-[#e0e0e0] overflow-hidden font-sans select-none">
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
  );
}
