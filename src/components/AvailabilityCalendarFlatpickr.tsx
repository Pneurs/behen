import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import FlatpickrCalendar from "@/components/ui/flatpickr-calendar";

interface DateRange {
  from?: Date;
  to?: Date;
}

interface AvailabilityCalendarFlatpickrProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

const AvailabilityCalendarFlatpickr = ({ 
  dateRange, 
  onDateRangeChange 
}: AvailabilityCalendarFlatpickrProps) => {
  const [open, setOpen] = useState(false);
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Note: We don't disable dates globally - each product has its own availability
  // The calendar here is just for selecting a date range to filter products
  useEffect(() => {
    setIsLoading(false);
    // We intentionally DON'T fetch and block booked dates globally
    // Each product's availability is independent and shown on the product card/detail page
  }, []);

  const handleClear = () => {
    onDateRangeChange(undefined);
    setOpen(false);
  };

  const handleDateChange = (dates: Date[]) => {
    if (dates.length === 0) {
      onDateRangeChange(undefined);
    } else if (dates.length === 1) {
      onDateRangeChange({ from: dates[0], to: undefined });
    } else if (dates.length >= 2) {
      onDateRangeChange({ from: dates[0], to: dates[1] });
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full md:w-auto justify-start">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
              </>
            ) : (
              format(dateRange.from, "MMM dd, yyyy")
            )
          ) : (
            "Select dates"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Check Availability</p>
            {dateRange && (
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Select dates to see available dresses
          </p>
        </div>
        
        {/* Legend */}
        <div className="px-3 py-2 border-b flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-[#FF69B4]" />
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-[#D3D3D3]" />
            <span>Unavailable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-[#FF69B4]/20" />
            <span>Available</span>
          </div>
        </div>

        <div className="p-3">
          <FlatpickrCalendar
            mode="range"
            selectedDates={dateRange}
            onDateChange={handleDateChange}
            disabledDates={[]} 
            minDate={today}
            inline={true}
          />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Select dates to filter products by availability
          </p>
        </div>
        
        <div className="p-3 border-t">
          <Button 
            className="w-full bg-[#FF69B4] hover:bg-[#FF69B4]/90" 
            onClick={() => setOpen(false)}
          >
            Apply Dates
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AvailabilityCalendarFlatpickr;
