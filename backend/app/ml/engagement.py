"""
Engagement Predictor Module

A lightweight neural network trained on historical engagement data to
assign confidence scores to each recommendation module's output.
Predicts which module's recommendations are most likely to lead to
actual user engagement (completions, high ratings) for a given user.
"""
import torch
import torch.nn as nn
import numpy as np
from typing import List, Optional
from loguru import logger


class EngagementPredictorNetwork(nn.Module):
    """
    Lightweight NN that predicts module weights from user features
    and module confidence scores.

    Input: 5 module confidence scores + user profile features (8 dims total)
    Architecture: Linear(input→32) → ReLU → Linear(32→16) → ReLU → Linear(16→5)
    Output: 5 raw weights for the modules
    """

    def __init__(self, input_dim: int = 8, n_modules: int = 5):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, 32),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, n_modules),
        )
        self.n_modules = n_modules
        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                nn.init.zeros_(m.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: Tensor of shape (batch, input_dim)

        Returns:
            Tensor of shape (batch, n_modules) — raw module weights
        """
        return self.network(x)


class EngagementPredictor:
    """
    Wrapper for training and using the engagement predictor.

    The predictor learns from historical data which recommendation module
    produces the best outcomes for different types of users.
    """

    # Module names in order
    MODULE_NAMES = ["autoencoder", "deepfm", "ncf", "content_based", "knowledge_based"]

    def __init__(self):
        self.model: Optional[EngagementPredictorNetwork] = None
        self.trained = False

    def train(
        self,
        training_data: List[dict],
        epochs: int = 50,
        lr: float = 0.001,
    ) -> float:
        """
        Train the engagement predictor.

        Args:
            training_data: list of dicts with keys:
                - module_scores: list of 5 floats (confidence from each module)
                - user_features: list of 3 floats (skill_level_idx, n_interactions_norm, completion_rate)
                - target_weights: list of 5 floats (which module's recs led to engagement)
        """
        if len(training_data) < 3:
            logger.warning("Not enough data to train engagement predictor, using defaults")
            self._init_default_model()
            return 0.0

        self.model = EngagementPredictorNetwork(input_dim=8, n_modules=5)
        self.model.train()

        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)
        criterion = nn.MSELoss()

        # Build tensors
        inputs = []
        targets = []
        for d in training_data:
            inp = d["module_scores"][:5] + d["user_features"][:3]
            inputs.append(inp)
            targets.append(d["target_weights"][:5])

        X = torch.FloatTensor(inputs)
        y = torch.FloatTensor(targets)

        final_loss = 0.0
        for epoch in range(epochs):
            pred = self.model(X)
            loss = criterion(pred, y)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            final_loss = loss.item()

        self.trained = True
        self.model.eval()
        logger.info(f"Engagement predictor trained, loss: {final_loss:.4f}")
        return final_loss

    def _init_default_model(self):
        """Initialize with a default model that outputs equal weights."""
        self.model = EngagementPredictorNetwork(input_dim=8, n_modules=5)
        # Set final layer bias to produce roughly equal weights
        with torch.no_grad():
            self.model.network[-1].bias.fill_(1.0)
        self.model.eval()
        self.trained = True
        logger.info("Engagement predictor initialized with default equal weights")

    def predict_weights(
        self,
        module_confidence_scores: List[float],
        user_features: List[float],
    ) -> np.ndarray:
        """
        Predict module weights for a given user context.

        Args:
            module_confidence_scores: 5 confidence scores (one per module)
            user_features: [skill_level_idx_norm, n_interactions_norm, completion_rate]

        Returns:
            np.ndarray of 5 weights (after softmax)
        """
        if self.model is None:
            self._init_default_model()

        # Pad to exactly 5 + 3 = 8 features
        scores = (module_confidence_scores + [0.5] * 5)[:5]
        feats = (user_features + [0.5] * 3)[:3]
        inp = torch.FloatTensor([scores + feats])

        with torch.no_grad():
            raw_weights = self.model(inp).squeeze(0).numpy()

        # Apply softmax
        exp_w = np.exp(raw_weights - raw_weights.max())
        weights = exp_w / exp_w.sum()

        return weights
