import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { X, CalendarCheck, CalendarX } from "lucide-react";
import FlatpickrCalendar from "@/components/ui/flatpickr-calendar";

interface AvailabilityCalendarManagerFlatpickrProps {
  blackoutDates: Date[];
  onBlackoutDatesChange: (dates: Date[]) => void;
}

const AvailabilityCalendarManagerFlatpickr = ({ 
  blackoutDates, 
  onBlackoutDatesChange 
}: AvailabilityCalendarManagerFlatpickrProps) => {
  const [selectedDates, setSelectedDates] = useState<Date[]>(blackoutDates);

  useEffect(() => {
    setSelectedDates(blackoutDates);
  }, [blackoutDates]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const handleDateChange = (dates: Date[]) => {
    // In multiple mode, flatpickr returns all selected dates
    setSelectedDates(dates);
    onBlackoutDatesChange(dates);
  };

  const removeDate = (dateToRemove: Date) => {
    const newDates = selectedDates.filter((d) => !isSameDay(d, dateToRemove));
    setSelectedDates(newDates);
    onBlackoutDatesChange(newDates);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-[#FF69B4]" />
          Availability Calendar
        </CardTitle>
        <CardDescription>
          Mark dates when your item will NOT be available for rent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarX className="h-4 w-4" />
          <span>Click on dates to mark them as unavailable. Click again to unmark.</span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-[#FF69B4]/20" />
            <span className="text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-[#D3D3D3]" />
            <span className="text-muted-foreground">Blocked</span>
          </div>
        </div>

        {/* Calendar */}
        <div className="flex justify-center">
          <FlatpickrCalendar
            mode="multiple"
            selectedDates={selectedDates}
            onDateChange={handleDateChange}
            minDate={today}
            inline={true}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          Click dates to block them. Click again to unblock. You can select multiple dates.
        </p>

        {/* Blocked Dates List */}
        {selectedDates.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Blocked Dates ({selectedDates.length})</p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {selectedDates
                .sort((a, b) => a.getTime() - b.getTime())
                .map((date, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 bg-[#D3D3D3] text-gray-700"
                  >
                    {format(date, "MMM dd, yyyy")}
                    <button
                      type="button"
                      onClick={() => removeDate(date)}
                      className="ml-1 hover:bg-gray-400/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          By default, all future dates are available. Only mark dates when your item is already
          booked or unavailable.
        </p>
      </CardContent>
    </Card>
  );
};

export default AvailabilityCalendarManagerFlatpickr;
