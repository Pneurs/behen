import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { X, CalendarCheck, CalendarX } from "lucide-react";

interface AvailabilityCalendarManagerProps {
  blackoutDates: Date[];
  onBlackoutDatesChange: (dates: Date[]) => void;
}

const AvailabilityCalendarManager = ({ 
  blackoutDates, 
  onBlackoutDatesChange 
}: AvailabilityCalendarManagerProps) => {
  const [selectedDates, setSelectedDates] = useState<Date[]>(blackoutDates);
  const [mode, setMode] = useState<"available" | "blocked">("blocked");

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (!dates || dates.length === 0) return;

    // Normalize dates to midnight UTC
    const normalizedDates = dates.map(date => new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0, 0, 0, 0
    )));

    let newDates: Date[];
    if (mode === "blocked") {
      // Add to blackout dates
      const existingDatesSet = new Set(selectedDates.map(d => d.getTime()));
      const datesToAdd = normalizedDates.filter(d => !existingDatesSet.has(d.getTime()));
      newDates = [...selectedDates, ...datesToAdd];
    } else {
      // Remove from blackout dates (mark as available)
      const datesToRemoveSet = new Set(normalizedDates.map(d => d.getTime()));
      newDates = selectedDates.filter(d => !datesToRemoveSet.has(d.getTime()));
    }

    setSelectedDates(newDates);
    onBlackoutDatesChange(newDates);
  };

  const removeDate = (dateToRemove: Date) => {
    const newDates = selectedDates.filter(
      (d) => d.getTime() !== dateToRemove.getTime()
    );
    setSelectedDates(newDates);
    onBlackoutDatesChange(newDates);
  };

  const isDateBlocked = (date: Date) => {
    const checkDate = new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0, 0, 0, 0
    ));
    return selectedDates.some(
      (d) => d.getTime() === checkDate.getTime()
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-primary" />
          Availability Calendar
        </CardTitle>
        <CardDescription>
          Mark dates when your item will NOT be available for rent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "blocked" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("blocked")}
          >
            <CalendarX className="mr-2 h-4 w-4" />
            Mark Unavailable
          </Button>
          <Button
            type="button"
            variant={mode === "available" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("available")}
          >
            <CalendarCheck className="mr-2 h-4 w-4" />
            Mark Available
          </Button>
        </div>

        {/* Calendar */}
        <div className="flex justify-center">
          <Calendar
            mode="multiple"
            selected={[]}
            onSelect={handleDateSelect}
            numberOfMonths={1}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            className={cn("rounded-md border pointer-events-auto")}
            modifiers={{
              blocked: selectedDates,
              available: (date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date >= today && !isDateBlocked(date);
              },
            }}
            modifiersClassNames={{
              blocked: "bg-destructive text-destructive-foreground font-bold line-through hover:bg-destructive hover:text-destructive-foreground",
              available: "bg-green-100 text-green-900 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-100 dark:hover:bg-green-900/50",
            }}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          💡 Tip: Hold Shift and click to select date ranges quickly
        </p>

        {/* Blocked Dates List */}
        {selectedDates.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Blocked Dates ({selectedDates.length})</p>
            <div className="flex flex-wrap gap-2">
              {selectedDates
                .sort((a, b) => a.getTime() - b.getTime())
                .map((date, index) => (
                  <Badge
                    key={index}
                    variant="destructive"
                    className="flex items-center gap-1"
                  >
                    {format(date, "MMM dd, yyyy")}
                    <button
                      type="button"
                      onClick={() => removeDate(date)}
                      className="ml-1 hover:bg-destructive-foreground/20 rounded-full p-0.5"
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

export default AvailabilityCalendarManager;
