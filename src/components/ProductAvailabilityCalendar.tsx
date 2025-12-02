import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, CalendarX } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductAvailabilityCalendarProps {
  blackoutDates: Date[];
  nextAvailableDate?: Date | null;
}

const ProductAvailabilityCalendar = ({ 
  blackoutDates, 
  nextAvailableDate 
}: ProductAvailabilityCalendarProps) => {
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isDateBooked = (date: Date) => {
    return blackoutDates.some(bd => bd.toDateString() === date.toDateString());
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-[#FF69B4]" />
          Availability Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-[#FF69B4]/30" />
            <span className="text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-[#D3D3D3]" />
            <span className="text-muted-foreground">Booked/Unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-gray-300 opacity-50" />
            <span className="text-muted-foreground">Past Date</span>
          </div>
        </div>

        {/* Next Available Badge */}
        {nextAvailableDate && blackoutDates.some(d => d >= new Date()) && (
          <Badge variant="outline" className="w-full justify-center py-2 border-[#FF69B4] text-[#FF69B4]">
            <CalendarX className="mr-2 h-4 w-4" />
            Next available from: {nextAvailableDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </Badge>
        )}

        {/* Calendar */}
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={undefined}
            numberOfMonths={1}
            disabled={(date) => date < today || isDateBooked(date)}
            className={cn("rounded-md border pointer-events-auto")}
            modifiers={{
              booked: blackoutDates,
              available: (date) => date >= today && !isDateBooked(date),
            }}
            modifiersClassNames={{
              booked: "!bg-[#D3D3D3] !text-gray-500 !cursor-not-allowed !opacity-60 line-through",
              available: "bg-[#FF69B4]/20 text-foreground hover:!bg-[#FF69B4] hover:!text-white",
            }}
          />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Grey dates are booked or unavailable. Pink dates are available for booking.
        </p>
      </CardContent>
    </Card>
  );
};

export default ProductAvailabilityCalendar;
