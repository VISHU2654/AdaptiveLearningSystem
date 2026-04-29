"""
Deep Factorization Machine (DeepFM) Module

Combines factorization machines with deep neural networks to model
complex, non-linear interactions between learner features and content attributes.
The FM component captures second-order feature interactions while the DNN
component learns higher-order patterns.
"""
import torch
import torch.nn as nn
import numpy as np
from typing import Dict, List, Optional, Tuple
from loguru import logger


class DeepFMNetwork(nn.Module):
    """
    PyTorch DeepFM: FM + DNN in a single model.

    Feature fields:
        0: user_skill_level (3 categories)
        1: content_difficulty (3 categories)
        2: content_type (5 categories)
        3: topics_overlap (continuous, 0-1)
        4: skills_overlap (continuous, 0-1)
    """

    def __init__(
        self,
        field_dims: List[int],
        embed_dim: int = 8,
        mlp_dims: Tuple[int, ...] = (128, 64),
        dropout: float = 0.2,
    ):
        super().__init__()
        self.n_fields = len(field_dims)
        self.embed_dim = embed_dim

        # First-order embeddings (linear part of FM)
        self.first_order_embeddings = nn.ModuleList(
            [nn.Embedding(dim, 1) for dim in field_dims]
        )
        self.first_order_bias = nn.Parameter(torch.zeros(1))

        # Second-order embeddings (interaction part of FM)
        self.second_order_embeddings = nn.ModuleList(
            [nn.Embedding(dim, embed_dim) for dim in field_dims]
        )

        # DNN component
        dnn_input_dim = self.n_fields * embed_dim
        layers = []
        in_dim = dnn_input_dim
        for out_dim in mlp_dims:
            layers.append(nn.Linear(in_dim, out_dim))
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(dropout))
            in_dim = out_dim
        layers.append(nn.Linear(in_dim, 1))
        self.dnn = nn.Sequential(*layers)

    def forward(self, x: torch.LongTensor) -> torch.Tensor:
        """
        Args:
            x: LongTensor of shape (batch_size, n_fields) — feature indices

        Returns:
            Tensor of shape (batch_size, 1) — predicted interaction probability
        """
        # First-order: sum of individual feature embeddings
        first_order = sum(
            emb(x[:, i]) for i, emb in enumerate(self.first_order_embeddings)
        )
        first_order = first_order + self.first_order_bias  # (batch, 1)

        # Second-order: FM interaction term
        embeds = [emb(x[:, i]) for i, emb in enumerate(self.second_order_embeddings)]
        embed_stack = torch.stack(embeds, dim=1)  # (batch, n_fields, embed_dim)

        sum_of_embeds = embed_stack.sum(dim=1)  # (batch, embed_dim)
        sum_of_squares = (embed_stack ** 2).sum(dim=1)  # (batch, embed_dim)
        square_of_sums = sum_of_embeds ** 2  # (batch, embed_dim)
        second_order = 0.5 * (square_of_sums - sum_of_squares).sum(dim=1, keepdim=True)

        # DNN: flatten embeddings and pass through MLP
        dnn_input = embed_stack.reshape(embed_stack.size(0), -1)  # (batch, n_fields * embed_dim)
        dnn_output = self.dnn(dnn_input)  # (batch, 1)

        # Combine FM + DNN
        logits = first_order + second_order + dnn_output
        return torch.sigmoid(logits)


# Feature encoding constants
SKILL_TO_IDX = {"beginner": 0, "intermediate": 1, "advanced": 2}
DIFFICULTY_TO_IDX = {"beginner": 0, "intermediate": 1, "advanced": 2}
CONTENT_TYPE_TO_IDX = {"video": 0, "article": 1, "quiz": 2, "exercise": 3, "project": 4}


class DeepFMModule:
    """Wrapper for training and scoring with the DeepFM model."""

    # Field dimensions: skill(3), difficulty(3), content_type(5), topics_overlap(2), skills_overlap(2)
    FIELD_DIMS = [3, 3, 5, 2, 2]

    def __init__(self):
        self.model: Optional[DeepFMNetwork] = None
        self.trained = False

    def _encode_features(
        self,
        user_skill: str,
        content_difficulty: str,
        content_type: str,
        topics_overlap: float,
        skills_overlap: float,
    ) -> List[int]:
        """Encode raw features into category indices."""
        return [
            SKILL_TO_IDX.get(user_skill, 0),
            DIFFICULTY_TO_IDX.get(content_difficulty, 0),
            CONTENT_TYPE_TO_IDX.get(content_type, 0),
            1 if topics_overlap > 0.3 else 0,  # Discretize continuous features
            1 if skills_overlap > 0.3 else 0,
        ]

    def train(
        self,
        training_data: List[dict],
        epochs: int = 30,
        lr: float = 0.001,
        batch_size: int = 64,
    ) -> float:
        """
        Train DeepFM on feature-interaction pairs.

        Args:
            training_data: list of dicts with keys:
                user_skill, content_difficulty, content_type,
                topics_overlap, skills_overlap, label (0 or 1)
        """
        if len(training_data) < 5:
            logger.warning("Not enough data to train DeepFM")
            return 0.0

        self.model = DeepFMNetwork(self.FIELD_DIMS)
        self.model.train()

        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)
        criterion = nn.BCELoss()

        # Prepare tensors
        features = []
        labels = []
        for d in training_data:
            features.append(self._encode_features(
                d["user_skill"], d["content_difficulty"], d["content_type"],
                d["topics_overlap"], d["skills_overlap"],
            ))
            labels.append(d["label"])

        X = torch.LongTensor(features)
        y = torch.FloatTensor(labels).unsqueeze(1)
        n_samples = len(training_data)

        final_loss = 0.0
        for epoch in range(epochs):
            perm = torch.randperm(n_samples)
            epoch_loss = 0.0
            n_batches = 0

            for i in range(0, n_samples, batch_size):
                batch_idx = perm[i : i + batch_size]
                x_batch = X[batch_idx]
                y_batch = y[batch_idx]

                pred = self.model(x_batch)
                loss = criterion(pred, y_batch)

                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item()
                n_batches += 1

            final_loss = epoch_loss / max(n_batches, 1)

        self.trained = True
        self.model.eval()
        logger.info(f"DeepFM trained on {n_samples} samples, final loss: {final_loss:.4f}")
        return final_loss

    def score(
        self,
        user_skill: str,
        content_list: List[dict],
        user_topics: List[str],
        user_skills: List[str],
    ) -> np.ndarray:
        """
        Score multiple content items for a user.

        Returns:
            np.ndarray of scores, one per content item
        """
        if not self.trained or self.model is None:
            return np.ones(len(content_list)) * 0.5

        features = []
        for c in content_list:
            c_topics = set(c.get("topics", []))
            c_skills = set(c.get("skills_taught", []))
            u_topics = set(user_topics)
            u_skills = set(user_skills)

            topics_overlap = len(c_topics & u_topics) / max(len(c_topics | u_topics), 1)
            skills_overlap = len(c_skills & u_skills) / max(len(c_skills | u_skills), 1)

            features.append(self._encode_features(
                user_skill,
                c.get("difficulty", "beginner"),
                c.get("content_type", "article"),
                topics_overlap,
                skills_overlap,
            ))

        X = torch.LongTensor(features)
        with torch.no_grad():
            scores = self.model(X).squeeze(1).numpy()

        return scores
