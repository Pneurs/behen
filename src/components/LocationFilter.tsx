import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapPin, Navigation, X } from "lucide-react";

interface LocationFilterProps {
  selectedCity: string;
  onCityChange: (city: string) => void;
  onNearMeClick: () => void;
  isNearMe: boolean;
}

const PAKISTAN_CITIES = [
  "Lahore",
  "Karachi", 
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Sialkot",
  "Gujranwala",
];

const LocationFilter = ({ selectedCity, onCityChange, onNearMeClick, isNearMe }: LocationFilterProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCities = PAKISTAN_CITIES.filter((city) =>
    city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCitySelect = (city: string) => {
    onCityChange(city);
    setOpen(false);
    setSearchQuery("");
  };

  const handleClear = () => {
    onCityChange("");
    setOpen(false);
  };

  return (
    <div className="flex gap-2 w-full md:w-auto">
      <Button
        variant={isNearMe ? "default" : "outline"}
        onClick={onNearMeClick}
        className="w-auto"
      >
        <Navigation className="mr-2 h-4 w-4" />
        Near Me
      </Button>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex-1 md:w-48 justify-start">
            <MapPin className="mr-2 h-4 w-4" />
            {selectedCity || "Select City"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-3 border-b">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Select City</p>
              {selectedCity && (
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Input
              placeholder="Search cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filteredCities.map((city) => (
              <button
                key={city}
                onClick={() => handleCitySelect(city)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${
                  selectedCity === city ? "bg-accent font-medium" : ""
                }`}
              >
                {city}
              </button>
            ))}
            {filteredCities.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No cities found
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default LocationFilter;
