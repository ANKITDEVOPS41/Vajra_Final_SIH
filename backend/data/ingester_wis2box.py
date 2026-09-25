import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import requests
import urllib3

# Suppress insecure request warnings due to the Indian Government intermediate CA.
# This is explicitly required to hit wis2box.imd.gov.in without verification errors.
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

@dataclass
class SurfaceObservation:
    """
    Standardized internal representation of a surface weather observation.
    This acts as the interface boundary (Adapter Pattern) between raw IMD data
    and our MultimodalFusionEngine.
    """
    station_id: str
    timestamp: datetime
    latitude: float
    longitude: float
    temperature_c: float | None = None
    dewpoint_c: float | None = None
    pressure_hpa: float | None = None
    wind_speed_ms: float | None = None
    wind_dir_deg: float | None = None
    
    @property
    def is_valid(self) -> bool:
        """Basic validation to ensure we have usable thermodynamic data."""
        return self.temperature_c is not None and self.dewpoint_c is not None

class WIS2BoxIngestor:
    """
    Live data ingestor for the official IMD WIS2Box WMO GTS Node.
    Pulls surface synoptic (SYNOP) observations for real-time environment fusion.
    """
    def __init__(self, base_url: str = "https://wis2box.imd.gov.in/oapi"):
        self.base_url = base_url
        self.session = requests.Session()
        # CRITICAL: Bypass SSL verification for the specific IMD certificate chain
        self.session.verify = False 
        self.session.headers.update({"Accept": "application/json"})
        
    def fetch_odisha_synop(self, bbox: str = "82.0,17.8,87.5,22.6", limit: int = 200) -> list[SurfaceObservation]:
        """
        Fetches the latest surface observations within the Odisha bounding box.
        
        Args:
            bbox (str): min_lon,min_lat,max_lon,max_lat (default is Odisha region)
            limit (int): Max number of records to pull
            
        Returns:
            List[SurfaceObservation]: Normalized observation objects
        """
        # URN for India IMD Surface Based Observations (SYNOP)
        collection_urn = "urn:wmo:md:in-imd:surface-based-observations.synop"
        endpoint = f"{self.base_url}/collections/{collection_urn}/items"
        
        params = {
            "f": "json",
            "bbox": bbox,
            "limit": limit
        }
        
        try:
            # 15s timeout to prevent hanging on remote network drops
            response = self.session.get(endpoint, params=params, timeout=15.0)
            response.raise_for_status()
            data = response.json()
            
            features = data.get("features", [])
            logger.info(f"Successfully retrieved {len(features)} live SYNOP records from WIS2Box.")
            
            return self._parse_geojson_features(features)
            
        except requests.RequestException as e:
            logger.error(f"Failed to fetch WIS2Box SYNOP data: {e}")
            return []


    def _parse_geojson_features(self, features: list[dict[str, Any]]) -> list[SurfaceObservation]:
        """Maps WMO GeoJSON (one variable per feature) to our internal standard data class."""
        # WIS2Box often returns one feature per variable rather than wide rows.
        # We need to aggregate by station_id
        station_buffers = {}
        
        for feat in features:
            try:
                props = feat.get("properties", {})
                geom = feat.get("geometry", {})
                coords = geom.get("coordinates", [0.0, 0.0])
                
                station_id = props.get("wigos_station_identifier", "UNKNOWN")
                if station_id == "UNKNOWN":
                    continue
                    
                if station_id not in station_buffers:
                    # Initialize buffer
                    raw_time = props.get("phenomenonTime") or props.get("reportTime") or props.get("resultTime")
                    if raw_time:
                        parsed_time = datetime.fromisoformat(str(raw_time).replace('Z', '+00:00'))
                    else:
                        parsed_time = datetime.now(timezone.utc)
                        
                    station_buffers[station_id] = SurfaceObservation(
                        station_id=station_id,
                        timestamp=parsed_time,
                        longitude=float(coords[0]),
                        latitude=float(coords[1])
                    )
                
                # Extract the specific variable this feature represents
                var_name = props.get("name")
                var_value = self._extract_float(props, "value")
                
                if var_value is not None:
                    # Map standard WMO names to our fields
                    if "air_temperature" in str(var_name).lower():
                        station_buffers[station_id].temperature_c = var_value
                    elif "dewpoint" in str(var_name).lower():
                        station_buffers[station_id].dewpoint_c = var_value
                    elif "pressure" in str(var_name).lower():
                        station_buffers[station_id].pressure_hpa = var_value
                    elif "wind_speed" in str(var_name).lower():
                        station_buffers[station_id].wind_speed_ms = var_value
                    elif "wind_direction" in str(var_name).lower():
                        station_buffers[station_id].wind_dir_deg = var_value
                        
            except (ValueError, TypeError) as e:
                logger.debug(f"Skipping malformed feature: {e}")
                continue
                
        # Return only the aggregated objects (we can enforce is_valid if needed later)
        return list(station_buffers.values())
        
    @staticmethod
    def _extract_float(properties: dict[str, Any], key: str) -> float | None:
        """Safely extract and cast float values from dynamic JSON payloads."""
        val = properties.get(key)
        if val is None:
            return None
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

# Simple manual test block if run standalone
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    ingestor = WIS2BoxIngestor()
    obs_list = ingestor.fetch_odisha_synop()
    
    print(f"Total Unique Stations Parsed: {len(obs_list)}")
    for obs in obs_list[:5]:  # Print first 5
        print(f"[{obs.timestamp}] Station {obs.station_id}: {obs.temperature_c}°C, {obs.pressure_hpa}hPa, Wind: {obs.wind_speed_ms}m/s")
