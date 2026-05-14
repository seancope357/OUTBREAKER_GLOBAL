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
  isHighRisk?: boolean;
  type?: 'historic' | 'current' | 'passenger';
}

export interface NewsFeedItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  date: string;
  trusted: boolean;
  source: string;
  imageUrl?: string;
  category?: 'MAINSTREAM' | 'RAW_DATA' | 'INDEPENDENT';
}
