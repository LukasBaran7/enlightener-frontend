export interface Article {
  _id: string;
  id: string;
  url: string;
  title: string;
  author: string | null;
  source: string | null;
  category: string;
  location: string;
  tags: Record<string, any>;
  site_name: string | null;
  word_count: number;
  created_at: string;
  updated_at: string;
  published_date: number;
  summary: string | null;
  image_url: string | null;
  content: string | null;
  source_url: string;
  notes: string;
  parent_id: string | null;
  reading_progress: number;
  first_opened_at: string | null;
  last_opened_at: string | null;
  saved_at: string;
  last_moved_at: string;
  shortlisted?: boolean;
}

// Add helper type for reading distribution
export interface DayStats {
  dayName: string;
  count: number;
}

// Add helper function to calculate reading time
export function calculateReadingTime(wordCount: number | null): string {
  if (wordCount === null || wordCount === undefined) {
    return 'Unknown reading time';
  }
  
  const WORDS_PER_MINUTE = 200;
  const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE);
  
  if (minutes < 1) {
    return '< 1 min read';
  } else if (minutes === 1) {
    return '1 min read';
  } else {
    return `${minutes} min read`;
  }
} 