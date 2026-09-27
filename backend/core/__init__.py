"""Core module containing schemas and adapter contracts for ConvectNow."""

from .schemas import (
    QualityReport,
    SourceAdapter,
    CommonObservationSchema,
    GridCellSchema,
    FeatureTensorSchema,
    ForecastOutputSchema,
)

__all__ = [
    "QualityReport",
    "SourceAdapter",
    "CommonObservationSchema",
    "GridCellSchema",
    "FeatureTensorSchema",
    "ForecastOutputSchema",
]
