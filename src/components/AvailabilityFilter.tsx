import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";

interface AvailabilityFilterProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

const AvailabilityFilter = ({ dateRange, onDateRangeChange }: AvailabilityFilterProps) => {
  const [open, setOpen] = useState(false);
  const [bookedDates, setBookedDates] = useState<Date[]>([]);

  // Fetch booked dates from all products
  useEffect(() => {
    const fetchBookedDates = async () => {
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
    };

    fetchBookedDates();
  }, []);

  const handleClear = () => {
    onDateRangeChange(undefined);
    setOpen(false);
  };

  const isDateBooked = (date: Date) => {
    return bookedDates.some(
      (bd) => bd.toDateString() === date.toDateString()
    );
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
        </div>

        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={onDateRangeChange}
          numberOfMonths={1}
          disabled={(date) => date < today || isDateBooked(date)}
          initialFocus
          className="pointer-events-auto p-3"
          modifiers={{
            booked: bookedDates,
          }}
          modifiersClassNames={{
            booked: "!bg-[#D3D3D3] !text-gray-500 !cursor-not-allowed !opacity-60",
          }}
        />
        
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

export default AvailabilityFilter;
