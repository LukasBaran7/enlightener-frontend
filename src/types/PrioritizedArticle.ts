import { Article } from './Article';

export interface ComponentScores {
  quality: number;
  information_density: number;
  readability: number;
  topic_relevance: number;
  freshness: number;
  engagement_potential: number;
}

export interface PrioritizedArticle extends Article {
  priority_score: number;
  component_scores: ComponentScores;
} 