"""
Knowledge-Based Filtering Module

Ensures recommendations align with a learner's educational objectives
and prerequisites. Uses a pre-defined course ontology (prerequisite graph)
to map educational prerequisites and match content learning objectives
against learner goals.
"""
from typing import Dict, List, Set
from loguru import logger


class KnowledgeBasedFilter:
    """
    Knowledge-based filtering using course ontology and prerequisites.

    Scoring logic:
      +3 if content's learning_objectives match user's learning_goals
      +2 if all prerequisites are met (user has completed them)
      -5 if prerequisites are NOT met (user hasn't completed required content)
      +1 bonus for difficulty alignment with skill level
    """

    DIFFICULTY_ORDER = {"beginner": 0, "intermediate": 1, "advanced": 2}

    def __init__(self):
        self.content_map: Dict[int, dict] = {}  # content_id -> content dict
        self.trained = False

    def train(self, content_list: List[dict]) -> None:
        """
        Build the course ontology from content metadata.

        Args:
            content_list: list of content dicts with id, prerequisites,
                         learning_objectives, difficulty, topics, skills_taught
        """
        self.content_map = {c["id"]: c for c in content_list}
        self.trained = True
        n_with_prereqs = sum(
            1 for c in content_list if c.get("prerequisites")
        )
        logger.info(
            f"Knowledge-based filter built: {len(content_list)} items, "
            f"{n_with_prereqs} with prerequisites"
        )

    def score(
        self,
        user_skill_level: str,
        user_learning_goals: List[str],
        completed_content_ids: Set[int],
    ) -> Dict[int, float]:
        """
        Score all content items based on ontology alignment.

        Args:
            user_skill_level: "beginner", "intermediate", or "advanced"
            user_learning_goals: list of goal strings
            completed_content_ids: set of content IDs the user has completed

        Returns:
            dict mapping content_id -> score
        """
        if not self.trained:
            return {}

        user_level = self.DIFFICULTY_ORDER.get(user_skill_level, 0)
        goal_set = set(g.lower().strip() for g in user_learning_goals)
        scores = {}

        for cid, content in self.content_map.items():
            score = 0.0

            # --- Prerequisite check ---
            prereqs = content.get("prerequisites", [])
            if prereqs:
                met = all(pid in completed_content_ids for pid in prereqs)
                if met:
                    score += 2.0  # Prerequisites satisfied
                else:
                    score -= 5.0  # Prerequisites NOT met — penalize heavily
            else:
                score += 1.0  # No prerequisites = accessible

            # --- Learning objectives alignment ---
            objectives = content.get("learning_objectives", [])
            if objectives and goal_set:
                obj_set = set(o.lower().strip() for o in objectives)
                overlap = len(obj_set & goal_set)
                if overlap > 0:
                    score += 3.0 * (overlap / max(len(obj_set), 1))

            # --- Difficulty alignment ---
            content_level = self.DIFFICULTY_ORDER.get(
                content.get("difficulty", "beginner"), 0
            )
            level_diff = abs(content_level - user_level)
            if level_diff == 0:
                score += 1.0  # Perfect match
            elif level_diff == 1:
                # One step up is good (slight challenge)
                if content_level == user_level + 1:
                    score += 0.5
                else:
                    score += 0.0  # One step below — less useful
            else:
                score -= 1.0  # Too far from current level

            # --- Topic relevance bonus ---
            content_topics = set(content.get("topics", []))
            skills = set(content.get("skills_taught", []))
            combined = content_topics | skills
            if goal_set and combined:
                topic_overlap = len(combined & goal_set) / max(len(combined), 1)
                score += topic_overlap * 1.5

            scores[cid] = score

        return scores
