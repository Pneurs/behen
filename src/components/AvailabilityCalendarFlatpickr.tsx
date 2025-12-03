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

  // Fetch booked dates from all products
  useEffect(() => {
    const fetchBookedDates = async () => {
      setIsLoading(true);
      try {
        const { data: products } = await supabase
          .from("products")
          .select("availability_data")
          .eq("status", "published");

        if (products) {
          const allBookedDates: Date[] = [];
          products.forEach((product) => {
            const availData = product.availability_data as { blackout_dates?: string[] } | null;
            if (availData?.blackout_dates) {
              availData.blackout_dates.forEach((dateStr: string) => {
                allBookedDates.push(new Date(dateStr));
              });
            }
          });
          setBookedDates(allBookedDates);
        }
      } catch (error) {
        console.error("Error fetching booked dates:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookedDates();

    // Subscribe to realtime updates for product availability
    const channel = supabase
      .channel("products-availability")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          fetchBookedDates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
          {isLoading ? (
            <div className="flex items-center justify-center h-[280px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF69B4]" />
            </div>
          ) : (
            <FlatpickrCalendar
              mode="range"
              selectedDates={dateRange}
              onDateChange={handleDateChange}
              disabledDates={bookedDates}
              minDate={today}
              inline={true}
            />
          )}
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
