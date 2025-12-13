import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { MapPin, ChevronRight, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAKISTAN_LOCATIONS, CITIES } from "@/data/locations";

interface LocationFilterProps {
  selectedCity: string;
  selectedArea?: string;
  onCityChange: (city: string) => void;
  onAreaChange?: (area: string) => void;
}

const LocationFilter = ({ 
  selectedCity, 
  selectedArea = "",
  onCityChange, 
  onAreaChange 
}: LocationFilterProps) => {
  const [cityOpen, setCityOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);

  const areas = selectedCity ? PAKISTAN_LOCATIONS[selectedCity] || [] : [];

  const handleCitySelect = (city: string) => {
    onCityChange(city);
    if (onAreaChange) {
      onAreaChange(""); // Reset area when city changes
    }
    setCityOpen(false);
  };

  const handleAreaSelect = (area: string) => {
    if (onAreaChange) {
      onAreaChange(area);
    }
    setAreaOpen(false);
  };

  const handleClear = () => {
    onCityChange("");
    if (onAreaChange) {
      onAreaChange("");
    }
  };

  return (
    <div className="flex gap-2 w-full md:w-auto">
      {/* City Selector */}
      <Popover open={cityOpen} onOpenChange={setCityOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            role="combobox" 
            aria-expanded={cityOpen}
            className="w-full md:w-[180px] justify-between"
          >
            <span className="flex items-center truncate">
              <MapPin className="mr-2 h-4 w-4 shrink-0" />
              {selectedCity || "Select City"}
            </span>
            <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0 z-[200]" align="start">
          <Command>
            <CommandInput placeholder="Search city..." />
            <CommandList>
              <CommandEmpty>No city found.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {CITIES.map((city) => (
                  <CommandItem
                    key={city}
                    value={city}
                    onSelect={() => handleCitySelect(city)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCity === city ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {city}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Area Selector - Only show when city is selected */}
      {selectedCity && areas.length > 0 && (
        <Popover open={areaOpen} onOpenChange={setAreaOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              role="combobox" 
              aria-expanded={areaOpen}
              className="w-full md:w-[180px] justify-between"
            >
              <span className="truncate">
                {selectedArea || "Select Area"}
              </span>
              <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0 z-[200]" align="start">
            <Command>
              <CommandInput placeholder="Search area..." />
              <CommandList>
                <CommandEmpty>No area found.</CommandEmpty>
                <CommandGroup className="max-h-[300px] overflow-y-auto">
                  {areas.map((area) => (
                    <CommandItem
                      key={area}
                      value={area}
                      onSelect={() => handleAreaSelect(area)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedArea === area ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {area}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* Clear Button */}
      {(selectedCity || selectedArea) && (
        <Button variant="ghost" size="icon" onClick={handleClear} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default LocationFilter;