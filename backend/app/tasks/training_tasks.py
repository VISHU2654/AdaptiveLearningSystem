from loguru import logger

from app.tasks.celery_app import celery_app
from app.ml.trainer import run_training


@celery_app.task(name="train_model", bind=True)
def train_model_task(self):
    """Celery task that runs the full LightFM training pipeline."""
    logger.info("Starting model training task...")
    self.update_state(state="TRAINING", meta={"status": "training"})

    try:
        result = run_training()
        logger.info(f"Training task completed: {result}")
        return result
    except Exception as e:
        logger.error(f"Training task failed: {e}")
        raise
