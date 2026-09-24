"""
ConvectNow Data Ingestion & Quality Control Package (Milestone 1)
Integrates:
- IMD Doppler Weather Radar (DWR) GeoServer feeds & operational raster decoders
- MOSDAC INSAT-3DR multispectral reader & Planck thermodynamic calibration
- Automated Quality Control (TDBZ clutter rejection, satellite AP gating, optical-flow imputation)
- Closed-form pure NumPy/SciPy 1 km EPSG:4326 coordinate reprojection engine
- PyTorch Multi-Modal ConvectDataset & DataLoader yielding (B, C=4, T=12, H=128, W=128)
"""

from convectnow.backend.data.projection import (
    GridReprojector,
    laea_forward,
    laea_inverse,
    geos_forward,
    geos_inverse,
    polar_to_cartesian,
    cartesian_to_latlon,
    latlon_to_cartesian
)

from convectnow.backend.data.quality_control import (
    QualityControlFilter
)

from convectnow.backend.data.ingester_imd import (
    IMDGeoServerWorker,
    IMDRadarProduct,
    REFLECTIVITY_PALETTE,
    REFLECTIVITY_VALUES,
    VELOCITY_PALETTE,
    VELOCITY_VALUES
)

from convectnow.backend.data.ingester_mosdac import (
    MOSDACIngester,
    MOSDACProduct,
    CHANNEL_SPECS
)

from convectnow.backend.data.dataset_sevir import (
    ConvectDataset,
    create_convect_dataloader
)

__all__ = [
    "GridReprojector",
    "laea_forward",
    "laea_inverse",
    "geos_forward",
    "geos_inverse",
    "polar_to_cartesian",
    "cartesian_to_latlon",
    "latlon_to_cartesian",
    "QualityControlFilter",
    "IMDGeoServerWorker",
    "IMDRadarProduct",
    "REFLECTIVITY_PALETTE",
    "REFLECTIVITY_VALUES",
    "VELOCITY_PALETTE",
    "VELOCITY_VALUES",
    "MOSDACIngester",
    "MOSDACProduct",
    "CHANNEL_SPECS",
    "ConvectDataset",
    "create_convect_dataloader"
]
