export type SourceType = 'authoritative' | 'osint' | 'movement' | 'social' | 'vector' | 'rodent';
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface FeedHealth {
  status: 'healthy' | 'degraded' | 'offline';
  lastUpdated: string;
  message: string;
}

export interface CaseData {
  id: string;
  lat: number;
  lng: number;
  size: number;
  color: string;
  title: string;
  description: string;
  date: string;
  source: string;
  sourceUrl?: string;
  sourceType?: SourceType;
  confidenceLevel?: ConfidenceLevel;
  entity?: 'human' | 'rodent' | 'vector';
  isHighRisk?: boolean;
  type?: 'historic' | 'current' | 'passenger' | 'osint' | 'rat';
}

export interface NewsFeedItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  date: string;
  trusted: boolean;
  source: string;
  sourceType?: SourceType;
  confidenceLevel?: ConfidenceLevel;
  imageUrl?: string;
  category?: 'MAINSTREAM' | 'RAW_DATA' | 'INDEPENDENT';
}
