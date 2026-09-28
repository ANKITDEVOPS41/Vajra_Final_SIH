import asyncio
import json
import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

@dataclass
class LightningStrike:
    """
    Standardized internal representation of a lightning strike.
    Can be sourced from IMD Damini or Blitzortung.
    """
    timestamp: datetime
    latitude: float
    longitude: float
    polarity: int  # 1 for positive, -1 for negative, 0 for unknown
    amplitude_ka: float | None = None
    
class LightningIngestor:
    """
    Live streaming ingestor for lightning strikes.
    Abstracts the underlying socket connection to provide a unified
    callback-driven architecture for the MultimodalFusionEngine.
    """
    def __init__(self, websocket_url: str = "wss://ws1.blitzortung.org:443/"):
        self.websocket_url = websocket_url
        self.is_running = False
        self._callbacks: list[Callable[[LightningStrike], None]] = []
        
    def add_callback(self, callback: Callable[[LightningStrike], None]):
        """Register a function to be called on every new lightning strike."""
        self._callbacks.append(callback)
        
    async def start_streaming(self):
        """
        Starts the asynchronous lightning stream.
        Note: Requires 'websockets' package in production.
        This provides the structural template for handling real-time WebSockets
        with automatic reconnection.
        """
        try:
            import websockets
        except ImportError:
            logger.warning("websockets package not installed. Simulating lightning ingest.")
            await self._simulate_stream()
            return

        self.is_running = True
        retry_delay = 1
        
        while self.is_running:
            try:
                # Blitzortung JSON WebSocket example connection
                async with websockets.connect(self.websocket_url) as ws:
                    logger.info("Connected to Lightning Network WebSocket.")
                    retry_delay = 1  # Reset on successful connection
                    
                    # Request real-time feed format
                    await ws.send(json.dumps({"a": 111})) 
                    
                    async for message in ws:
                        if not self.is_running:
                            break
                        self._process_raw_message(message)
                        
            except Exception as e:
                logger.error(f"Lightning stream disconnected: {e}. Reconnecting in {retry_delay}s...")
                await asyncio.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, 60)
                
    def _process_raw_message(self, message: str):
        """Converts raw provider JSON into standardized LightningStrike."""
        try:
            data = json.loads(message)
            # Example Blitzortung payload mapping
            if "lat" in data and "lon" in data and "time" in data:
                # Time is usually nanoseconds since epoch
                ts = datetime.fromtimestamp(data["time"] / 1e9, tz=timezone.utc)
                
                strike = LightningStrike(
                    timestamp=ts,
                    latitude=float(data["lat"]),
                    longitude=float(data["lon"]),
                    polarity=1 if data.get("pol", 0) > 0 else -1,
                    amplitude_ka=data.get("sig")
                )
                
                # Broadcast to all registered fusion engines
                for cb in self._callbacks:
                    cb(strike)
                    
        except json.JSONDecodeError:
            pass
        except Exception as e:
            logger.debug(f"Failed to process lightning payload: {e}")

    async def _simulate_stream(self):
        """Fallback simulator for environments without websockets."""
        self.is_running = True
        logger.info("Started Simulated Lightning Stream.")
        import random
        while self.is_running:
            strike = LightningStrike(
                timestamp=datetime.now(timezone.utc),
                latitude=20.29 + random.uniform(-1.0, 1.0), # Odisha approx
                longitude=85.82 + random.uniform(-1.0, 1.0),
                polarity=random.choice([1, -1]),
                amplitude_ka=random.uniform(10.0, 50.0)
            )
            for cb in self._callbacks:
                cb(strike)
            await asyncio.sleep(random.uniform(0.1, 1.5))

    def stop(self):
        self.is_running = False

# Example standalone execution
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    ingestor = LightningIngestor()
    
    def on_strike(strike: LightningStrike):
        print(f"⚡ STRIKE! {strike.latitude:.4f}, {strike.longitude:.4f} at {strike.timestamp.time()} (Pol: {strike.polarity})")
        
    ingestor.add_callback(on_strike)
    
    # Run simulation for 5 seconds
    async def main():
        task = asyncio.create_task(ingestor.start_streaming())
        await asyncio.sleep(5)
        ingestor.stop()
        await task
        
    asyncio.run(main())
