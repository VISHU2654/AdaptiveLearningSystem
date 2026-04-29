"""
Multi-Modal Learner Profiler

Aggregates demographic, behavioral, contextual, and implicit feedback data
into normalized, structured learner feature vectors.
"""
import numpy as np
from typing import Dict, List, Optional
from loguru import logger


# Encoding maps
SKILL_LEVEL_MAP = {"beginner": 0, "intermediate": 1, "advanced": 2}
CONTENT_TYPE_MAP = {"video": 0, "article": 1, "quiz": 2, "exercise": 3, "project": 4}
DIFFICULTY_MAP = {"beginner": 0, "intermediate": 1, "advanced": 2}


class MultiModalLearnerProfiler:
    """
    Builds normalized feature vectors for learners by aggregating:
    - Demographic features: skill_level (one-hot), learning_goals count
    - Behavioral features: interaction counts by type, avg time spent, completion rate
    - Contextual features: recency, preferred content types
    - Implicit feedback: view-to-complete ratio, bookmark patterns
    """

    FEATURE_DIM = 20  # Total feature vector dimension

    def build_profile(
        self,
        user: dict,
        interactions: List[dict],
    ) -> np.ndarray:
        """
        Build a normalized feature vector for a single learner.

        Args:
            user: dict with keys: skill_level, preferred_topics, learning_goals
            interactions: list of dicts with keys: interaction_type, time_spent_seconds,
                         completed, content_id, rating

        Returns:
            np.ndarray of shape (FEATURE_DIM,)
        """
        features = np.zeros(self.FEATURE_DIM, dtype=np.float32)

        # === Demographic features (indices 0-5) ===
        # Skill level one-hot (3 dims)
        skill_idx = SKILL_LEVEL_MAP.get(user.get("skill_level", "beginner"), 0)
        features[skill_idx] = 1.0

        # Number of preferred topics (normalized, index 3)
        n_topics = len(user.get("preferred_topics", []))
        features[3] = min(n_topics / 5.0, 1.0)

        # Number of learning goals (normalized, index 4)
        n_goals = len(user.get("learning_goals", []))
        features[4] = min(n_goals / 5.0, 1.0)

        # Has learning goals flag (index 5)
        features[5] = 1.0 if n_goals > 0 else 0.0

        if not interactions:
            return features

        # === Behavioral features (indices 6-12) ===
        type_counts = {"view": 0, "click": 0, "complete": 0, "bookmark": 0, "rate": 0}
        total_time = 0
        time_count = 0
        ratings = []

        for inter in interactions:
            itype = inter.get("interaction_type", "view")
            if itype in type_counts:
                type_counts[itype] += 1
            ts = inter.get("time_spent_seconds")
            if ts and ts > 0:
                total_time += ts
                time_count += 1
            r = inter.get("rating")
            if r is not None:
                ratings.append(r)

        total_interactions = max(sum(type_counts.values()), 1)

        # Interaction type ratios (indices 6-10)
        for i, itype in enumerate(["view", "click", "complete", "bookmark", "rate"]):
            features[6 + i] = type_counts[itype] / total_interactions

        # Average time spent (normalized to 0-1 range, index 11)
        avg_time = (total_time / time_count) if time_count > 0 else 0
        features[11] = min(avg_time / 3600.0, 1.0)  # Normalize by 1 hour

        # Average rating given (normalized, index 12)
        features[12] = (np.mean(ratings) / 5.0) if ratings else 0.5

        # === Contextual features (indices 13-16) ===
        # Completion rate (index 13)
        n_completed = type_counts["complete"]
        n_started = type_counts["view"] + type_counts["click"]
        features[13] = (n_completed / max(n_started, 1))

        # Total interaction volume (normalized, index 14)
        features[14] = min(total_interactions / 50.0, 1.0)

        # Bookmark-to-view ratio (index 15)
        features[15] = type_counts["bookmark"] / max(type_counts["view"], 1)

        # Engagement depth: complete / (view + click) ratio (index 16)
        shallow = type_counts["view"] + type_counts["click"]
        features[16] = n_completed / max(shallow, 1)

        # === Implicit feedback features (indices 17-19) ===
        # Unique content items interacted with (normalized, index 17)
        unique_items = len(set(i.get("content_id", 0) for i in interactions))
        features[17] = min(unique_items / 30.0, 1.0)

        # Rate-to-complete ratio (index 18) — high means user rates what they finish
        features[18] = type_counts["rate"] / max(n_completed, 1)

        # Activity consistency (index 19) — proxy: total interactions / unique items
        features[19] = min(total_interactions / max(unique_items, 1) / 5.0, 1.0)

        return features

    def build_profiles_batch(
        self,
        users: List[dict],
        interactions_by_user: Dict[int, List[dict]],
    ) -> Dict[int, np.ndarray]:
        """Build profiles for multiple users."""
        profiles = {}
        for user in users:
            uid = user["id"]
            user_interactions = interactions_by_user.get(uid, [])
            profiles[uid] = self.build_profile(user, user_interactions)
        logger.info(f"Built {len(profiles)} learner profiles (dim={self.FEATURE_DIM})")
        return profiles
