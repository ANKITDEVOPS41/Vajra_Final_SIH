"""
ConvectNow — Closed-Form Pure NumPy / SciPy Coordinate Reprojection Engine
Handles:
1. Lambert Azimuthal Equal Area (LAEA) forward & inverse (SEVIR benchmark grid)
2. Geostationary Coordinate forward & inverse (MOSDAC INSAT-3DR & GOES satellites)
3. Doppler Radar Polar (r, theta) to Cartesian & EPSG:4326 geographic remapping
4. Uniform 1 km EPSG:4326 regular lat/lon grid interpolation without external C-GIS libs
"""


import numpy as np
from scipy.ndimage import map_coordinates

# WGS-84 & Spherical Earth Constants
R_EARTH_SPHERE = 6370997.0        # SEVIR authalic spherical radius (m)
R_EARTH_EQUATORIAL = 6378137.0    # WGS-84 equatorial radius (m)
R_EARTH_POLAR = 6356752.3142      # WGS-84 polar radius (m)
H_GEOSTATIONARY = 35786000.0      # Nominal geostationary orbit altitude (m)
H_GEO_DIST = R_EARTH_EQUATORIAL + H_GEOSTATIONARY  # 42,164,137.0 m
KM_PER_DEG_LAT = 111.195          # Nominal km per degree latitude


def laea_forward(
    lat: float | np.ndarray,
    lon: float | np.ndarray,
    lat_0: float = 38.0,
    lon_0: float = -98.0,
    R: float = R_EARTH_SPHERE
) -> tuple[float | np.ndarray, float | np.ndarray]:
    """
    Closed-form forward spherical Lambert Azimuthal Equal Area (LAEA) projection.
    Maps geographic coordinates (lat, lon in degrees) to projected coordinates (x, y in meters).
    """
    lat_r, lon_r = np.radians(lat), np.radians(lon)
    lat_0_r, lon_0_r = np.radians(lat_0), np.radians(lon_0)
    dlon = lon_r - lon_0_r

    cos_c = np.sin(lat_0_r) * np.sin(lat_r) + np.cos(lat_0_r) * np.cos(lat_r) * np.cos(dlon)
    cos_c = np.clip(cos_c, -1.0, 1.0)
    k_prime = np.sqrt(2.0 / (1.0 + cos_c + 1e-12))

    x = R * k_prime * np.cos(lat_r) * np.sin(dlon)
    y = R * k_prime * (np.cos(lat_0_r) * np.sin(lat_r) - np.sin(lat_0_r) * np.cos(lat_r) * np.cos(dlon))
    return x, y


def laea_inverse(
    x: float | np.ndarray,
    y: float | np.ndarray,
    lat_0: float = 38.0,
    lon_0: float = -98.0,
    R: float = R_EARTH_SPHERE
) -> tuple[float | np.ndarray, float | np.ndarray]:
    """
    Closed-form inverse spherical Lambert Azimuthal Equal Area (LAEA) projection.
    Maps projected coordinates (x, y in meters) back to geographic coordinates (lat, lon in degrees).
    """
    lat_0_r, lon_0_r = np.radians(lat_0), np.radians(lon_0)
    rho = np.sqrt(x**2 + y**2)
    rho_safe = np.maximum(rho, 1e-12)

    c = 2.0 * np.arcsin(np.clip(rho / (2.0 * R), -1.0, 1.0))
    sin_c = np.sin(c)
    cos_c = np.cos(c)

    lat_r = np.arcsin(np.clip(cos_c * np.sin(lat_0_r) + (y * sin_c * np.cos(lat_0_r)) / rho_safe, -1.0, 1.0))
    dlon = np.arctan2(x * sin_c, rho_safe * np.cos(lat_0_r) * cos_c - y * np.sin(lat_0_r) * sin_c)
    lon_r = lon_0_r + dlon

    lat_deg = np.degrees(lat_r)
    lon_deg = (np.degrees(lon_r) + 180.0) % 360.0 - 180.0
    return lat_deg, lon_deg


def geos_forward(
    lat: float | np.ndarray,
    lon: float | np.ndarray,
    lon_0: float = 74.0,
    h: float = H_GEOSTATIONARY,
    req: float = R_EARTH_EQUATORIAL,
    rpol: float = R_EARTH_POLAR
) -> tuple[float | np.ndarray, float | np.ndarray, bool | np.ndarray]:
    """
    Standard CGMS / WMO Geostationary forward projection (INSAT-3DR / GOES).
    Maps (lat, lon) in degrees to normalized scan angles (x_rad, y_rad) in radians.
    Returns:
        (scan_x, scan_y, visible_mask)
    """
    lat_r = np.radians(lat)
    lon_r = np.radians(lon)
    lon_0_r = np.radians(lon_0)
    dlon = lon_r - lon_0_r

    # Geocentric latitude on oblate ellipsoid
    phi_g = np.arctan((rpol**2 / req**2) * np.tan(lat_r))
    re = rpol / np.sqrt(1.0 - (1.0 - (rpol / req)**2) * np.cos(phi_g)**2)

    # Earth-centered point
    P_x = re * np.cos(phi_g) * np.cos(dlon)
    P_y = re * np.cos(phi_g) * np.sin(dlon)
    P_z = re * np.sin(phi_g)

    # Vector in satellite frame (X towards earth center, Y towards East, Z towards North)
    H = req + h
    r_x = H - P_x
    r_y = P_y
    r_z = P_z

    dist = np.sqrt(r_x**2 + r_y**2 + r_z**2)
    # Visibility check (visible if cosine of angle between surface normal and look vector > 0)
    visible = (r_x * (H - r_x) - r_y**2 - (req / rpol)**2 * r_z**2) > 0

    scan_x = np.arctan2(r_y, r_x)
    scan_y = np.arcsin(np.clip(r_z / np.maximum(dist, 1e-6), -1.0, 1.0))

    return scan_x, scan_y, visible


def geos_inverse(
    scan_x: float | np.ndarray,
    scan_y: float | np.ndarray,
    lon_0: float = 74.0,
    h: float = H_GEOSTATIONARY,
    req: float = R_EARTH_EQUATORIAL,
    rpol: float = R_EARTH_POLAR
) -> tuple[float | np.ndarray, float | np.ndarray, bool | np.ndarray]:
    """
    Standard CGMS / WMO Geostationary inverse projection.
    Maps normalized scan angles (scan_x, scan_y in radians) back to (lat, lon in degrees).
    Returns:
        (lat, lon, valid_mask)
    """
    H = req + h
    lon_0_r = np.radians(lon_0)

    ux = np.cos(scan_y) * np.cos(scan_x)
    uy = np.cos(scan_y) * np.sin(scan_x)
    uz = np.sin(scan_y)

    A = (ux**2 + uy**2) / (req**2) + (uz**2) / (rpol**2)
    B = H * ux / (req**2)
    C = (H**2 / req**2) - 1.0

    det = B**2 - A * C
    valid = det >= 0
    det_safe = np.maximum(det, 0.0)

    s_sol = (B - np.sqrt(det_safe)) / np.maximum(A, 1e-20)

    Px_inv = H - s_sol * ux
    Py_inv = s_sol * uy
    Pz_inv = s_sol * uz

    lon_inv = np.degrees(lon_0_r + np.arctan2(Py_inv, Px_inv))
    lat_inv = np.degrees(np.arctan((req**2 / rpol**2) * (Pz_inv / np.sqrt(Px_inv**2 + Py_inv**2 + 1e-12))))
    lon_inv = (lon_inv + 180.0) % 360.0 - 180.0

    return lat_inv, lon_inv, valid


def polar_to_cartesian(
    r_km: float | np.ndarray,
    theta_deg: float | np.ndarray
) -> tuple[float | np.ndarray, float | np.ndarray]:
    """
    Converts meteorological polar coordinates (r in km, theta in degrees azimuth clockwise from North)
    to local Cartesian (x_km East, y_km North).
    """
    theta_r = np.radians(theta_deg)
    x_km = r_km * np.sin(theta_r)
    y_km = r_km * np.cos(theta_r)
    return x_km, y_km


def cartesian_to_latlon(
    x_km: float | np.ndarray,
    y_km: float | np.ndarray,
    station_lat: float,
    station_lon: float
) -> tuple[float | np.ndarray, float | np.ndarray]:
    """
    Converts local Cartesian coordinates (x_km East, y_km North from radar station)
    to geographic coordinates (lat, lon in degrees EPSG:4326).
    """
    dlat = y_km / KM_PER_DEG_LAT
    dlon = x_km / (KM_PER_DEG_LAT * np.cos(np.radians(station_lat)))
    lat = station_lat + dlat
    lon = station_lon + dlon
    return lat, lon


def latlon_to_cartesian(
    lat: float | np.ndarray,
    lon: float | np.ndarray,
    station_lat: float,
    station_lon: float
) -> tuple[float | np.ndarray, float | np.ndarray]:
    """
    Converts geographic coordinates (lat, lon in degrees EPSG:4326)
    to local Cartesian offsets (x_km East, y_km North from radar station).
    """
    y_km = (lat - station_lat) * KM_PER_DEG_LAT
    x_km = (lon - station_lon) * KM_PER_DEG_LAT * np.cos(np.radians(station_lat))
    return x_km, y_km


class GridReprojector:
    """
    Unified coordinate transformation and grid resampling engine for ConvectNow.
    Provides sub-50ms reprojection of SEVIR LAEA cubes, IMD Doppler Radar polar sweeps,
    and MOSDAC Geostationary products onto a standardized 1 km EPSG:4326 grid.
    """

    def __init__(self, default_res_km: float = 1.0):
        self.default_res_km = default_res_km

    def reproject_sevir_to_epsg4326(
        self,
        grid_data: np.ndarray,
        llcrnrlat: float,
        llcrnrlon: float,
        urcrnrlat: float,
        urcrnrlon: float,
        target_shape: tuple[int, int] | None = None
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Reprojects a SEVIR LAEA grid to a regular lat/lon EPSG:4326 grid using
        closed-form LAEA forward mapping and bilinear interpolation.

        Args:
            grid_data: 2D or 3D array (H, W) or (T, H, W)
            llcrnrlat, llcrnrlon: Lower-left corner in degrees
            urcrnrlat, urcrnrlon: Upper-right corner in degrees
            target_shape: Desired output (H_out, W_out), defaults to grid_data shape[-2:]

        Returns:
            (reprojected_grid, target_lats_1d, target_lons_1d)
        """
        orig_shape = grid_data.shape[-2:]
        H_src, W_src = orig_shape
        H_out, W_out = target_shape if target_shape is not None else orig_shape

        # Source LAEA bounds
        x_ll, y_ll = laea_forward(llcrnrlat, llcrnrlon)
        x_ur, y_ur = laea_forward(urcrnrlat, urcrnrlon)
        dx_src = (x_ur - x_ll) / W_src
        dy_src = (y_ur - y_ll) / H_src

        # Regular target lat/lon grid
        target_lats = np.linspace(llcrnrlat, urcrnrlat, H_out)
        target_lons = np.linspace(llcrnrlon, urcrnrlon, W_out)
        grid_lon, grid_lat = np.meshgrid(target_lons, target_lats)

        # Map target (lat, lon) to source LAEA (x, y)
        target_x, target_y = laea_forward(grid_lat, grid_lon)

        # Convert source (x, y) to source pixel indices (row, col)
        # Note: In SEVIR, y increases from bottom to top (row 0 is bottom or top depending on convention)
        src_col = (target_x - x_ll) / dx_src
        src_row = (target_y - y_ll) / dy_src
        src_coords = np.array([src_row, src_col])

        if grid_data.ndim == 2:
            out_grid = map_coordinates(grid_data, src_coords, order=1, mode='nearest')
        elif grid_data.ndim == 3:
            # (T, H, W) sequence
            T = grid_data.shape[0]
            out_grid = np.empty((T, H_out, W_out), dtype=grid_data.dtype)
            for t in range(T):
                out_grid[t] = map_coordinates(grid_data[t], src_coords, order=1, mode='nearest')
        else:
            raise ValueError(f"Unsupported grid_data ndim: {grid_data.ndim}")

        return out_grid, target_lats, target_lons

    def reproject_polar_to_cartesian(
        self,
        polar_data: np.ndarray,
        max_range_km: float = 250.0,
        out_shape: tuple[int, int] = (720, 720)
    ) -> np.ndarray:
        """
        Converts radar polar sweep (n_gates, n_rays) to local Cartesian square grid (out_shape).

        Args:
            polar_data: 2D array of shape (n_gates, n_rays)
            max_range_km: maximum radial range in km
            out_shape: Cartesian grid dimensions (H, W)

        Returns:
            cartesian_grid: 2D array (out_shape)
        """
        n_gates, n_rays = polar_data.shape
        H, W = out_shape
        cx, cy = (W - 1) / 2.0, (H - 1) / 2.0

        grid_y, grid_x = np.indices(out_shape, dtype=np.float32)
        dx = grid_x - cx
        dy = -(grid_y - cy)  # North is up (positive dy)

        r_pixel = np.sqrt(dx**2 + dy**2)
        # Max radius in pixels
        r_max_px = min(cx, cy)
        range_km = (r_pixel / r_max_px) * max_range_km

        # Meteorological azimuth in degrees [0, 360) clockwise from North
        az_deg = (np.degrees(np.arctan2(dx, dy)) + 360.0) % 360.0

        # Fractional indices in polar_data
        gate_idx = (range_km / max_range_km) * (n_gates - 1)
        ray_idx = (az_deg / 360.0) * n_rays

        coords = np.array([gate_idx, ray_idx])
        cart_grid = map_coordinates(polar_data, coords, order=1, mode='nearest')

        # Mask pixels outside the circular radar horizon
        outside_mask = r_pixel > r_max_px
        cart_grid[outside_mask] = 0.0
        return cart_grid

    def reproject_radar_to_epsg4326(
        self,
        radar_cartesian: np.ndarray,
        station_lat: float,
        station_lon: float,
        max_range_km: float = 250.0,
        target_bbox: tuple[float, float, float, float] | None = None,
        target_shape: tuple[int, int] = (256, 256)
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Reprojects Cartesian radar product centered at (station_lat, station_lon)
        onto a regular geographic lat/lon EPSG:4326 bounding box.

        Args:
            radar_cartesian: 2D array (H_rad, W_rad)
            station_lat, station_lon: Radar station position in degrees
            max_range_km: Radar maximum observation radius in km
            target_bbox: Optional (lat_min, lon_min, lat_max, lon_max). If None, uses radar extent.
            target_shape: (H_out, W_out)

        Returns:
            (reprojected_grid, lats_1d, lons_1d)
        """
        H_rad, W_rad = radar_cartesian.shape
        cx = (W_rad - 1) / 2.0
        cy = (H_rad - 1) / 2.0
        km_per_px = max_range_km / min(cx, cy)

        if target_bbox is None:
            dlat = max_range_km / KM_PER_DEG_LAT
            dlon = max_range_km / (KM_PER_DEG_LAT * np.cos(np.radians(station_lat)))
            target_bbox = (station_lat - dlat, station_lon - dlon, station_lat + dlat, station_lon + dlon)

        lat_min, lon_min, lat_max, lon_max = target_bbox
        H_out, W_out = target_shape
        lats = np.linspace(lat_min, lat_max, H_out)
        lons = np.linspace(lon_min, lon_max, W_out)
        grid_lon, grid_lat = np.meshgrid(lons, lats)

        # Convert target (lat, lon) to radar station (x_km, y_km)
        x_km, y_km = latlon_to_cartesian(grid_lat, grid_lon, station_lat, station_lon)

        # Convert (x_km, y_km) to radar image pixel coordinates
        src_col = cx + (x_km / km_per_px)
        src_row = cy - (y_km / km_per_px)  # Row 0 is North / top
        src_coords = np.array([src_row, src_col])

        out_grid = map_coordinates(radar_cartesian, src_coords, order=1, mode='constant', cval=0.0)

        # Distance mask: zero out beyond radar max range
        dist_km = np.sqrt(x_km**2 + y_km**2)
        out_grid[dist_km > max_range_km] = 0.0

        return out_grid, lats, lons

    def reproject_satellite_to_epsg4326(
        self,
        sat_grid: np.ndarray,
        sat_lon_0: float = 74.0,
        scan_x_range: tuple[float, float] | None = None,
        scan_y_range: tuple[float, float] | None = None,
        target_bbox: tuple[float, float, float, float] = (8.0, 68.0, 37.0, 97.0),
        target_shape: tuple[int, int] = (256, 256)
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Reprojects Geostationary satellite imagery (INSAT-3DR) to regular EPSG:4326 grid.

        Args:
            sat_grid: 2D array (H_sat, W_sat) in geostationary projection
            sat_lon_0: Sub-satellite longitude (degrees), 74.0 for INSAT-3DR
            scan_x_range: (min_rad, max_rad) scan angle span. Defaults to typical India coverage.
            scan_y_range: (min_rad, max_rad) scan angle span.
            target_bbox: (lat_min, lon_min, lat_max, lon_max)
            target_shape: (H_out, W_out)

        Returns:
            (reprojected_grid, lats_1d, lons_1d)
        """
        H_sat, W_sat = sat_grid.shape
        if scan_x_range is None:
            # Nominal scan angle range for Indian subcontinent
            scan_x_range = (-0.08, 0.08)
        if scan_y_range is None:
            scan_y_range = (0.01, 0.12)

        lat_min, lon_min, lat_max, lon_max = target_bbox
        H_out, W_out = target_shape
        lats = np.linspace(lat_min, lat_max, H_out)
        lons = np.linspace(lon_min, lon_max, W_out)
        grid_lon, grid_lat = np.meshgrid(lons, lats)

        # Forward project target lat/lon to satellite scan angles
        sx, sy, visible = geos_forward(grid_lat, grid_lon, lon_0=sat_lon_0)

        # Convert scan angles to source image pixel indices
        sx_min, sx_max = scan_x_range
        sy_min, sy_max = scan_y_range

        src_col = ((sx - sx_min) / (sx_max - sx_min + 1e-12)) * (W_sat - 1)
        src_row = ((sy_max - sy) / (sy_max - sy_min + 1e-12)) * (H_sat - 1)  # North is top
        src_coords = np.array([src_row, src_col])

        out_grid = map_coordinates(sat_grid, src_coords, order=1, mode='nearest')
        out_grid[~visible] = 0.0
        return out_grid, lats, lons
