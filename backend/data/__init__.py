"""
ConvectNow Data Ingestion & Quality Control Package (Milestone 1)
Integrates:
- IMD Doppler Weather Radar (DWR) GeoServer feeds & operational raster decoders
- MOSDAC INSAT-3DR multispectral reader & Planck thermodynamic calibration
- Automated Quality Control (TDBZ clutter rejection, satellite AP gating, optical-flow imputation)
- Closed-form pure NumPy/SciPy 1 km EPSG:4326 coordinate reprojection engine
- PyTorch Multi-Modal ConvectDataset & DataLoader yielding (B, C=4, T=12, H=128, W=128)
"""

from convectnow.backend.data.dataset_sevir import (
    ConvectDataset,
    create_convect_dataloader,
)
from convectnow.backend.data.ingester_imd import (
    REFLECTIVITY_PALETTE,
    REFLECTIVITY_VALUES,
    VELOCITY_PALETTE,
    VELOCITY_VALUES,
    IMDGeoServerWorker,
    IMDRadarProduct,
)
from convectnow.backend.data.ingester_mosdac import (
    CHANNEL_SPECS,
    MOSDACIngester,
    MOSDACProduct,
)
from convectnow.backend.data.projection import (
    GridReprojector,
    cartesian_to_latlon,
    geos_forward,
    geos_inverse,
    laea_forward,
    laea_inverse,
    latlon_to_cartesian,
    polar_to_cartesian,
)
from convectnow.backend.data.quality_control import QualityControlFilter

__all__ = [
    "CHANNEL_SPECS",
    "REFLECTIVITY_PALETTE",
    "REFLECTIVITY_VALUES",
    "VELOCITY_PALETTE",
    "VELOCITY_VALUES",
    "ConvectDataset",
    "GridReprojector",
    "IMDGeoServerWorker",
    "IMDRadarProduct",
    "MOSDACIngester",
    "MOSDACProduct",
    "QualityControlFilter",
    "cartesian_to_latlon",
    "create_convect_dataloader",
    "geos_forward",
    "geos_inverse",
    "laea_forward",
    "laea_inverse",
    "latlon_to_cartesian",
    "polar_to_cartesian"
]
