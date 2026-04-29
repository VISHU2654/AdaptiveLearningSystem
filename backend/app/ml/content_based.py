"""
Content-Based Filtering Module

Recommends items based on the similarity between user preferences
and content attributes. Uses TF-IDF alongside word embeddings
(approximated via TF-IDF on combined text) to compute text similarity.
"""
import numpy as np
from typing import Dict, List, Optional, Set
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from loguru import logger


class ContentBasedFilter:
    """
    Content-based filtering using TF-IDF vectors and cosine similarity.

    Builds TF-IDF matrix from content descriptions and metadata,
    then computes similarity between a user's preference profile
    (aggregated from topics, skills, and interaction history) and
    each content item's feature vector.
    """

    def __init__(self):
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.tfidf_matrix: Optional[np.ndarray] = None
        self.content_ids: List[int] = []
        self.trained = False

    def _build_content_text(self, content: dict) -> str:
        """Combine content fields into a single text for TF-IDF."""
        parts = []

        # Title (high weight — repeat it)
        title = content.get("title", "")
        parts.append(title)
        parts.append(title)

        # Description
        desc = content.get("description", "")
        parts.append(desc)

        # Topics (repeated for emphasis)
        topics = content.get("topics", [])
        parts.extend(topics)
        parts.extend(topics)

        # Skills taught
        skills = content.get("skills_taught", [])
        parts.extend(skills)

        # Content type and difficulty
        parts.append(content.get("content_type", ""))
        parts.append(content.get("difficulty", ""))

        # Learning objectives
        objectives = content.get("learning_objectives", [])
        parts.extend(objectives)

        return " ".join(parts)

    def _build_user_profile_text(
        self,
        preferred_topics: List[str],
        learning_goals: List[str],
        interacted_content: List[dict],
    ) -> str:
        """Build a text profile for the user from their preferences and history."""
        parts = []

        # Preferred topics (high weight)
        parts.extend(preferred_topics * 3)

        # Learning goals
        parts.extend(learning_goals * 2)

        # Topics and skills from content they completed/bookmarked
        for c in interacted_content:
            parts.extend(c.get("topics", []))
            parts.extend(c.get("skills_taught", []))

        return " ".join(parts)

    def train(self, content_list: List[dict]) -> None:
        """
        Build TF-IDF matrix from all content items.

        Args:
            content_list: list of content dicts with title, description, topics, etc.
        """
        if not content_list:
            logger.warning("No content to build TF-IDF from")
            return

        self.content_ids = [c["id"] for c in content_list]
        texts = [self._build_content_text(c) for c in content_list]

        self.vectorizer = TfidfVectorizer(
            max_features=5000,
            stop_words="english",
            ngram_range=(1, 2),
            sublinear_tf=True,
        )
        self.tfidf_matrix = self.vectorizer.fit_transform(texts)
        self.trained = True
        logger.info(
            f"Content-based filter trained: {len(content_list)} items, "
            f"{self.tfidf_matrix.shape[1]} features"
        )

    def score(
        self,
        preferred_topics: List[str],
        learning_goals: List[str],
        interacted_content: List[dict],
    ) -> Dict[int, float]:
        """
        Score all content items based on similarity to user profile.

        Returns:
            dict mapping content_id -> similarity score
        """
        if not self.trained or self.vectorizer is None:
            return {}

        # Build user profile text
        profile_text = self._build_user_profile_text(
            preferred_topics, learning_goals, interacted_content
        )

        if not profile_text.strip():
            return {cid: 0.5 for cid in self.content_ids}

        # Transform user profile through the same TF-IDF vectorizer
        user_vec = self.vectorizer.transform([profile_text])

        # Compute cosine similarity
        similarities = cosine_similarity(user_vec, self.tfidf_matrix).flatten()

        scores = {}
        for idx, cid in enumerate(self.content_ids):
            scores[cid] = float(similarities[idx])

        return scores
