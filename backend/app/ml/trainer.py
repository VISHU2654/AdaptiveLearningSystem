"""
HDLRS Training Pipeline

Full training pipeline that:
1. Fetches all interactions, content, and users from the database
2. Builds multi-modal learner profiles
3. Trains Autoencoder on interaction matrix
4. Trains DeepFM on feature-interaction pairs
5. Trains NCF on user-item positive/negative pairs
6. Builds TF-IDF matrix for content-based filter
7. Builds ontology graph for knowledge-based filter
8. Trains EngagementPredictor on historical module performance
9. Saves all models to disk
"""
import time
from typing import Dict, List, Set, Tuple

import numpy as np
from sqlalchemy import create_engine, text
from loguru import logger

from app.config import settings
from app.ml.engine import HybridRecommendationEngine


def fetch_all_data_sync() -> Tuple[List[dict], List[dict], List[dict]]:
    """Fetch interactions, content, and users from the database synchronously."""
    engine = create_engine(settings.SYNC_DATABASE_URL)

    with engine.connect() as conn:
        # Interactions
        result = conn.execute(
            text(
                "SELECT id, user_id, content_id, interaction_type, rating, "
                "time_spent_seconds, completed FROM interactions"
            )
        )
        interactions = [
            {
                "id": row[0],
                "user_id": row[1],
                "content_id": row[2],
                "interaction_type": row[3],
                "rating": row[4],
                "time_spent_seconds": row[5],
                "completed": row[6],
            }
            for row in result.fetchall()
        ]

        # Content
        result = conn.execute(
            text(
                "SELECT id, title, description, content_type, difficulty, "
                "topics, skills_taught, prerequisites, learning_objectives, "
                "duration_minutes, author, rating FROM content WHERE is_published = true"
            )
        )
        content = [
            {
                "id": row[0],
                "title": row[1],
                "description": row[2] or "",
                "content_type": row[3],
                "difficulty": row[4],
                "topics": row[5] or [],
                "skills_taught": row[6] or [],
                "prerequisites": row[7] or [],
                "learning_objectives": row[8] or [],
                "duration_minutes": row[9],
                "author": row[10],
                "rating": row[11],
            }
            for row in result.fetchall()
        ]

        # Users
        result = conn.execute(
            text(
                "SELECT id, skill_level, preferred_topics, learning_goals FROM users"
            )
        )
        users = [
            {
                "id": row[0],
                "skill_level": row[1],
                "preferred_topics": row[2] or [],
                "learning_goals": row[3] or [],
            }
            for row in result.fetchall()
        ]

    engine.dispose()
    logger.info(
        f"Fetched {len(interactions)} interactions, {len(content)} content, "
        f"{len(users)} users"
    )
    return interactions, content, users


def _build_interaction_matrix(
    interactions: List[dict],
    user_id_map: Dict[int, int],
    item_id_map: Dict[int, int],
    n_users: int,
    n_items: int,
) -> np.ndarray:
    """Build a dense interaction matrix (users × items) with weighted values."""
    matrix = np.zeros((n_users, n_items), dtype=np.float32)

    weight_map = {
        "complete": 5.0,
        "bookmark": 3.0,
        "click": 1.0,
        "view": 0.5,
    }

    for inter in interactions:
        uid = inter["user_id"]
        cid = inter["content_id"]
        if uid not in user_id_map or cid not in item_id_map:
            continue

        u_idx = user_id_map[uid]
        i_idx = item_id_map[cid]
        itype = inter["interaction_type"]

        if itype == "rate" and inter.get("rating"):
            weight = float(inter["rating"])
        else:
            weight = weight_map.get(itype, 0.5)

        matrix[u_idx, i_idx] = max(matrix[u_idx, i_idx], weight)

    return matrix


def _build_deepfm_training_data(
    interactions: List[dict],
    users: List[dict],
    content: List[dict],
) -> List[dict]:
    """Build feature-interaction training samples for DeepFM."""
    user_map = {u["id"]: u for u in users}
    content_map = {c["id"]: c for c in content}
    training_data = []

    # Positive samples from interactions
    seen_pairs = set()
    for inter in interactions:
        uid = inter["user_id"]
        cid = inter["content_id"]
        pair = (uid, cid)
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)

        user = user_map.get(uid)
        cont = content_map.get(cid)
        if not user or not cont:
            continue

        u_topics = set(user.get("preferred_topics", []))
        c_topics = set(cont.get("topics", []))
        u_skills = set(user.get("learning_goals", []))
        c_skills = set(cont.get("skills_taught", []))

        topics_overlap = len(u_topics & c_topics) / max(len(u_topics | c_topics), 1)
        skills_overlap = len(u_skills & c_skills) / max(len(u_skills | c_skills), 1)

        # Label: 1 for completions/bookmarks, 0.5 for views, 0 for non-interactions
        itype = inter["interaction_type"]
        label = 1.0 if itype in ("complete", "bookmark", "rate") else 0.5

        training_data.append({
            "user_skill": user["skill_level"],
            "content_difficulty": cont["difficulty"],
            "content_type": cont["content_type"],
            "topics_overlap": topics_overlap,
            "skills_overlap": skills_overlap,
            "label": label,
        })

    # Negative samples (user-content pairs that DON'T exist)
    import random
    all_content_ids = list(content_map.keys())
    all_user_ids = list(user_map.keys())
    n_neg = min(len(training_data), 200)

    for _ in range(n_neg):
        uid = random.choice(all_user_ids)
        cid = random.choice(all_content_ids)
        if (uid, cid) in seen_pairs:
            continue

        user = user_map[uid]
        cont = content_map[cid]
        u_topics = set(user.get("preferred_topics", []))
        c_topics = set(cont.get("topics", []))

        training_data.append({
            "user_skill": user["skill_level"],
            "content_difficulty": cont["difficulty"],
            "content_type": cont["content_type"],
            "topics_overlap": len(u_topics & c_topics) / max(len(u_topics | c_topics), 1),
            "skills_overlap": 0.0,
            "label": 0.0,
        })

    return training_data


def _build_engagement_training_data(
    interactions: List[dict],
    users: List[dict],
    n_modules: int = 5,
) -> List[dict]:
    """
    Generate synthetic training data for the engagement predictor.

    Uses interaction patterns to estimate which module type works best
    for each user profile.
    """
    user_map = {u["id"]: u for u in users}
    training_data = []

    # Group interactions by user
    user_interactions: Dict[int, List[dict]] = {}
    for inter in interactions:
        uid = inter["user_id"]
        user_interactions.setdefault(uid, []).append(inter)

    for uid, u_inters in user_interactions.items():
        user = user_map.get(uid)
        if not user:
            continue

        skill_idx = {"beginner": 0, "intermediate": 1, "advanced": 2}.get(
            user["skill_level"], 0
        )
        n_inter = len(u_inters)
        n_complete = sum(1 for i in u_inters if i.get("completed"))
        completion_rate = n_complete / max(n_inter, 1)

        # Heuristic: different user profiles benefit from different modules
        # Beginners → knowledge_based, content_based
        # Advanced → deepfm, ncf
        # Active users → ncf, autoencoder
        weights = [0.2, 0.2, 0.2, 0.2, 0.2]  # default equal
        if skill_idx == 0:  # beginner
            weights = [0.15, 0.1, 0.15, 0.25, 0.35]
        elif skill_idx == 2:  # advanced
            weights = [0.25, 0.3, 0.25, 0.1, 0.1]
        if n_inter > 10:  # active users
            weights[0] += 0.1  # autoencoder benefits from more data
            weights[2] += 0.1  # NCF too
            total = sum(weights)
            weights = [w / total for w in weights]

        training_data.append({
            "module_scores": [0.5] * n_modules,  # placeholder confidences
            "user_features": [skill_idx / 2.0, min(n_inter / 50.0, 1.0), completion_rate],
            "target_weights": weights,
        })

    return training_data


def run_training() -> dict:
    """
    Full HDLRS training pipeline:
    1. Fetch data from DB
    2. Build ID mappings and interaction matrix
    3. Train all 5 recommendation modules
    4. Train engagement predictor
    5. Save everything to disk
    """
    start_time = time.time()

    # --- 1. Fetch data ---
    interactions, content, users = fetch_all_data_sync()

    if len(interactions) < 5:
        logger.warning("Not enough interactions to train HDLRS (need at least 5)")
        return {
            "status": "skipped",
            "reason": "Not enough interactions",
            "interactions_count": len(interactions),
        }

    # --- 2. Build mappings ---
    user_ids = sorted(set(i["user_id"] for i in interactions))
    item_ids = sorted(set(i["content_id"] for i in interactions))

    engine = HybridRecommendationEngine()
    engine.user_id_map = {uid: idx for idx, uid in enumerate(user_ids)}
    engine.item_id_map = {iid: idx for idx, iid in enumerate(item_ids)}
    engine.reverse_user_map = {idx: uid for uid, idx in engine.user_id_map.items()}
    engine.reverse_item_map = {idx: iid for iid, idx in engine.item_id_map.items()}
    engine.n_users = len(user_ids)
    engine.n_items = len(item_ids)
    engine.content_cache = content

    # Build interaction matrix
    interaction_matrix = _build_interaction_matrix(
        interactions, engine.user_id_map, engine.item_id_map,
        engine.n_users, engine.n_items,
    )
    engine.interaction_matrix = interaction_matrix
    logger.info(f"Interaction matrix: {engine.n_users}×{engine.n_items}")

    # --- 3. Train Autoencoder ---
    logger.info("Training Autoencoder...")
    engine.autoencoder.train(interaction_matrix, epochs=50)

    # --- 4. Train DeepFM ---
    logger.info("Training DeepFM...")
    dfm_data = _build_deepfm_training_data(interactions, users, content)
    engine.deepfm.train(dfm_data, epochs=30)

    # --- 5. Train NCF ---
    logger.info("Training NCF...")
    positive_pairs = [
        (engine.user_id_map[i["user_id"]], engine.item_id_map[i["content_id"]])
        for i in interactions
        if i["user_id"] in engine.user_id_map and i["content_id"] in engine.item_id_map
    ]
    positive_pairs = list(set(positive_pairs))
    engine.ncf.train(engine.n_users, engine.n_items, positive_pairs, epochs=30)

    # --- 6. Train Content-Based Filter ---
    logger.info("Training Content-Based Filter (TF-IDF)...")
    engine.content_based.train(content)

    # --- 7. Build Knowledge-Based Filter ---
    logger.info("Building Knowledge-Based Filter...")
    engine.knowledge_based.train(content)

    # --- 8. Train Engagement Predictor ---
    logger.info("Training Engagement Predictor...")
    eng_data = _build_engagement_training_data(interactions, users)
    engine.engagement_predictor.train(eng_data, epochs=50)

    # Rebuild fusion with trained predictor
    from app.ml.fusion import DynamicEnsembleFusion
    engine.fusion = DynamicEnsembleFusion(engine.engagement_predictor)

    engine._loaded = True

    # --- 9. Save ---
    engine.save_model()

    training_time = round(time.time() - start_time, 2)
    logger.info(f"HDLRS training completed in {training_time}s")

    return {
        "status": "completed",
        "interactions_count": len(interactions),
        "content_count": len(content),
        "users_count": len(users),
        "modules_trained": [
            "autoencoder", "deepfm", "ncf", "content_based",
            "knowledge_based", "engagement_predictor",
        ],
        "training_time_seconds": training_time,
    }
