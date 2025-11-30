import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface LocationDistancePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productLocation: {
    city?: string;
    area?: string;
    latitude?: number;
    longitude?: number;
  };
  productTitle: string;
}

const LocationDistancePopup = ({
  open,
  onOpenChange,
  productLocation,
  productTitle,
}: LocationDistancePopupProps) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      getUserLocation();
    }
  }, [open]);

  const getUserLocation = () => {
    setLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(userLoc);
          
          if (productLocation.latitude && productLocation.longitude) {
            const dist = calculateDistance(
              userLoc.lat,
              userLoc.lng,
              productLocation.latitude,
              productLocation.longitude
            );
            setDistance(dist);
          }
          setLoading(false);
        },
        (error) => {
          toast.error("Please enable location access to see distance");
          setLoading(false);
        }
      );
    } else {
      toast.error("Location services not available");
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const estimateTravelTime = (distanceKm: number) => {
    // Assume average speed of 40 km/h in city traffic
    const hours = distanceKm / 40;
    const minutes = Math.round(hours * 60);
    
    if (minutes < 60) {
      return `${minutes} min drive`;
    } else {
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hrs}h ${mins}m drive`;
    }
  };

  const openInGoogleMaps = () => {
    if (productLocation.latitude && productLocation.longitude) {
      // Open approximate location (rounded to 3 decimal places for ~100m accuracy)
      const approxLat = Math.round(productLocation.latitude * 1000) / 1000;
      const approxLng = Math.round(productLocation.longitude * 1000) / 1000;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${approxLat},${approxLng}`;
      window.open(url, '_blank');
    } else {
      const searchQuery = `${productLocation.area || ''} ${productLocation.city || ''}`.trim();
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`;
      window.open(url, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Location & Distance
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Location */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Product Location</p>
            <p className="font-semibold">{productTitle}</p>
            <p className="text-sm">{productLocation.area}, {productLocation.city}</p>
          </div>

          {/* Distance Info */}
          {loading ? (
            <div className="p-4 border rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Calculating distance...</p>
            </div>
          ) : distance !== null ? (
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Distance</span>
                <span className="text-lg font-bold text-primary">{distance.toFixed(1)} km</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Est. Travel Time</span>
                <span className="font-semibold">{estimateTravelTime(distance)}</span>
              </div>
            </div>
          ) : productLocation.latitude && productLocation.longitude ? (
            <div className="p-4 border rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-3">Enable location to see distance</p>
              <Button size="sm" onClick={getUserLocation}>
                <Navigation className="mr-2 h-4 w-4" />
                Enable Location
              </Button>
            </div>
          ) : (
            <div className="p-4 border rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                Exact location available after booking
              </p>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-900">
              <strong>Privacy:</strong> Approximate location shown. Exact address shared after booking confirmation.
            </p>
          </div>

          {/* Directions Button */}
          <Button onClick={openInGoogleMaps} className="w-full" variant="default">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in Google Maps
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LocationDistancePopup;
