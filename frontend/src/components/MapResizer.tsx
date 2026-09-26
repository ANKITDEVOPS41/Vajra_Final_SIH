import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    // Delay slightly to ensure DOM is fully painted
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};
