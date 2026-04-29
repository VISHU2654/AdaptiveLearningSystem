from typing import Dict, List, Optional
from pydantic import BaseModel
from app.schemas.content import ContentOut


class RecommendationOut(BaseModel):
    recommendations: List[ContentOut]
    source: str  # "hybrid_ensemble", "model", or "popularity"
    count: int
    module_weights: Optional[Dict[str, float]] = None  # dynamic weights per module


class TrainingStatusOut(BaseModel):
    task_id: str
    status: str  # pending, running, completed, failed
    result: Optional[dict] = None
