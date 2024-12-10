const BASE_API_URL = import.meta.env.VITE_API_URL + '/reader';

interface DailyCount {
  date: string;
  count: number;
}

interface ReadingCounts {
  archived_count: number;
  later_count: number;
}

export async function fetchDailyCounts() {
  try {
    const [readResponse, savedResponse, countsResponse] = await Promise.all([
      fetch(`${BASE_API_URL}/articles/daily-counts`),
      fetch(`${BASE_API_URL}/later/daily-counts`),
      fetch(`${BASE_API_URL}/counts`)
    ]);

    if (!readResponse.ok || !savedResponse.ok || !countsResponse.ok) {
      throw new Error('Failed to fetch counts');
    }

    return {
      readCounts: await readResponse.json() as DailyCount[],
      savedCounts: await savedResponse.json() as DailyCount[],
      totalCounts: await countsResponse.json() as ReadingCounts
    };
  } catch (error) {
    console.error('Error fetching daily counts:', error);
    throw error;
  }
} 