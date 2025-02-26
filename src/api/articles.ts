import { Article } from '../types/Article';
import { PrioritizedArticle } from '../types/PrioritizedArticle';
import { LlmAnalyzedArticle } from '../types/LlmAnalyzedArticle';

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

export async function shortlistArticle(articleId: string): Promise<void> {
  try {
    const response = await fetch(`${BASE_API_URL}/articles/${articleId}/shortlist`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error shortlisting article:', error);
    throw error;
  }
}

export async function fetchPrioritizedArticles(): Promise<{
  articles: PrioritizedArticle[];
  metadata: {
    total_processed: number;
    min_score: number;
    max_score: number;
    returned_count: number;
  };
}> {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/prioritization/sample`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching prioritized articles:', error);
    throw error;
  }
}

export async function fetchLowPriorityArticles(
  minAgeDays: number = 1095
): Promise<{
  articles: PrioritizedArticle[];
  metadata: {
    total_processed: number;
    returned_count: number;
    criteria: {
      min_age_days: number;
    };
  };
}> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/prioritization/low-priority?min_age_days=${minAgeDays}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching low priority articles:', error);
    throw error;
  }
}

export async function fetchLlmRecommendedArticles(): Promise<{
  articles: LlmAnalyzedArticle[];
  count: number;
}> {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/prioritization/llm-sample`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching LLM recommended articles:', error);
    throw error;
  }
}

export async function fetchLlmArchiveCandidates(): Promise<{
  articles: LlmAnalyzedArticle[];
  count: number;
}> {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/prioritization/llm-archive`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching LLM archive candidates:', error);
    throw error;
  }
} 