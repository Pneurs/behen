import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAKISTAN_LOCATIONS, CITIES } from "@/data/locations";

export const HeaderSearchPopup = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [cityOpen, setCityOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (keyword) params.append("search", keyword);
    if (selectedCity) params.append("city", selectedCity);
    if (selectedArea) params.append("area", selectedArea);
    if (selectedCategory && selectedCategory !== "all") params.append("category", selectedCategory);
    
    navigate(`/browse?${params.toString()}`);
    setOpen(false);
    // Reset fields
    setKeyword("");
    setSelectedCity("");
    setSelectedArea("");
    setSelectedCategory("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Search className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
