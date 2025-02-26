# Article Prioritization System Specification

## Overview
This specification outlines an intelligent article prioritization system for Readwise Reader that analyzes articles stored in MongoDB and ranks them based on multiple quality, relevance, and engagement metrics.

## Database Schema
The system works with the following MongoDB document structure:

```python
class Article(BaseModel):
    id: str = Field(default=None, alias="_id")
    readwise_id: str = Field(..., alias="id")
    url: str
    title: str
    author: str
    source: Optional[str] = None
    category: str
    location: str
    tags: Dict[str, Any] = Field(default_factory=dict)
    site_name: str
    word_count: int = Field(..., alias="word_count")
    created_at: datetime
    updated_at: datetime
    published_date: Optional[int] = Field(None, description="Unix timestamp in milliseconds")
    summary: Optional[str] = None
    image_url: Optional[str] = None
    content: Optional[str] = None
    source_url: Optional[str] = None
    notes: str = ""
    parent_id: Optional[str] = None
    reading_progress: float
    first_opened_at: Optional[datetime] = None
    last_opened_at: Optional[datetime] = None
    saved_at: datetime
    last_moved_at: datetime
```

## Core Functionality

### 1. Content Extraction
- Primary: Fetch and parse content from `source_url` using trafilatura
- Fallback 2: Use `content` field if available
- Fallback 3: Use `summary` field if no other content is accessible

### 2. Quality Assessment (25%)
Metrics to evaluate the inherent quality of the content:
- Citation presence: Detection of references like `[1]`, `(Smith, 2020)`
- Data inclusion: Presence of statistics, percentages, numerical facts
- Quote usage: Presence of quoted material and attributions
- Structural quality: Paragraph count, paragraph length, content organization
- Scale: 1-10 normalized score

### 3. Information Density (15%)
Metrics to evaluate how information-rich the content is:
- Lexical diversity: Unique words ratio
- Fact density: Proportion of sentences containing factual elements
- Concept density: Identification of key concepts and their occurrence patterns
- Scale: 1-10 normalized score

### 4. Readability Analysis (15%)
Metrics to evaluate reading complexity:
- Flesch Reading Ease
- SMOG Index
- Coleman-Liau Index
- Automated Readability Index
- Complexity classification: Basic, Intermediate, Advanced, Expert
- Scale: 1-10 normalized score

### 5. Topic Relevance (20%)
Metrics to evaluate relevance to user interests:
- Topic matching: Keyword-based matching against predefined interest areas
- Top topics: Identification of 3 most relevant topics per article
- Relevance scoring: Weighted scoring based on keyword density and importance
- Scale: 1-10 normalized score

### 6. Content Freshness (10%)
Metrics to evaluate timeliness:
- Age calculation: Based on `published_date` or fallback to `saved_at`
- Decay function: Time-based scoring with appropriate half-life
- Evergreen adjustment: Minimum threshold for timeless content
- Scale: 1-10 normalized score

### 7. Engagement Potential (15%)
Metrics to predict user engagement:
- Title analysis: Length, presence of questions, numbers, or colons
- Content structure: Short paragraph ratio, presence of bullet points
- Engagement patterns: Calls to action, questions in text, interactive elements
- Scale: 1-10 normalized score

## Priority Scoring Algorithm

The final priority score is calculated as a weighted sum of all component scores:

```
priority_score = (
    quality_score * 0.25 +
    info_density_score * 0.15 +
    readability_score * 0.15 +
    relevance_score * 0.20 +
    freshness_score * 0.10 +
    engagement_score * 0.15
) * 10  # Scale to 0-100 for easier interpretation
```

## Implementation Requirements

### Technical Stack
- python and mongo as it's used already in the project
- Content extraction: trafilatura, BeautifulSoup4
- Text analysis: textstat, NLTK or spaCy (optional)
- Data manipulation: pandas, numpy

### Module Structure
1. Database connector
2. Content extractor
3. Quality analyzer
4. Information density calculator
5. Readability analyzer 
6. Topic relevance engine
7. Freshness calculator
8. Engagement predictor
9. Priority scorer
10. Results reporter

### Processing Flow
1. Connect to MongoDB
2. Retrieve 10 random articles
3. For each article:
   - Extract content
   - Calculate all metrics
   - Compute component scores
   - Calculate final priority score
4. Sort articles by priority score
6. prepare consistent fast api endpoint similar to already existing ones, these articles will be shown by frontend (as it's already a case with other articles)

## Customization
The system should allow for:
- Adjustable weights for different metrics
- Configurable user interest profiles
- Tunable thresholds for different reading goals

## Output Format
For each article, the system should return at least (add things that we have in mongo, if it will help in presenting this data on frontend):
```json
{
  "article_id": "66d32ec67735929f1ca609af",
  "title": "Five Most Productive Years: What Happened and What's Next",
  "url": "https://read.readwise.io/read/01j6kycmvpav02e0qmwgbg7msd",
  "word_count": 14102,
  "priority_score": 87.5,
  "component_scores": {
    "quality": 8.7,
    "info_density": 9.2,
    "readability": 6.8,
    "relevance": 9.5,
    "freshness": 7.9,
    "engagement": 8.3
  }
}
```

## Performance Considerations
- Implement caching for extracted content
- Use parallel processing for article analysis
- Set appropriate timeouts for URL fetching
- Optimize MongoDB queries with proper indexing

This specification provides a comprehensive foundation for building an intelligent article prioritization system that will help manage large collections of Readwise Reader articles effectively.
