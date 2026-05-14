export type SourceType = 'authoritative' | 'osint' | 'movement' | 'social';
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

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
  isHighRisk?: boolean;
  type?: 'historic' | 'current' | 'passenger' | 'osint';
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
