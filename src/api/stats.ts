const BASE_API_URL = import.meta.env.VITE_API_URL + '/reader';

interface DailyCount {
  date: string;
  count: number;
}

interface ReadingCounts {
  archived_count: number;
  later_count: number;
}

interface StatsResponse {
  total_counts: ReadingCounts;
  daily_counts: {
    archived: DailyCount[];
    later: DailyCount[];
  }
}

export async function fetchDailyCounts() {
  try {
    const response = await fetch(`${BASE_API_URL}/stats`);

    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }

    const data = await response.json() as StatsResponse;
    
    return {
      readCounts: data.daily_counts.archived,
      savedCounts: data.daily_counts.later,
      totalCounts: data.total_counts
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
} 