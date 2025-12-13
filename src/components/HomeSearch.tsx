import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, ChevronRight, Check, X, ChevronsUpDown } from "lucide-react";
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
  const [keyword, setKeyword] = useState("");
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
    if (keyword) params.append("search", keyword);
    if (selectedCity) params.append("city", selectedCity);
    if (selectedArea) params.append("area", selectedArea);
    if (selectedCategory) params.append("category", selectedCategory);
    
    navigate(`/browse?${params.toString()}`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-card p-6 rounded-2xl shadow-lg">
      <div className="flex flex-col gap-4">
        
        {/* All elements in one row */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search dresses, designers..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-10 h-12 bg-background border-input"
            />
          </div>

          {/* City Selector */}
          <Popover open={cityOpen} onOpenChange={setCityOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                role="combobox" 
                aria-expanded={cityOpen}
                className="w-full lg:w-[150px] h-12 justify-between"
              >
                <span className="flex items-center truncate">
                  <MapPin className="mr-2 h-4 w-4 shrink-0" />
                  {selectedCity || "City"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 z-[200] bg-popover border shadow-lg" align="start">
              <Command>
                <CommandInput placeholder="Search city..." />
                <CommandList>
                  <CommandEmpty>No city found.</CommandEmpty>
                  <CommandGroup>
                    {CITIES.map((city) => (
                      <CommandItem
                        key={city}
                        value={city}
                        onSelect={() => {
                          setSelectedCity(city === selectedCity ? "" : city);
                          setSelectedArea("");
                          setCityOpen(false);
                        }}
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

          {/* Area Selector - Only show if city selected */}
          {selectedCity && PAKISTAN_LOCATIONS[selectedCity] && (
            <Popover open={areaOpen} onOpenChange={setAreaOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  role="combobox" 
                  aria-expanded={areaOpen}
                  className="w-full lg:w-[150px] h-12 justify-between"
                >
                  <span className="truncate">
                    {selectedArea || "Area"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0 z-[200] bg-popover border shadow-lg" align="start">
                <Command>
                  <CommandInput placeholder="Search area..." />
                  <CommandList>
                    <CommandEmpty>No area found.</CommandEmpty>
                    <CommandGroup>
                      {PAKISTAN_LOCATIONS[selectedCity].map((area) => (
                        <CommandItem
                          key={area}
                          value={area}
                          onSelect={() => {
                            setSelectedArea(area === selectedArea ? "" : area);
                            setAreaOpen(false);
                          }}
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

          {/* Category Selector */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full lg:w-[150px] h-12 bg-background">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-popover border shadow-lg z-[200]">
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="bridal">Bridal</SelectItem>
              <SelectItem value="barat">Barat</SelectItem>
              <SelectItem value="walima">Walima</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
              <SelectItem value="party_wear">Party Wear</SelectItem>
              <SelectItem value="footwear">Footwear</SelectItem>
              <SelectItem value="accessories">Accessories</SelectItem>
              <SelectItem value="jewelry">Jewelry</SelectItem>
              <SelectItem value="bags">Bags</SelectItem>
            </SelectContent>
          </Select>

          {/* Search Button */}
          <Button onClick={handleSearch} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 lg:w-auto w-full">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </div>
      </div>
    </div>
  );
};
