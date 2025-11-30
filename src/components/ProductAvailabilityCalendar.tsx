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
  
  // Get all dates from today to 3 months ahead
  const getAvailableDates = () => {
    const dates: Date[] = [];
    const today = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    
    for (let d = new Date(today); d <= threeMonthsLater; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toDateString();
      const isBlackedOut = blackoutDates.some(bd => bd.toDateString() === dateStr);
      if (!isBlackedOut) {
        dates.push(new Date(d));
      }
    }
    return dates;
  };

  const availableDates = getAvailableDates();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-primary" />
          Availability Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-green-500" />
            <span className="text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-destructive line-through" />
            <span className="text-muted-foreground">Booked/Unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-gray-200" />
            <span className="text-muted-foreground">Past Date</span>
          </div>
        </div>

        {/* Next Available Badge */}
        {nextAvailableDate && blackoutDates.some(d => d >= new Date()) && (
          <Badge variant="outline" className="w-full justify-center py-2">
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
            disabled={(date) => date < new Date() || date < new Date(new Date().setHours(0, 0, 0, 0))}
            className={cn("rounded-md border pointer-events-auto")}
            modifiers={{
              booked: blackoutDates,
              available: availableDates,
            }}
            modifiersClassNames={{
              booked: "bg-destructive text-destructive-foreground font-bold line-through opacity-50",
              available: "bg-green-500 text-white font-semibold hover:bg-green-600",
            }}
          />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Red crossed dates are already booked or unavailable. Green dates are available for booking.
        </p>
      </CardContent>
    </Card>
  );
};

export default ProductAvailabilityCalendar;
