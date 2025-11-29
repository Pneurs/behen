import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";

interface MapViewProps {
  products: any[];
  onProductClick?: (productId: string) => void;
}

export default function MapView({ products, onProductClick }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState("");

  useEffect(() => {
    fetchMapboxToken();
  }, []);

  const fetchMapboxToken = async () => {
    // For now, using a placeholder. User should add their Mapbox token
    const token = "pk.YOUR_MAPBOX_TOKEN_HERE";
    setMapboxToken(token);
  };

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [77.5946, 12.9716], // Bangalore center
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add markers for products with approximate locations
    products.forEach((product) => {
      if (product.latitude && product.longitude) {
        // Add random offset for privacy (500m radius)
        const latOffset = (Math.random() - 0.5) * 0.009; // ~500m
        const lngOffset = (Math.random() - 0.5) * 0.009;

        const marker = new mapboxgl.Marker({ color: "#8b5cf6" })
          .setLngLat([product.longitude + lngOffset, product.latitude + latOffset])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(`
              <div class="p-2">
                <h3 class="font-semibold">${product.title}</h3>
                <p class="text-sm">₹${product.rental_price_per_day}/day</p>
                <p class="text-xs text-muted-foreground">Approximate location</p>
              </div>
            `)
          )
          .addTo(map.current!);

        marker.getElement().addEventListener("click", () => {
          if (onProductClick) onProductClick(product.id);
        });
      }
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, products]);

  if (!mapboxToken || mapboxToken === "pk.YOUR_MAPBOX_TOKEN_HERE") {
    return (
      <div className="w-full h-[400px] bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center p-8">
          <p className="font-semibold mb-2">Map View</p>
          <p className="text-sm text-muted-foreground mb-4">
            Add your Mapbox token to enable map view
          </p>
          <a
            href="https://mapbox.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Get your free Mapbox token →
          </a>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="w-full h-[400px] rounded-lg shadow-lg" />;
}