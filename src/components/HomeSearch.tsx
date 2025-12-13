import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, ChevronRight, Check, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { PAKISTAN_LOCATIONS, CITIES } from "@/data/locations";

const CATEGORIES = [
  { value: "bridal", label: "Bridal" },
  { value: "barat", label: "Barat" },
  { value: "walima", label: "Walima" },
  { value: "formal", label: "Formal" },
  { value: "party_wear", label: "Party Wear" },
  { value: "footwear", label: "Footwear" },
  { value: "accessories", label: "Accessories" },
  { value: "jewelry", label: "Jewelry" },
  { value: "bags", label: "Bags" },
];

export const HomeSearch = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [cityOpen, setCityOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);

  const areas = selectedCity ? PAKISTAN_LOCATIONS[selectedCity] || [] : [];

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setSelectedArea(""); // Reset area when city changes
    setCityOpen(false);
  };

  const handleAreaSelect = (area: string) => {
    setSelectedArea(area);
    setAreaOpen(false);
  };

  const handleClearLocation = () => {
    setSelectedCity("");
    setSelectedArea("");
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (selectedCity) params.append("city", selectedCity);
    if (selectedArea) params.append("area", selectedArea);
    if (selectedCategory) params.append("category", selectedCategory);
    
    navigate(`/browse?${params.toString()}`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-card p-6 rounded-2xl shadow-lg">
      <div className="flex flex-col gap-4">
        {/* Search Input */}
        <div className="w-full">
          <Input
            placeholder="Search dresses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12"
          />
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          {/* City Selector */}
          <div className="flex gap-2 flex-1">
            <Popover open={cityOpen} onOpenChange={setCityOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  role="combobox" 
                  aria-expanded={cityOpen}
                  className="w-full md:w-[180px] h-12 justify-between"
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
                    className="w-full md:w-[180px] h-12 justify-between"
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

            {/* Clear Location Button */}
            {(selectedCity || selectedArea) && (
              <Button variant="ghost" size="icon" onClick={handleClearLocation} className="shrink-0 h-12 w-12">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-[200px] h-12">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleSearch} size="lg" className="h-12 px-8">
            <Search className="mr-2 h-5 w-5" />
            Search
          </Button>
        </div>
      </div>
    </div>
  );
};
