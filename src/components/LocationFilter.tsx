import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { MapPin, ChevronRight, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationFilterProps {
  selectedCity: string;
  selectedArea?: string;
  onCityChange: (city: string) => void;
  onAreaChange?: (area: string) => void;
}

// Comprehensive Pakistan cities and areas data
const PAKISTAN_LOCATIONS: Record<string, string[]> = {
  "Lahore": [
    "DHA Phase 1", "DHA Phase 2", "DHA Phase 3", "DHA Phase 4", "DHA Phase 5", 
    "DHA Phase 6", "DHA Phase 7", "DHA Phase 8", "DHA Phase 9", "DHA Phase 10",
    "Bahria Town", "Model Town", "Johar Town", "Gulberg", "Garden Town",
    "Faisal Town", "Iqbal Town", "Township", "Wapda Town", "Valencia Town",
    "Cantt", "Mall Road", "Shadman", "Ichra", "Anarkali", "Liberty",
    "Cavalry Ground", "Defence", "EME Society", "Askari", "Punjab Society",
    "PCSIR Society", "State Life Housing", "Lake City", "Paragon City"
  ],
  "Karachi": [
    "DHA Phase 1", "DHA Phase 2", "DHA Phase 3", "DHA Phase 4", "DHA Phase 5",
    "DHA Phase 6", "DHA Phase 7", "DHA Phase 8", "Clifton", "Bath Island",
    "PECHS", "Gulshan-e-Iqbal", "Gulistan-e-Johar", "North Nazimabad",
    "Nazimabad", "Federal B Area", "Saddar", "Korangi", "Landhi", "Malir",
    "Scheme 33", "Gulshan-e-Maymar", "Bahria Town", "Askari", "Navy Housing"
  ],
  "Islamabad": [
    "F-6", "F-7", "F-8", "F-10", "F-11", "G-6", "G-7", "G-8", "G-9", "G-10",
    "G-11", "G-13", "E-7", "E-11", "I-8", "I-9", "I-10", "I-14", "I-16",
    "DHA Phase 1", "DHA Phase 2", "Bahria Town Phase 1-8", "Blue Area",
    "Diplomatic Enclave", "Soan Garden", "PWD Housing", "Pakistan Town"
  ],
  "Rawalpindi": [
    "Bahria Town Phase 1-8", "DHA Phase 1", "DHA Phase 2", "Satellite Town",
    "Saddar", "Commercial Market", "Cantt", "Chaklala", "Westridge",
    "Askari", "Media Town", "PWD Housing", "Gulzar-e-Quaid", "Airport Housing"
  ],
  "Faisalabad": [
    "D Ground", "Peoples Colony", "Madina Town", "Gulberg", "Susan Road",
    "Samanabad", "Satiana Road", "Millat Town", "Eden Valley", "Canal Road"
  ],
  "Multan": [
    "Cantt", "Gulgasht Colony", "Shah Rukn-e-Alam", "Model Town", "Bosan Road",
    "Shalimar Colony", "Officers Colony", "Garden Town", "New Multan"
  ],
  "Peshawar": [
    "University Town", "Hayatabad Phase 1-7", "Saddar", "Cantt", "Gulbahar",
    "Board Bazaar", "Defence Colony", "Warsak Road", "Ring Road"
  ],
  "Quetta": [
    "Cantt", "Satellite Town", "Jinnah Town", "Zarghoon Road", "Airport Road",
    "Samungli Road", "Brewery Road", "Sariab Road"
  ],
  "Sialkot": [
    "Cantt", "Defence Road", "Paris Road", "Allama Iqbal Road", "Model Town",
    "Kashmir Road", "Hajipura", "Rangpura"
  ],
  "Gujranwala": [
    "Satellite Town", "Model Town", "Civil Lines", "Trust Colony", "DC Road",
    "GT Road", "Peoples Colony", "Green Town"
  ],
  "Hyderabad": [
    "Latifabad", "Qasimabad", "Auto Bhan Road", "Hussainabad", "Saddar"
  ],
  "Abbottabad": [
    "Jinnahabad", "Supply", "Mandian", "Cantt", "Link Road"
  ],
  "Bahawalpur": [
    "Model Town", "Satellite Town", "Civil Lines", "Chowk Bazaar"
  ],
  "Sargodha": [
    "Satellite Town", "University Road", "Cantt", "PAF Road"
  ],
  "Sukkur": [
    "Military Road", "Cantt", "Airport Road", "Shikarpur Road"
  ],
  "Larkana": [
    "Station Road", "Jinnah Bagh", "Sachal Colony"
  ],
  "Sahiwal": [
    "Model Town", "Farid Town", "High Court Road"
  ],
  "Mardan": [
    "Cantt", "Par Hoti", "Bank Road", "Shamsi Road"
  ],
  "Gujrat": [
    "Satellite Town", "Civil Lines", "GT Road", "Bhimber Road"
  ],
  "Kasur": [
    "Model Town", "Allama Iqbal Town", "Pattoki Road"
  ],
  "Rahim Yar Khan": [
    "Satellite Town", "Model Town", "Sadiq Abad"
  ],
  "Sheikhupura": [
    "Model Town", "Faisalabad Road", "Civil Lines"
  ],
  "Jhang": [
    "Satellite Town", "Civil Lines", "Faisalabad Road"
  ],
  "Dera Ghazi Khan": [
    "Block A", "Block B", "Civil Lines"
  ],
  "Nawabshah": [
    "Sakrand Road", "Station Road", "VIP Road"
  ],
  "Mirpur (AJK)": [
    "Sector F-1", "Sector F-2", "Allama Iqbal Road", "New City"
  ],
  "Muzaffarabad": [
    "Chehla Bandi", "Domail", "CMH Road"
  ]
};

const CITIES = Object.keys(PAKISTAN_LOCATIONS).sort();

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