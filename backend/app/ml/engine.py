"""
Hybrid Deep Learning Recommendation Engine (HDLRS)

Orchestrates all recommendation modules:
  - Autoencoder (dense representations)
  - DeepFM (feature interactions)
  - NCF (collaborative filtering)
  - Content-Based Filter (TF-IDF similarity)
  - Knowledge-Based Filter (ontology / prerequisites)

Uses Dynamic Ensemble Fusion with Engagement Predictor to
combine outputs via softmax-weighted rank fusion.
"""
import os
import pickle
from typing import Dict, List, Optional, Set, Tuple

import numpy as np
from loguru import logger

from app.config import settings
from app.ml.autoencoder import AutoencoderModule
from app.ml.deepfm import DeepFMModule
from app.ml.ncf import NCFModule
from app.ml.content_based import ContentBasedFilter
from app.ml.knowledge_based import KnowledgeBasedFilter
from app.ml.engagement import EngagementPredictor
from app.ml.fusion import DynamicEnsembleFusion
from app.ml.profiler import MultiModalLearnerProfiler


class HybridRecommendationEngine:
    """
    HDLRS orchestrator that manages all recommendation modules,
    the engagement predictor, the dynamic fusion layer, and the
    multi-modal learner profiler.
    """

    def __init__(self):
        # Sub-modules
        self.autoencoder = AutoencoderModule()
        self.deepfm = DeepFMModule()
        self.ncf = NCFModule()
        self.content_based = ContentBasedFilter()
        self.knowledge_based = KnowledgeBasedFilter()
        self.engagement_predictor = EngagementPredictor()
        self.fusion = DynamicEnsembleFusion(self.engagement_predictor)
        self.profiler = MultiModalLearnerProfiler()

        # Mappings
        self.user_id_map: Dict[int, int] = {}  # db_user_id -> matrix_idx
        self.item_id_map: Dict[int, int] = {}  # db_content_id -> matrix_idx
        self.reverse_item_map: Dict[int, int] = {}  # matrix_idx -> db_content_id
        self.reverse_user_map: Dict[int, int] = {}  # matrix_idx -> db_user_id
        self.n_users: int = 0
        self.n_items: int = 0

        # Interaction matrix for autoencoder scoring
        self.interaction_matrix: Optional[np.ndarray] = None

        # Content metadata cache
        self.content_cache: List[dict] = []

        self._loaded = False

    def is_model_loaded(self) -> bool:
        """Check if trained models are available."""
        return self._loaded

    def predict(
        self,
        db_user_id: int,
        num_items: int = 10,
        user_data: Optional[dict] = None,
        user_interactions: Optional[List[dict]] = None,
        completed_ids: Optional[Set[int]] = None,
    ) -> Tuple[List[int], Optional[Dict[str, float]]]:
        """
        Generate top-N recommendations through the full HDLRS pipeline.

        Args:
            db_user_id: database user ID
            num_items: number of recommendations to return
            user_data: dict with skill_level, preferred_topics, learning_goals
            user_interactions: list of user's interaction dicts
            completed_ids: set of content IDs the user has completed

        Returns:
            (list of content_ids, dict of module_weights)
        """
        if not self._loaded:
            return [], None

        user_data = user_data or {}
        user_interactions = user_interactions or []
        completed_ids = completed_ids or set()

        # --- Build user profile ---
        profile = self.profiler.build_profile(user_data, user_interactions)

        # User features for engagement predictor: [skill_norm, n_interactions_norm, completion_rate]
        skill_idx = {"beginner": 0, "intermediate": 1, "advanced": 2}.get(
            user_data.get("skill_level", "beginner"), 0
        )
        n_inter = len(user_interactions)
        n_complete = sum(1 for i in user_interactions if i.get("interaction_type") == "complete")
        user_features = [
            skill_idx / 2.0,
            min(n_inter / 50.0, 1.0),
            n_complete / max(n_inter, 1),
        ]

        # All content IDs to rank
        all_content_ids = [c["id"] for c in self.content_cache]

        # --- Run each module ---
        module_rankings: Dict[str, List[int]] = {}
        module_confidences: Dict[str, float] = {}

        # 1. Autoencoder
        ae_ranking, ae_conf = self._run_autoencoder(db_user_id, all_content_ids, completed_ids)
        module_rankings["autoencoder"] = ae_ranking
        module_confidences["autoencoder"] = ae_conf

        # 2. DeepFM
        dfm_ranking, dfm_conf = self._run_deepfm(user_data, all_content_ids, completed_ids)
        module_rankings["deepfm"] = dfm_ranking
        module_confidences["deepfm"] = dfm_conf

        # 3. NCF
        ncf_ranking, ncf_conf = self._run_ncf(db_user_id, all_content_ids, completed_ids)
        module_rankings["ncf"] = ncf_ranking
        module_confidences["ncf"] = ncf_conf

        # 4. Content-Based
        cb_ranking, cb_conf = self._run_content_based(user_data, user_interactions, completed_ids)
        module_rankings["content_based"] = cb_ranking
        module_confidences["content_based"] = cb_conf

        # 5. Knowledge-Based
        kb_ranking, kb_conf = self._run_knowledge_based(user_data, completed_ids)
        module_rankings["knowledge_based"] = kb_ranking
        module_confidences["knowledge_based"] = kb_conf

        # --- Dynamic Ensemble Fusion ---
        final_ids, weights = self.fusion.fuse(
            module_rankings, module_confidences, user_features, top_n=num_items
        )

        return final_ids, weights

    def _run_autoencoder(
        self, db_user_id: int, all_ids: List[int], completed: Set[int]
    ) -> Tuple[List[int], float]:
        """Run autoencoder module and return ranked IDs + confidence."""
        if not self.autoencoder.trained or db_user_id not in self.user_id_map:
            return all_ids[:20], 0.3

        user_idx = self.user_id_map[db_user_id]
        user_row = self.interaction_matrix[user_idx]
        scores = self.autoencoder.score(user_row)

        # Map back to content IDs, filter completed
        scored_items = []
        for item_idx in range(len(scores)):
            cid = self.reverse_item_map.get(item_idx)
            if cid and cid not in completed:
                scored_items.append((cid, scores[item_idx]))

        scored_items.sort(key=lambda x: x[1], reverse=True)
        ranked = [cid for cid, _ in scored_items[:20]]
        confidence = float(np.mean(scores)) if len(scores) > 0 else 0.3
        return ranked, min(confidence, 1.0)

    def _run_deepfm(
        self, user_data: dict, all_ids: List[int], completed: Set[int]
    ) -> Tuple[List[int], float]:
        """Run DeepFM module."""
        if not self.deepfm.trained:
            return [cid for cid in all_ids if cid not in completed][:20], 0.3

        content_list = [c for c in self.content_cache if c["id"] not in completed]
        if not content_list:
            return [], 0.3

        scores = self.deepfm.score(
            user_data.get("skill_level", "beginner"),
            content_list,
            user_data.get("preferred_topics", []),
            user_data.get("learning_goals", []),
        )

        scored_items = list(zip([c["id"] for c in content_list], scores))
        scored_items.sort(key=lambda x: x[1], reverse=True)
        ranked = [cid for cid, _ in scored_items[:20]]
        confidence = float(np.mean(scores))
        return ranked, min(confidence, 1.0)

    def _run_ncf(
        self, db_user_id: int, all_ids: List[int], completed: Set[int]
    ) -> Tuple[List[int], float]:
        """Run NCF module."""
        if not self.ncf.trained or db_user_id not in self.user_id_map:
            return [cid for cid in all_ids if cid not in completed][:20], 0.3

        user_idx = self.user_id_map[db_user_id]
        # Score all items
        item_indices = []
        item_cids = []
        for cid in all_ids:
            if cid not in completed and cid in self.item_id_map:
                item_indices.append(self.item_id_map[cid])
                item_cids.append(cid)

        if not item_indices:
            return [], 0.3

        scores = self.ncf.score(user_idx, np.array(item_indices))
        scored_items = list(zip(item_cids, scores))
        scored_items.sort(key=lambda x: x[1], reverse=True)
        ranked = [cid for cid, _ in scored_items[:20]]
        confidence = float(np.mean(scores))
        return ranked, min(confidence, 1.0)

    def _run_content_based(
        self, user_data: dict, user_interactions: List[dict], completed: Set[int]
    ) -> Tuple[List[int], float]:
        """Run content-based filter."""
        if not self.content_based.trained:
            return [], 0.3

        # Get content for interactions user completed/bookmarked
        interacted_content = [
            c for c in self.content_cache
            if c["id"] in {i.get("content_id") for i in user_interactions}
        ]

        scores = self.content_based.score(
            user_data.get("preferred_topics", []),
            user_data.get("learning_goals", []),
            interacted_content,
        )

        scored_items = [
            (cid, s) for cid, s in scores.items() if cid not in completed
        ]
        scored_items.sort(key=lambda x: x[1], reverse=True)
        ranked = [cid for cid, _ in scored_items[:20]]
        confidence = float(np.mean([s for _, s in scored_items])) if scored_items else 0.3
        return ranked, min(confidence, 1.0)

    def _run_knowledge_based(
        self, user_data: dict, completed: Set[int]
    ) -> Tuple[List[int], float]:
        """Run knowledge-based filter."""
        if not self.knowledge_based.trained:
            return [], 0.3

        scores = self.knowledge_based.score(
            user_data.get("skill_level", "beginner"),
            user_data.get("learning_goals", []),
            completed,
        )

        # Filter completed, normalize scores
        scored_items = [
            (cid, s) for cid, s in scores.items() if cid not in completed
        ]
        scored_items.sort(key=lambda x: x[1], reverse=True)
        ranked = [cid for cid, _ in scored_items[:20]]

        # Normalize confidence to 0-1
        if scored_items:
            max_s = max(s for _, s in scored_items)
            min_s = min(s for _, s in scored_items)
            spread = max_s - min_s if max_s != min_s else 1.0
            confidence = float((np.mean([s for _, s in scored_items]) - min_s) / spread)
        else:
            confidence = 0.3

        return ranked, min(max(confidence, 0.0), 1.0)

    def save_model(self, path: Optional[str] = None) -> None:
        """Serialize all models and data to disk."""
        path = path or settings.MODEL_PATH
        os.makedirs(os.path.dirname(path), exist_ok=True)

        data = {
            "autoencoder": self.autoencoder,
            "deepfm": self.deepfm,
            "ncf": self.ncf,
            "content_based": self.content_based,
            "knowledge_based": self.knowledge_based,
            "engagement_predictor": self.engagement_predictor,
            "user_id_map": self.user_id_map,
            "item_id_map": self.item_id_map,
            "reverse_user_map": self.reverse_user_map,
            "reverse_item_map": self.reverse_item_map,
            "n_users": self.n_users,
            "n_items": self.n_items,
            "interaction_matrix": self.interaction_matrix,
            "content_cache": self.content_cache,
        }
        with open(path, "wb") as f:
            pickle.dump(data, f)
        logger.info(f"HDLRS model saved to {path}")

    def load_model(self, path: Optional[str] = None) -> bool:
        """Load all models from disk."""
        path = path or settings.MODEL_PATH
        if not os.path.exists(path):
            logger.warning(f"No saved model at {path}")
            return False

        try:
            with open(path, "rb") as f:
                data = pickle.load(f)

            self.autoencoder = data["autoencoder"]
            self.deepfm = data["deepfm"]
            self.ncf = data["ncf"]
            self.content_based = data["content_based"]
            self.knowledge_based = data["knowledge_based"]
            self.engagement_predictor = data["engagement_predictor"]
            self.user_id_map = data["user_id_map"]
            self.item_id_map = data["item_id_map"]
            self.reverse_user_map = data["reverse_user_map"]
            self.reverse_item_map = data["reverse_item_map"]
            self.n_users = data["n_users"]
            self.n_items = data["n_items"]
            self.interaction_matrix = data["interaction_matrix"]
            self.content_cache = data["content_cache"]

            # Rebuild fusion with loaded engagement predictor
            self.fusion = DynamicEnsembleFusion(self.engagement_predictor)

            self._loaded = True
            logger.info(
                f"HDLRS model loaded: {self.n_users} users, {self.n_items} items, "
                f"modules: AE={self.autoencoder.trained}, DeepFM={self.deepfm.trained}, "
                f"NCF={self.ncf.trained}, CB={self.content_based.trained}, "
                f"KB={self.knowledge_based.trained}"
            )
            return True
        except Exception as e:
            logger.error(f"Failed to load HDLRS model: {e}")
            return False


# Global singleton
recommendation_engine = HybridRecommendationEngine()
