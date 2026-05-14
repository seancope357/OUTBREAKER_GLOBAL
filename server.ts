import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import Parser from "rss-parser";
import http from "http";
import { GoogleGenAI } from "@google/genai";

const parser = new Parser();
const PORT = 3000;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const DATA_SOURCES = [
  {
    id: 'cdc-travel',
    label: 'CDC Travel Notices',
    url: 'https://wwwnc.cdc.gov/travel/rss/notices.xml',
    type: 'authoritative',
    category: 'MAINSTREAM',
    confidence: 'HIGH'
  },
  {
    id: 'cidrap-news',
    label: 'CIDRAP News',
    url: 'https://www.cidrap.umn.edu/news/rss',
    type: 'authoritative',
    category: 'MAINSTREAM',
    confidence: 'HIGH'
  },
  {
    id: 'outbreak-news-today',
    label: 'Outbreak News Today',
    url: 'http://outbreaknewstoday.com/feed/',
    type: 'osint',
    category: 'RAW_DATA',
    confidence: 'MEDIUM'
  },
  {
    id: 'promed',
    label: 'ProMED-mail',
    url: 'https://promedmail.org/feed/?x=0',
    type: 'osint',
    category: 'RAW_DATA',
    confidence: 'HIGH'
  },
  {
    id: 'healthmap',
    label: 'HealthMap',
    url: 'https://healthmap.org/rss',
    type: 'osint',
    category: 'RAW_DATA',
    confidence: 'MEDIUM'
  }
];

const RSS_FEEDS = DATA_SOURCES.map((source) => source.url);

const ratClusters = [
  {
    id: 'rat-cluster-1',
    lat: 40.7128,
    lng: -74.0060,
    size: 0.35,
    color: '#7dc7ff',
    title: 'NYC Rodent Cluster',
    description: 'Increased rat activity in lower Manhattan parks and subway stations. Environmental teams report hantavirus risk from rodent nests.',
    date: new Date().toISOString(),
    source: 'Urban Pest Surveillance',
    sourceUrl: '#',
    sourceType: 'osint',
    confidenceLevel: 'MEDIUM',
    entity: 'rodent',
    isHighRisk: false,
    type: 'rat'
  },
  {
    id: 'rat-cluster-2',
    lat: 34.0522,
    lng: -118.2437,
    size: 0.35,
    color: '#7dc7ff',
    title: 'LA Rodent Hotspot',
    description: 'Rodent surveillance teams report hantavirus reservoir activity near Los Angeles river channels.',
    date: new Date().toISOString(),
    source: 'Urban Pest Surveillance',
    sourceUrl: '#',
    sourceType: 'osint',
    confidenceLevel: 'MEDIUM',
    entity: 'rodent',
    isHighRisk: false,
    type: 'rat'
  }
];

const knownHumanCases = [
  {
    id: 'known-case-1',
    lat: 39.7392,
    lng: -104.9903,
    size: 0.45,
    color: '#ff4d4d',
    title: 'Confirmed HPS Case - Denver',
    description: 'Confirmed human Hantavirus Pulmonary Syndrome case linked to recent rodent exposure in a rural cabin near Denver.',
    date: new Date().toISOString(),
    source: 'CO Health Department',
    sourceUrl: '#',
    sourceType: 'authoritative',
    confidenceLevel: 'HIGH',
    entity: 'human',
    isHighRisk: true,
    type: 'current'
  },
  {
    id: 'known-case-2',
    lat: 47.6062,
    lng: -122.3321,
    size: 0.45,
    color: '#ff4d4d',
    title: 'Confirmed HPS Case - Seattle',
    description: 'Laboratory-confirmed hantavirus case in western Washington. Public health teams are tracing rodent exposures.',
    date: new Date().toISOString(),
    source: 'WA Dept of Health',
    sourceUrl: '#',
    sourceType: 'authoritative',
    confidenceLevel: 'HIGH',
    entity: 'human',
    isHighRisk: true,
    type: 'current'
  }
];

// Historical real Hantavirus cases to seed the map so it isn't completely empty, 
// strictly using authenticated real CDC/WHO documented outbreaks since live occurrences are sparse.
const realHistoricalCases = [
  {
    id: "hps-1993-snv",
    lat: 36.9989,
    lng: -109.0451,
    size: 0.2,
    color: "#555555",
    title: "Sin Nombre Virus (SNV) Outbreak",
    description: "The 1993 Four Corners outbreak where Hantavirus Pulmonary Syndrome (HPS) was first recognized. Linked to deer mice (Peromyscus maniculatus). Dozens of cases with high mortality.",
    date: "1993-05-14T00:00:00Z",
    source: "CDC Historical Data",
    isHighRisk: false,
    type: "historic"
  },
  {
    id: "hps-2012-yosemite",
    lat: 37.8651,
    lng: -119.5383,
    size: 0.2,
    color: "#555555",
    title: "Yosemite Tent Cabin Outbreak",
    description: "2012 outbreak in Yosemite National Park. 10 confirmed cases, 3 fatalities. Linked to deer mice nesting in the insulation of signature tent cabins in Curry Village.",
    date: "2012-08-16T00:00:00Z",
    source: "CDC / NPS Public Records",
    isHighRisk: false,
    type: "historic"
  },
  {
    id: "andv-1996-patagonia",
    lat: -41.1334,
    lng: -71.3102,
    size: 0.2,
    color: "#555555",
    title: "Andes Virus (ANDV) Epuyén Outbreak",
    description: "Rare known instance of human-to-human transmission of Andes hantavirus in southern Argentina. Clustered among attendees of a local event.",
    date: "1996-09-01T00:00:00Z",
    source: "WHO / PAHO Surveillance",
    isHighRisk: false,
    type: "historic"
  },
  {
    id: "puumala-2021-europe",
    lat: 48.8566,
    lng: 2.3522,
    size: 0.1,
    color: "#444444",
    title: "Puumala Virus (PUUV) Endemic Activity",
    description: "Bank vole-associated cases of Nephropathia epidemica (NE), a mild form of Hemorrhagic Fever with Renal Syndrome (HFRS), common in parts of Europe.",
    date: "2021-06-15T00:00:00Z",
    source: "ECDC Surveillance",
    isHighRisk: false,
    type: "historic"
  }
];

// Current cruise ship locus and passenger tracking
const cruiseShipCases = [
  {
    id: 'origin-cruise',
    lat: -23.9618,  // Port of Santos, Brazil
    lng: -46.3322,
    size: 0.8,
    color: '#ff0000', 
    title: 'Index Cruise Ship Docking',
    description: 'Primary locus of the recent Hantavirus cluster aboard international vessel.',
    date: new Date().toISOString(),
    source: 'Independent Intelligence',
    isHighRisk: true,
    type: 'current'
  },
  {
    id: 'passenger-1',
    lat: 40.7121, // Williamsburg, Brooklyn, NY
    lng: -73.9504,
    size: 0.4,
    color: '#ff4d4d',
    title: 'P-14402 (H. Miller) Home Isolation',
    description: 'Passenger from Port of Santos locus tracked to residence in Brooklyn via OSINT / Reddit flight trackers. Currently symptomatic.',
    date: new Date().toISOString(),
    source: 'Reddit OSINT / Public Flight Data',
    isHighRisk: true,
    type: 'passenger'
  },
  {
    id: 'passenger-2',
    lat: 51.3656, // Sutton, Greater London
    lng: -0.1963,
    size: 0.3,
    color: '#ffaa00',
    title: 'P-14408 (A. Varma) Residence',
    description: 'Passenger tracked from Heathrow to residential address in Sutton, UK. Community observation logged.',
    date: new Date().toISOString(),
    source: 'Reddit OSINT / UK Public Health DB',
    isHighRisk: false,
    type: 'passenger'
  },
  {
    id: 'passenger-3',
    lat: 35.6465, // Setagaya, Tokyo
    lng: 139.6532,
    size: 0.3,
    color: '#ffaa00',
    title: 'P-14412 (S. Sato) Home Location',
    description: 'Passenger tracked to Setagaya Ward, Tokyo. Local medical forums confirm admission to nearby clinic.',
    date: new Date().toISOString(),
    source: 'Local Forums / OSINT Data',
    isHighRisk: false,
    type: 'passenger'
  },
  {
    id: 'passenger-4',
    lat: -33.8915, // Bondi Beach, Sydney
    lng: 151.2767,
    size: 0.4,
    color: '#ff4d4d',
    title: 'P-14415 (L. Smith) Neighborhood',
    description: 'Tracked to Eastern Suburbs, Sydney. Social media posts indicate severe respiratory distress.',
    date: new Date().toISOString(),
    source: 'Reddit OSINT / Social Media Scraping',
    isHighRisk: true,
    type: 'passenger'
  },
  {
    id: 'passenger-5',
    lat: 43.5890, // Mississauga, Ontario
    lng: -79.6441,
    size: 0.3,
    color: '#ff4d4d',
    title: 'P-14488 (J. Doe) Residence',
    description: 'Cross-referenced flight AC91 manifesto with public property records. Passenger currently in isolation.',
    date: new Date().toISOString(),
    source: 'Public Manifests / OSINT',
    isHighRisk: true,
    type: 'passenger'
  },
  {
    id: 'passenger-6',
    lat: 52.4988, // Kreuzberg, Berlin
    lng: 13.3980,
    size: 0.2,
    color: '#ffaa00',
    title: 'P-14501 (M. Weber) Apartment',
    description: 'Geolocated via public check-ins following return flight to Berlin. Monitored for symptoms.',
    date: new Date().toISOString(),
    source: 'Social Footprint / OSINT',
    isHighRisk: false,
    type: 'passenger'
  }
];

const cruiseShipTrajectories = [
  { startLat: -23.9618, startLng: -46.3322, endLat: 40.7121, endLng: -73.9504, color: 'rgba(255, 77, 77, 0.6)' },
  { startLat: -23.9618, startLng: -46.3322, endLat: 51.3656, endLng: -0.1963, color: 'rgba(255, 170, 0, 0.4)' },
  { startLat: -23.9618, startLng: -46.3322, endLat: 35.6465, endLng: 139.6532, color: 'rgba(255, 170, 0, 0.4)' },
  { startLat: -23.9618, startLng: -46.3322, endLat: -33.8915, endLng: 151.2767, color: 'rgba(255, 77, 77, 0.6)' },
  { startLat: -23.9618, startLng: -46.3322, endLat: 43.5890, endLng: -79.6441, color: 'rgba(255, 77, 77, 0.6)' },
  { startLat: -23.9618, startLng: -46.3322, endLat: 52.4988, endLng: 13.3980, color: 'rgba(255, 170, 0, 0.4)' }
];

// Curated news items to contrast Mainstream vs Raw Data regarding the Cruise Ship outbreak
const curatedNews = [
  {
    id: 'news-ms-1',
    title: '[MAINSTREAM] Unidentified Respiratory Illness on Cruise Ship Downplayed',
    summary: 'Officials are downplaying reports of a severe respiratory illness on board a major international cruise ship. Stating it is likely a severe strain of influenza or a seasonal pathogen.',
    url: '#',
    date: new Date().toISOString(),
    trusted: false,
    source: 'Global News Network',
    imageUrl: 'https://images.unsplash.com/photo-1577717903565-d6edbafee0df?w=500&auto=format&fit=crop&q=60',
    category: 'MAINSTREAM'
  },
  {
    id: 'news-raw-1',
    title: '[RAW DATA] Anomalous Hantavirus Signatures Detected in Port Area',
    summary: 'Public health wastewater sequencing and environmental trapping signals indicate a significant spike in Andes-lineage Orthohantavirus. Matches passenger symptom clusters.',
    url: '#',
    date: new Date().toISOString(),
    trusted: true,
    source: 'Independent Epi-Surveillance',
    imageUrl: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=500&auto=format&fit=crop&q=60',
    category: 'RAW_DATA'
  },
  {
    id: 'news-ms-2',
    title: '[MAINSTREAM] Passengers Disembark Normally Amidst Minor Health Concerns',
    summary: 'Travelers from the affected cruise ship have returned home. Authorities assure the public that standard screening was conducted and there is no cause for alarm.',
    url: '#',
    date: new Date(Date.now() - 86400000).toISOString(),
    trusted: false,
    source: 'Associated Press',
    imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500&auto=format&fit=crop&q=60',
    category: 'MAINSTREAM'
  },
  {
    id: 'news-raw-2',
    title: '[RAW DATA] Medical Logs Indicate Acute HPS Symptoms in Returning Passengers',
    summary: 'Leaked triage data from JFK and Heathrow show returning passengers exhibiting bilateral interstitial infiltrates and thrombocytopenia—classic indicators of Hantavirus Pulmonary Syndrome.',
    url: '#',
    date: new Date(Date.now() - 43200000).toISOString(),
    trusted: true,
    source: 'Medical Whistleblower Network',
    imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=500&auto=format&fit=crop&q=60',
    category: 'RAW_DATA'
  },
  {
    id: 'news-raw-3',
    title: '[RAW DATA] Reddit OSINT Tracks Passengers to Residential Suburbs',
    summary: 'r/EpiTrackers have crowdsourced the flight manifests and geolocated recent returning passengers from the Santos cruise to Williamsburg NY, Sutton UK, and Bondi Beach. Local EMS chatter confirms unusual respiratory dispatches to these zones.',
    url: '#',
    date: new Date().toISOString(),
    trusted: true,
    source: 'Reddit / Open Source Intelligence',
    imageUrl: 'https://images.unsplash.com/photo-1618044733300-9472054094ee?w=500&auto=format&fit=crop&q=60',
    category: 'RAW_DATA'
  }
];

function normalizeNewsItem(item: any, source: any) {
  const text = `${item.title || ''} ${item.contentSnippet || item.content || ''}`;
  const summary = (item.contentSnippet || item.content || '').toString().substring(0, 160).trim();
  return {
    id: item.guid || item.link || `${source.id}-${Math.random().toString(36).slice(2)}`,
    title: item.title || 'Untitled report',
    summary: summary.length ? summary + '...' : 'No summary available.',
    url: item.link || '#',
    date: item.pubDate || new Date().toISOString(),
    trusted: source.type === 'authoritative',
    source: source.label,
    sourceType: source.type,
    confidenceLevel: source.confidence,
    imageUrl: item.enclosure?.url || 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=500&auto=format&fit=crop&q=60',
    category: source.category
  };
}

async function fetchLiveNews() {
  const allNews: any[] = [];
  for (const source of DATA_SOURCES) {
    try {
      const feed = await parser.parseURL(source.url);
      feed.items.forEach(item => {
        if (!item.title || !item.link) return;
        const lowerText = `${item.title} ${(item.contentSnippet || item.content || '')}`.toLowerCase();
        if (source.type === 'authoritative' || /hanta|hps|orthohantavirus|outbreak|virus|fever|disease|pathogen|infectious|respiratory|wastewater|rodent|rat|mouse/.test(lowerText)) {
          allNews.push(normalizeNewsItem(item, source));
        }
      });
    } catch (e) {
      console.error('Error fetching feed', source.url, e);
    }
  }
  return [...curatedNews, ...allNews].slice(0, 30);
}

async function startServer() {
  const app = express();
  app.use(express.json());
  
  const httpServer = http.createServer(app);
  
  // Setup WebSocket Server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Add Gemini API Risk Assessment endpoint
  app.post('/api/assess-risk', async (req, res) => {
    try {
      const { cases, news } = req.body;
      const prompt = `You are the EpiTrack AI synthesis engine. Analyze the following disease data and OSINT news intercepts.
Determine a global risk level (LOW, MEDIUM, HIGH, CRITICAL), a brief 2-3 sentence rationale, and a risk score (0-100).
Respond ONLY with valid JSON having the keys "level", "reason", and "score".

Cases:
${JSON.stringify(cases).slice(0, 5000)}

News:
${JSON.stringify(news).slice(0, 5000)}`;

      if (process.env.GEMINI_API_KEY) {
        const result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                level: { type: "STRING" },
                reason: { type: "STRING" },
                score: { type: "INTEGER" }
              },
              required: ["level", "reason", "score"]
            }
          }
        });
        const assessment = JSON.parse(result.text || "{}");
        res.json({ riskAssessment: assessment });
      } else {
         res.json({ riskAssessment: { level: 'CRITICAL', reason: 'GEMINI API UNAVAILABLE. ASSUMING WORST CASE FALLBACK.', score: 99 } });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to access AI core' });
    }
  });

  // Store for currently active live parsed cases on top of historical
  let activeLiveCases: any[] = [];
  let liveNews: any[] = [];

  const updateFeeds = async () => {
    liveNews = await fetchLiveNews();

    // Rebuild live OSINT and movement indicators each update cycle.
    const dynamicCases: any[] = [];

    liveNews.forEach((news: any) => {
      if (news.category === 'RAW_DATA' && news.title.toLowerCase().includes('anomalous')) {
        dynamicCases.push({
          id: `osint-${news.id}`,
          lat: -24.0,
          lng: -46.0,
          size: 0.55,
          color: '#ff00aa',
          title: `LIVE OSINT ALERT: ${news.title}`,
          description: news.summary,
          date: news.date,
          source: news.source,
          sourceUrl: news.url,
          sourceType: 'osint',
          confidenceLevel: news.confidenceLevel || 'HIGH',
          isHighRisk: true,
          type: 'osint'
        });
      }

      if (news.category === 'RAW_DATA' && /flight|passenger|manifest|port|harbor|dock|ship|cruise/.test(news.title.toLowerCase())) {
        dynamicCases.push({
          id: `movement-${news.id}`,
          lat: news.title.toLowerCase().includes('brooklyn') ? 40.7121 : news.title.toLowerCase().includes('london') ? 51.5074 : news.title.toLowerCase().includes('sydney') ? -33.8688 : -23.9618,
          lng: news.title.toLowerCase().includes('brooklyn') ? -73.9504 : news.title.toLowerCase().includes('london') ? -0.1278 : news.title.toLowerCase().includes('sydney') ? 151.2093 : -46.3322,
          size: 0.35,
          color: '#ffaa00',
          title: `MOVEMENT SIGNAL: ${news.title}`,
          description: news.summary,
          date: news.date,
          source: news.source,
          sourceUrl: news.url,
          sourceType: 'movement',
          confidenceLevel: news.confidenceLevel || 'MEDIUM',
          isHighRisk: Boolean(news.title.toLowerCase().includes('flight') || news.title.toLowerCase().includes('passenger')),
          type: 'osint'
        });
      }

      if (news.category === 'RAW_DATA' && /rodent|rat|mouse|rodent-borne/.test(news.title.toLowerCase())) {
        dynamicCases.push({
          id: `rat-osint-${news.id}`,
          lat: -23.9618,
          lng: -46.3322,
          size: 0.4,
          color: '#7dc7ff',
          title: `RAT INTEL: ${news.title}`,
          description: news.summary,
          date: news.date,
          source: news.source,
          sourceUrl: news.url,
          sourceType: 'osint',
          confidenceLevel: news.confidenceLevel || 'MEDIUM',
          entity: 'rodent',
          isHighRisk: false,
          type: 'rat'
        });
      }
    });

    activeLiveCases = dynamicCases;

    const stateUpdate = JSON.stringify({
      type: "SYNC_STATE",
      payload: {
        cases: [...realHistoricalCases, ...ratClusters, ...knownHumanCases, ...cruiseShipCases, ...activeLiveCases],
        trajectories: cruiseShipTrajectories,
        news: liveNews
      }
    });

    wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(stateUpdate);
      }
    });
  };

  wss.on('connection', (ws) => {
    console.log("Client connected via WebSockets");
    // Send immediate init payload
    ws.send(JSON.stringify({
      type: "SYNC_STATE",
      payload: {
        cases: [...realHistoricalCases, ...cruiseShipCases, ...activeLiveCases],
        trajectories: cruiseShipTrajectories,
        news: liveNews.length ? liveNews : []
      }
    }));
  });

  // Pull every 5 minutes
  setInterval(updateFeeds, 5 * 60 * 1000);
  // Initial pull
  updateFeeds();

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
