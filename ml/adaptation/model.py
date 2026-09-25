from __future__ import annotations


def build_model(in_channels: int, labels: int, feature_channels: int, freeze_backbone: bool):
    import torch.nn as nn

    class SmallRemoteSensingCNN(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.backbone = nn.Sequential(
                nn.Conv2d(in_channels, feature_channels, kernel_size=3, padding=1),
                nn.ReLU(),
                nn.MaxPool2d(2),
                nn.Conv2d(feature_channels, feature_channels * 2, kernel_size=3, padding=1),
                nn.ReLU(),
                nn.AdaptiveAvgPool2d(1),
            )
            self.head = nn.Linear(feature_channels * 2, labels)

        def forward(self, inputs):
            return self.head(self.backbone(inputs).flatten(1))

    model = SmallRemoteSensingCNN()
    if freeze_backbone:
        for parameter in model.backbone.parameters():
            parameter.requires_grad = False
    return model
