import { create } from 'zustand';
import { CaseData, NewsFeedItem } from '../types';

export interface TrajectoryData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
}

interface AppState {
  cases: CaseData[];
  news: NewsFeedItem[];
  trajectories: TrajectoryData[];
  selectedCase: CaseData | null;
  alertsEnabled: boolean;
  isConnected: boolean;
  feedHealth: {
    status: 'healthy' | 'degraded' | 'offline';
    lastUpdated: string;
    message: string;
  };
  setCases: (cases: CaseData[]) => void;
  setNews: (news: NewsFeedItem[]) => void;
  setTrajectories: (trajectories: TrajectoryData[]) => void;
  setSelectedCase: (c: CaseData | null) => void;
  setAlertsEnabled: (enabled: boolean) => void;
  setIsConnected: (connected: boolean) => void;
  setFeedHealth: (health: { status: 'healthy' | 'degraded' | 'offline'; lastUpdated: string; message: string }) => void;
}

export const useStore = create<AppState>((set) => ({
  cases: [],
  news: [],
  trajectories: [],
  selectedCase: null,
  alertsEnabled: true,
  isConnected: false,
  feedHealth: { status: 'offline', lastUpdated: new Date().toISOString(), message: 'Awaiting feed status.' },
  setCases: (cases) => set({ cases }),
  setNews: (news) => set({ news }),
  setTrajectories: (trajectories) => set({ trajectories }),
  setSelectedCase: (selectedCase) => set({ selectedCase }),
  setAlertsEnabled: (alertsEnabled) => set({ alertsEnabled }),
  setIsConnected: (isConnected) => set({ isConnected }),
  setFeedHealth: (feedHealth) => set({ feedHealth }),
}));

// Initialize WebSocket Sync
let ws: WebSocket | null = null;

export const connectWebSocket = () => {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = process.env.NODE_ENV === 'production' 
    ? `${protocol}//${window.location.host}/ws`
    // In dev on AI Studio, everything goes through port 3000 mapping
    : `${protocol}//${window.location.host}/ws`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    useStore.getState().setIsConnected(true);
    console.log("WebSocket connected to Intelligence Sync");
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'SYNC_STATE') {
        const payload = data.payload;
        if (payload.cases) useStore.getState().setCases(payload.cases);
        if (payload.news) useStore.getState().setNews(payload.news);
        if (payload.trajectories) useStore.getState().setTrajectories(payload.trajectories);
        if (payload.feedHealth) useStore.getState().setFeedHealth(payload.feedHealth);
      }
    } catch (err) {
      console.error("Failed to parse WS data", err);
    }
  };

  ws.onclose = () => {
    useStore.getState().setIsConnected(false);
    console.log("WebSocket disconnected. Retrying in 5s...");
    setTimeout(connectWebSocket, 5000);
  };

  ws.onerror = (error) => {
    console.error("WebSocket error", error);
    ws?.close();
  };
};
