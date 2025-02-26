import { PrioritizedArticle } from './PrioritizedArticle';

export interface LlmComponentScores {
  information_density: number;
  practical_value: number;
  depth_of_analysis: number;
  uniqueness: number;
  longevity: number;
}

export interface LlmAnalyzedArticle extends PrioritizedArticle {
  analyzed_at: string;
  llm_score: number;
  llm_analysis: string;
  llm_component_scores: LlmComponentScores;
  llm_recommendation: string;
} 