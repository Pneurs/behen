import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Check, ChevronsUpDown, Clock, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAKISTAN_LOCATIONS, CITIES } from "@/data/locations";

interface RecentSearch {
  keyword?: string;
  city?: string;
  area?: string;
  category?: string;
  timestamp: number;
}

const POPULAR_SEARCHES = [
  { label: "Bridal Dresses", category: "bridal" },
  { label: "Party Wear", category: "party_wear" },
  { label: "Walima Collection", category: "walima" },
  { label: "Formal Wear", category: "formal" },
  { label: "Wedding Jewelry", category: "jewelry" },
];

const STORAGE_KEY = "behen_recent_searches";
const MAX_RECENT_SEARCHES = 5;

export const HeaderSearchPopup = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [cityOpen, setCityOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecentSearches(parsed);
      } catch (e) {
        console.error("Failed to parse recent searches");
      }
    }
  }, [open]);

  const saveRecentSearch = (search: RecentSearch) => {
    const updated = [
      search,
      ...recentSearches.filter(
        (s) => 
          s.keyword !== search.keyword || 
          s.city !== search.city || 
          s.category !== search.category
      ),
    ].slice(0, MAX_RECENT_SEARCHES);
    
    setRecentSearches(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const removeRecentSearch = (index: number) => {
    const updated = recentSearches.filter((_, i) => i !== index);
    setRecentSearches(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (keyword) params.append("search", keyword);
    if (selectedCity) params.append("city", selectedCity);
    if (selectedArea) params.append("area", selectedArea);
    if (selectedCategory && selectedCategory !== "all") params.append("category", selectedCategory);
    
    // Save to recent searches
    if (keyword || selectedCity || selectedCategory) {
      saveRecentSearch({
        keyword: keyword || undefined,
        city: selectedCity || undefined,
        area: selectedArea || undefined,
        category: selectedCategory || undefined,
        timestamp: Date.now(),
      });
    }
    
    navigate(`/browse?${params.toString()}`);
    setOpen(false);
    // Reset fields
    setKeyword("");
    setSelectedCity("");
    setSelectedArea("");
    setSelectedCategory("");
  };

  const applyRecentSearch = (search: RecentSearch) => {
    const params = new URLSearchParams();
    if (search.keyword) params.append("search", search.keyword);
    if (search.city) params.append("city", search.city);
    if (search.area) params.append("area", search.area);
    if (search.category) params.append("category", search.category);
    
    navigate(`/browse?${params.toString()}`);
    setOpen(false);
  };

  const applyPopularSearch = (category: string) => {
    navigate(`/browse?category=${category}`);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const getSearchLabel = (search: RecentSearch) => {
    const parts = [];
    if (search.keyword) parts.push(`"${search.keyword}"`);
    if (search.category) parts.push(search.category.replace("_", " "));
    if (search.city) parts.push(search.city);
    if (search.area) parts.push(search.area);
    return parts.join(" in ") || "All products";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Search className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Search Products
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          {/* Keyword Search */}
          <div>
            <Input
              placeholder="Search dresses, designers..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-11"
              autoFocus
            />
          </div>

          {/* City & Area */}
          <div className="flex gap-2">
            <Popover open={cityOpen} onOpenChange={setCityOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  role="combobox" 
                  aria-expanded={cityOpen}
                  className="flex-1 justify-between h-11"
                >
                  <span className="flex items-center truncate">
                    <MapPin className="mr-2 h-4 w-4 shrink-0" />
                    {selectedCity || "Select City"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0 z-[300] bg-popover border shadow-lg" align="start">
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

            {selectedCity && PAKISTAN_LOCATIONS[selectedCity] && (
              <Popover open={areaOpen} onOpenChange={setAreaOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    role="combobox" 
                    aria-expanded={areaOpen}
                    className="flex-1 justify-between h-11"
                  >
                    <span className="truncate">
                      {selectedArea || "Select Area"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0 z-[300] bg-popover border shadow-lg" align="start">
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
          </div>

          {/* Category */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-popover border shadow-lg z-[300]">
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
          <Button onClick={handleSearch} className="w-full h-11">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Recent Searches
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={clearRecentSearches}
                >
                  Clear All
                </Button>
              </div>
              <div className="space-y-1">
                {recentSearches.map((search, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between group"
                  >
                    <button
                      onClick={() => applyRecentSearch(search)}
                      className="flex-1 text-left text-sm py-1.5 px-2 rounded-md hover:bg-muted transition-colors truncate"
                    >
                      {getSearchLabel(search)}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeRecentSearch(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Popular Searches */}
          <div className="pt-2 border-t">
            <span className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4" />
              Popular Searches
            </span>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((item) => (
                <Button
                  key={item.category}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => applyPopularSearch(item.category)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
