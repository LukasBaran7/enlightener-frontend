import { Article } from '../types/Article';

const API_URL = import.meta.env.VITE_API_URL + '/reader/articles?days=14&sort_by=updated_at&order=desc';

export async function fetchArticles(): Promise<Article[]> {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching articles:', error);
    throw error;
  }
} 