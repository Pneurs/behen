import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, X } from "lucide-react";

interface BrowseFiltersProps {
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  selectedSizes: string[];
  onSizesChange: (sizes: string[]) => void;
  maxPrice: number;
  alterationFilter: boolean;
  onAlterationFilterChange: (value: boolean) => void;
}

// Standard sizes
const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const BrowseFilters = ({
  priceRange,
  onPriceRangeChange,
  selectedSizes,
  onSizesChange,
  maxPrice,
  alterationFilter,
  onAlterationFilterChange,
}: BrowseFiltersProps) => {
  const [open, setOpen] = useState(false);
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>(priceRange);

  useEffect(() => {
    setLocalPriceRange(priceRange);
  }, [priceRange]);

  const toggleSize = (size: string) => {
    if (selectedSizes.includes(size)) {
      onSizesChange(selectedSizes.filter((s) => s !== size));
    } else {
      onSizesChange([...selectedSizes, size]);
    }
  };

  const handleApply = () => {
    onPriceRangeChange(localPriceRange);
    setOpen(false);
  };

  const handleClear = () => {
    onPriceRangeChange([0, maxPrice]);
    onSizesChange([]);
    setLocalPriceRange([0, maxPrice]);
    onAlterationFilterChange(false);
  };

  const hasActiveFilters = 
    priceRange[0] > 0 || 
    priceRange[1] < maxPrice || 
    selectedSizes.length > 0 ||
    alterationFilter;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full md:w-auto relative">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge className="ml-2 h-5 min-w-5 px-1 text-xs bg-primary text-primary-foreground">
              {(priceRange[0] > 0 || priceRange[1] < maxPrice ? 1 : 0) + (selectedSizes.length > 0 ? 1 : 0)}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 bg-popover border shadow-lg z-[200]" align="start">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Filters</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {/* Price Range Filter */}
          <div className="space-y-4">
            <Label className="font-medium">Price Range (PKR)</Label>
            <Slider
              value={localPriceRange}
              onValueChange={(value) => setLocalPriceRange(value as [number, number])}
              min={0}
              max={maxPrice}
              step={1000}
              className="w-full"
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={localPriceRange[0]}
                onChange={(e) => setLocalPriceRange([Number(e.target.value), localPriceRange[1]])}
                className="w-24 h-8 text-sm"
                placeholder="Min"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="number"
                value={localPriceRange[1]}
                onChange={(e) => setLocalPriceRange([localPriceRange[0], Number(e.target.value)])}
                className="w-24 h-8 text-sm"
                placeholder="Max"
              />
            </div>
          </div>

          {/* Size Filter - Standard Sizes */}
          <div className="space-y-3">
            <Label className="font-medium">Size</Label>
            <div className="flex flex-wrap gap-2">
              {STANDARD_SIZES.map((size) => (
                <Button
                  key={size}
                  variant={selectedSizes.includes(size) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleSize(size)}
                  className="h-8 px-3"
                >
                  {size}
                </Button>
              ))}
            </div>
          </div>

          {/* Alterable Products Filter */}
          <div className="space-y-3">
            <Label className="font-medium">Alterable Products</Label>
            <Button
              variant={alterationFilter ? "default" : "outline"}
              size="sm"
              onClick={() => onAlterationFilterChange(!alterationFilter)}
              className="w-full"
            >
              {alterationFilter ? "✓ Alterable Only" : "Show Alterable Only"}
            </Button>
          </div>

          <Button onClick={handleApply} className="w-full bg-primary hover:bg-primary/90">
            Apply Filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default BrowseFilters;