"""
Autoencoder Module

Learns low-dimensional, dense representations of the learner-content
interaction matrix and denoises sparse data. Used to create compact
user embeddings that capture latent interaction patterns.
"""
import torch
import torch.nn as nn
import numpy as np
from typing import Optional
from loguru import logger


class InteractionAutoencoder(nn.Module):
    """
    PyTorch Autoencoder for learning dense user representations
    from the sparse user-item interaction matrix.

    Architecture:
        Encoder: Input(n_items) -> Linear(256) -> ReLU -> Linear(64) -> ReLU
        Decoder: Linear(64) -> ReLU -> Linear(256) -> ReLU -> Linear(n_items) -> Sigmoid
    """

    def __init__(self, n_items: int, encoding_dim: int = 64):
        super().__init__()
        self.n_items = n_items
        self.encoding_dim = encoding_dim

        # Encoder
        self.encoder = nn.Sequential(
            nn.Linear(n_items, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, encoding_dim),
            nn.ReLU(),
        )

        # Decoder
        self.decoder = nn.Sequential(
            nn.Linear(encoding_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, n_items),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded

    def encode(self, x: torch.Tensor) -> torch.Tensor:
        """Get the dense encoding for input interactions."""
        with torch.no_grad():
            return self.encoder(x)


class AutoencoderModule:
    """
    Wrapper that handles training and scoring for the Autoencoder.
    Produces per-item reconstruction scores that act as recommendations.
    """

    def __init__(self):
        self.model: Optional[InteractionAutoencoder] = None
        self.trained = False

    def train(
        self,
        interaction_matrix: np.ndarray,
        epochs: int = 50,
        lr: float = 0.001,
        batch_size: int = 32,
    ) -> float:
        """
        Train the autoencoder on the user-item interaction matrix.

        Args:
            interaction_matrix: np.ndarray of shape (n_users, n_items), values 0-5
            epochs: number of training epochs
            lr: learning rate
            batch_size: mini-batch size

        Returns:
            Final training loss
        """
        n_users, n_items = interaction_matrix.shape
        self.model = InteractionAutoencoder(n_items)
        self.model.train()

        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)
        criterion = nn.MSELoss()

        # Normalize interactions to 0-1 range
        max_val = interaction_matrix.max() if interaction_matrix.max() > 0 else 1.0
        normalized = interaction_matrix / max_val
        data_tensor = torch.FloatTensor(normalized)

        n_batches = max(1, n_users // batch_size)
        final_loss = 0.0

        for epoch in range(epochs):
            # Shuffle
            perm = torch.randperm(n_users)
            epoch_loss = 0.0

            for i in range(0, n_users, batch_size):
                batch_idx = perm[i : i + batch_size]
                batch = data_tensor[batch_idx]

                # Add noise for denoising autoencoder
                noise = torch.randn_like(batch) * 0.1
                noisy_batch = torch.clamp(batch + noise, 0, 1)

                output = self.model(noisy_batch)
                loss = criterion(output, batch)

                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item()

            final_loss = epoch_loss / n_batches
            if (epoch + 1) % 10 == 0:
                logger.debug(f"Autoencoder epoch {epoch+1}/{epochs}, loss: {final_loss:.4f}")

        self.trained = True
        self.model.eval()
        logger.info(f"Autoencoder trained: {n_items} items, final loss: {final_loss:.4f}")
        return final_loss

    def score(self, user_interactions: np.ndarray) -> np.ndarray:
        """
        Score all items for a user based on reconstruction.

        Args:
            user_interactions: np.ndarray of shape (n_items,)

        Returns:
            np.ndarray of scores for each item
        """
        if not self.trained or self.model is None:
            return np.zeros_like(user_interactions)

        max_val = user_interactions.max() if user_interactions.max() > 0 else 1.0
        normalized = user_interactions / max_val
        x = torch.FloatTensor(normalized).unsqueeze(0)

        with torch.no_grad():
            scores = self.model(x).squeeze(0).numpy()

        return scores

    def get_user_embedding(self, user_interactions: np.ndarray) -> np.ndarray:
        """Get the dense latent representation for a user."""
        if not self.trained or self.model is None:
            return np.zeros(64)

        max_val = user_interactions.max() if user_interactions.max() > 0 else 1.0
        normalized = user_interactions / max_val
        x = torch.FloatTensor(normalized).unsqueeze(0)

        with torch.no_grad():
            embedding = self.model.encode(x).squeeze(0).numpy()

        return embedding
