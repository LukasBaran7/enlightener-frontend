import { Article } from '../types/Article';

const BASE_API_URL = import.meta.env.VITE_API_URL + '/reader';
const ARTICLES_API_URL = `${BASE_API_URL}/articles?days=14&sort_by=updated_at&order=desc`;
const RANDOM_ARTICLES_API_URL = `${BASE_API_URL}/random-later`;

export async function fetchArticles(): Promise<Article[]> {
  try {
    const response = await fetch(ARTICLES_API_URL);
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

export async function fetchRandomArticles(): Promise<Article[]> {
  try {
    const response = await fetch(RANDOM_ARTICLES_API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching random articles:', error);
    throw error;
  }
}

export async function archiveArticle(articleId: string): Promise<void> {
  try {
    const response = await fetch(`${BASE_API_URL}/articles/${articleId}/archive`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error archiving article:', error);
    throw error;
  }
} 