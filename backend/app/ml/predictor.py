from typing import List, Optional, Set
from app.ml.engine import recommendation_engine


def get_predictions(
    user_id: int, 
    num_items: int = 10,
    user_data: Optional[dict] = None,
    user_interactions: Optional[List[dict]] = None,
    completed_ids: Optional[Set[int]] = None,
) -> List[int]:
    """Generate predictions for a user from the loaded HDLRS model."""
    ids, _ = recommendation_engine.predict(
        user_id, 
        num_items=num_items,
        user_data=user_data,
        user_interactions=user_interactions,
        completed_ids=completed_ids
    )
    return ids
