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
            <div className="h-4 w-4 rounded bg-green-100 border border-green-300" />
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
            numberOfMonths={2}
            disabled={(date) => date < new Date() || date < new Date(new Date().setHours(0, 0, 0, 0))}
            className={cn("rounded-md border")}
            modifiers={{
              booked: blackoutDates,
            }}
            modifiersClassNames={{
              booked: "bg-destructive text-destructive-foreground font-bold line-through opacity-50",
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
