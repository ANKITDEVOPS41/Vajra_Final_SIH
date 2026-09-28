"""
ConvectNow — Automated Web Scraper & Real-Time Data Pipeline
Extracts:
1. Live IMD Doppler Weather Radar GIF animations across 8 operational stations
2. Live IMD WIS2Box Surface Meteorological Observations (SYNOP JSON)
3. Decodes radar palettes into calibrated 2D dBZ reflectivity arrays

Usage:
    python -m convectnow.backend.data.web_scraper_imd --scrape-all
"""

import json
import logging
import os
import ssl
import urllib.request
from datetime import datetime, timezone

import numpy as np

from .ingester_imd import IMDGeoServerWorker

logger = logging.getLogger("ConvectNow.WebScraper")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../datasets/imd_live"))
RADAR_FRAMES_DIR = os.path.join(BASE_DIR, "radar_frames")
WIS2BOX_URL = (
    "https://wis2box.imd.gov.in/oapi/collections/"
    "urn:wmo:md:in-imd:surface-based-observations.synop/items?f=json&limit=150"
)

ACTIVE_RADAR_STATIONS = [
    ("KOL", "kolkata", "Kolkata (Subhasgram)"),
    ("GOP", "gopalpur", "Gopalpur (Odisha Coast)"),
    ("HYD", "hyderabad", "Hyderabad (Begumpet)"),
    ("MUM", "mumbai", "Mumbai (Colaba)"),
    ("GOA", "goa", "Goa (Panaji)"),
    ("BHP", "bhopal", "Bhopal"),
    ("NGP", "nagpur", "Nagpur"),
    ("SRN", "srinagar", "Srinagar (Kashmir)")
]


class IMDWebScraper:
    def __init__(self, output_dir: str = BASE_DIR):
        self.output_dir = output_dir
        self.radar_dir = os.path.join(output_dir, "radar_frames")
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.radar_dir, exist_ok=True)

        self.ctx = ssl.create_default_context()
        self.ctx.check_hostname = False
        self.ctx.verify_mode = ssl.CERT_NONE

    def scrape_wis2box_synop(self, limit: int = 150) -> dict:
        """Scrapes real-time Indian surface synoptic weather records from IMD WIS2Box."""
        url = f"https://wis2box.imd.gov.in/oapi/collections/urn:wmo:md:in-imd:surface-based-observations.synop/items?f=json&limit={limit}"
        logger.info(f"Fetching live surface observations from IMD WIS2Box: {url}")
        req = urllib.request.Request(url, headers={"User-Agent": "ConvectNow/1.0 (MoES SIH Research Prototype)"})
        
        try:
            with urllib.request.urlopen(req, context=self.ctx, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                features = data.get("features", [])
                
                parsed_records = []
                for f in features:
                    props = f.get("properties", {})
                    geom = f.get("geometry", {})
                    coords = geom.get("coordinates", [None, None])
                    parsed_records.append({
                        "station_id": props.get("wigos_station_identifier"),
                        "name": props.get("name"),
                        "description": props.get("description"),
                        "value": props.get("value"),
                        "units": props.get("units"),
                        "observation_time": props.get("phenomenonTime"),
                        "report_time": props.get("reportTime"),
                        "longitude": coords[0],
                        "latitude": coords[1]
                    })
                
                result = {
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                    "source": "IMD WIS2Box (WMO Global Information System)",
                    "count": len(parsed_records),
                    "records": parsed_records
                }
                out_path = os.path.join(self.output_dir, "wis2box_synop_latest.json")
                with open(out_path, "w") as out_f:
                    json.dump(result, out_f, indent=2)
                logger.info(f"Saved {len(parsed_records)} live IMD station records to {out_path}")
                return result
        except Exception as e:
            logger.error(f"Failed to scrape IMD WIS2Box: {e}")
            return {"error": str(e), "count": 0, "records": []}

    def scrape_radar_animation(self, code: str, station_name: str) -> str | None:
        """Downloads live Doppler Weather Radar animation GIF from mausam.imd.gov.in."""
        url = f"https://mausam.imd.gov.in/Radar/animation/Converted/{code}_MAXZ.gif"
        out_gif = os.path.join(self.radar_dir, f"{station_name}_maxz.gif")
        logger.info(f"Downloading live DWR animation for {station_name} ({code}) from {url}")
        
        req = urllib.request.Request(url, headers={"User-Agent": "ConvectNow/1.0 (MoES SIH Research Prototype)"})
        try:
            with urllib.request.urlopen(req, context=self.ctx, timeout=30) as resp:
                with open(out_gif, "wb") as f:
                    f.write(resp.read())
            sz_mb = os.path.getsize(out_gif) / (1024 * 1024)
            logger.info(f"Successfully downloaded {station_name} DWR animation ({sz_mb:.2f} MB)")
            return out_gif
        except Exception as e:
            logger.warning(f"Could not download DWR GIF for {station_name}: {e}")
            return None

    def decode_radar_gif_to_dbz(self, gif_path: str, station_name: str) -> np.ndarray | None:
        """Decodes the latest frame of a downloaded IMD radar GIF into calibrated dBZ reflectivity."""
        try:
            worker = IMDGeoServerWorker(station=station_name)
            prod = worker.decode_radar_gif(gif_path, "MAXZ")
            out_npy = gif_path.replace(".gif", "_latest_dbz.npy")
            np.save(out_npy, prod.data)
            logger.info(f"Decoded {station_name} radar to dBZ: shape {prod.data.shape}, max={prod.data.max():.1f} dBZ")
            return prod.data
        except Exception as e:
            logger.error(f"Error decoding palette for {station_name}: {e}")
            return None

    def scrape_all_active_radars(self) -> dict[str, str]:
        """Scrapes and decodes radar frames for all active Indian DWR stations."""
        results = {}
        for code, name, desc in ACTIVE_RADAR_STATIONS:
            gif = self.scrape_radar_animation(code, name)
            if gif:
                dbz = self.decode_radar_gif_to_dbz(gif, name)
                results[name] = {
                    "code": code,
                    "description": desc,
                    "gif_path": gif,
                    "dbz_extracted": dbz is not None,
                    "max_dbz": float(dbz.max()) if dbz is not None else 0.0
                }
        out_summary = os.path.join(self.output_dir, "radar_scrape_manifest.json")
        with open(out_summary, "w") as f:
            json.dump({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "stations": results
            }, f, indent=2)
        return results


if __name__ == "__main__":
    scraper = IMDWebScraper()
    print("=== Scraping IMD WIS2Box Surface Observations ===")
    synop = scraper.scrape_wis2box_synop(limit=100)
    print(f"Scraped {synop['count']} surface weather station reports.")
    
    print("\n=== Scraping Live IMD Doppler Weather Radar Feeds ===")
    radars = scraper.scrape_all_active_radars()
    print(f"Successfully scraped & decoded {len(radars)} operational IMD radar stations.")
