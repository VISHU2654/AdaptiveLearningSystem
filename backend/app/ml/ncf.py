"""
Neural Collaborative Filtering (NCF) Module

Utilizes a multi-layer perceptron (MLP) to learn arbitrary mappings
and capture non-linear collaborative signals between users and items.
Combines Generalized Matrix Factorization (GMF) with an MLP branch.
"""
import torch
import torch.nn as nn
import numpy as np
from typing import List, Optional, Tuple
from loguru import logger


class NCFNetwork(nn.Module):
    """
    Neural Collaborative Filtering combining GMF and MLP branches.

    Architecture:
        GMF branch: user_embed ⊙ item_embed (element-wise product)
        MLP branch: concat(user_embed, item_embed) → 128 → 64 → 32
        Fusion: concat(GMF, MLP) → Linear(1) → Sigmoid
    """

    def __init__(self, n_users: int, n_items: int, embed_dim: int = 32):
        super().__init__()
        self.n_users = n_users
        self.n_items = n_items

        # GMF embeddings
        self.gmf_user_embed = nn.Embedding(n_users, embed_dim)
        self.gmf_item_embed = nn.Embedding(n_items, embed_dim)

        # MLP embeddings (separate from GMF)
        self.mlp_user_embed = nn.Embedding(n_users, embed_dim)
        self.mlp_item_embed = nn.Embedding(n_items, embed_dim)

        # MLP layers
        self.mlp = nn.Sequential(
            nn.Linear(embed_dim * 2, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(),
        )

        # Final fusion layer
        self.output_layer = nn.Sequential(
            nn.Linear(embed_dim + 32, 1),
            nn.Sigmoid(),
        )

        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Embedding):
                nn.init.normal_(m.weight, std=0.01)
            elif isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                nn.init.zeros_(m.bias)

    def forward(
        self, user_ids: torch.LongTensor, item_ids: torch.LongTensor
    ) -> torch.Tensor:
        """
        Args:
            user_ids: LongTensor (batch_size,)
            item_ids: LongTensor (batch_size,)
        Returns:
            Tensor (batch_size, 1) — predicted interaction probability
        """
        # GMF branch
        gmf_user = self.gmf_user_embed(user_ids)
        gmf_item = self.gmf_item_embed(item_ids)
        gmf_out = gmf_user * gmf_item  # element-wise product

        # MLP branch
        mlp_user = self.mlp_user_embed(user_ids)
        mlp_item = self.mlp_item_embed(item_ids)
        mlp_input = torch.cat([mlp_user, mlp_item], dim=1)
        mlp_out = self.mlp(mlp_input)

        # Fusion
        concat = torch.cat([gmf_out, mlp_out], dim=1)
        output = self.output_layer(concat)
        return output


class NCFModule:
    """Wrapper for training and scoring with Neural Collaborative Filtering."""

    def __init__(self):
        self.model: Optional[NCFNetwork] = None
        self.trained = False
        self.n_users = 0
        self.n_items = 0

    def train(
        self,
        n_users: int,
        n_items: int,
        positive_pairs: List[Tuple[int, int]],
        epochs: int = 30,
        lr: float = 0.001,
        batch_size: int = 64,
        neg_ratio: int = 4,
    ) -> float:
        """
        Train NCF on user-item interaction pairs.

        Args:
            n_users: total number of users (matrix indices 0..n_users-1)
            n_items: total number of items (matrix indices 0..n_items-1)
            positive_pairs: list of (user_idx, item_idx) positive interactions
            neg_ratio: number of negative samples per positive sample
        """
        self.n_users = n_users
        self.n_items = n_items

        if len(positive_pairs) < 5:
            logger.warning("Not enough pairs to train NCF")
            return 0.0

        self.model = NCFNetwork(n_users, n_items)
        self.model.train()

        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)
        criterion = nn.BCELoss()

        # Build positive set for negative sampling
        positive_set = set(positive_pairs)

        final_loss = 0.0
        for epoch in range(epochs):
            # Generate training batch with negative sampling
            users, items, labels = [], [], []
            for u, i in positive_pairs:
                users.append(u)
                items.append(i)
                labels.append(1.0)

                # Negative samples
                for _ in range(neg_ratio):
                    neg_item = np.random.randint(0, n_items)
                    while (u, neg_item) in positive_set:
                        neg_item = np.random.randint(0, n_items)
                    users.append(u)
                    items.append(neg_item)
                    labels.append(0.0)

            user_t = torch.LongTensor(users)
            item_t = torch.LongTensor(items)
            label_t = torch.FloatTensor(labels).unsqueeze(1)

            n_samples = len(users)
            perm = torch.randperm(n_samples)
            epoch_loss = 0.0
            n_batches = 0

            for i in range(0, n_samples, batch_size):
                batch_idx = perm[i : i + batch_size]
                pred = self.model(user_t[batch_idx], item_t[batch_idx])
                loss = criterion(pred, label_t[batch_idx])

                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item()
                n_batches += 1

            final_loss = epoch_loss / max(n_batches, 1)

        self.trained = True
        self.model.eval()
        logger.info(
            f"NCF trained: {n_users} users, {n_items} items, "
            f"{len(positive_pairs)} pairs, loss: {final_loss:.4f}"
        )
        return final_loss

    def score(self, user_idx: int, item_indices: np.ndarray) -> np.ndarray:
        """
        Score items for a user.

        Args:
            user_idx: matrix index of the user
            item_indices: array of item matrix indices to score

        Returns:
            np.ndarray of scores
        """
        if not self.trained or self.model is None:
            return np.ones(len(item_indices)) * 0.5

        if user_idx >= self.n_users:
            return np.ones(len(item_indices)) * 0.5

        user_t = torch.LongTensor([user_idx] * len(item_indices))
        item_t = torch.LongTensor(item_indices)

        with torch.no_grad():
            scores = self.model(user_t, item_t).squeeze(1).numpy()

        return scores
