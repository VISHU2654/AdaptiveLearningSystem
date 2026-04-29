"""
Dynamic Ensemble Fusion Layer

Dynamically adjusts the weights of different recommendation modules
based on real-time engagement signals. Uses softmax over confidence
scores to compute valid probability distributions, then applies
Weighted Rank Fusion to produce the final ranked recommendation list.
"""
import numpy as np
from typing import Dict, List, Optional, Tuple
from loguru import logger

from app.ml.engagement import EngagementPredictor


class DynamicEnsembleFusion:
    """
    Fusion layer that combines outputs from all recommendation modules.

    Process:
    1. Receive ranked lists + confidence scores from each module
    2. Feed confidence scores + user features to EngagementPredictor
    3. Apply softmax to get module probability weights
    4. Weighted Rank Fusion: final_score(item) = Σ(weight_i × (1/rank_in_module_i))
    5. Return top-N items sorted by fused score
    """

    # Module order
    MODULE_NAMES = ["autoencoder", "deepfm", "ncf", "content_based", "knowledge_based"]

    def __init__(self, engagement_predictor: EngagementPredictor):
        self.engagement_predictor = engagement_predictor

    def fuse(
        self,
        module_rankings: Dict[str, List[int]],
        module_confidences: Dict[str, float],
        user_features: List[float],
        top_n: int = 10,
    ) -> Tuple[List[int], Dict[str, float]]:
        """
        Fuse ranked lists from all modules into a single final ranking.

        Args:
            module_rankings: dict of module_name -> list of content_ids (ranked)
            module_confidences: dict of module_name -> confidence score (0-1)
            user_features: [skill_level_norm, n_interactions_norm, completion_rate]
            top_n: number of items to return

        Returns:
            (final_ranked_content_ids, module_weights_dict)
        """
        # 1. Get confidence scores in order
        confidence_list = [
            module_confidences.get(name, 0.5) for name in self.MODULE_NAMES
        ]

        # 2. Predict module weights via engagement predictor (includes softmax)
        weights = self.engagement_predictor.predict_weights(
            confidence_list, user_features
        )

        weight_dict = {
            name: round(float(w), 4) for name, w in zip(self.MODULE_NAMES, weights)
        }

        logger.debug(f"Ensemble weights: {weight_dict}")

        # 3. Weighted Rank Fusion
        item_scores: Dict[int, float] = {}

        for module_idx, module_name in enumerate(self.MODULE_NAMES):
            module_weight = weights[module_idx]
            ranked_items = module_rankings.get(module_name, [])

            for rank, content_id in enumerate(ranked_items, start=1):
                # Reciprocal rank weighted by module importance
                score = module_weight * (1.0 / rank)
                if content_id in item_scores:
                    item_scores[content_id] += score
                else:
                    item_scores[content_id] = score

        # 4. Sort by fused score descending
        sorted_items = sorted(item_scores.items(), key=lambda x: x[1], reverse=True)
        final_ids = [item_id for item_id, _ in sorted_items[:top_n]]

        logger.info(
            f"Fusion complete: {len(item_scores)} unique items → top {len(final_ids)}"
        )

        return final_ids, weight_dict
