import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface ProductMiniAvailabilityCalendarProps {
  blackoutDates: Date[];
}

const ProductMiniAvailabilityCalendar = ({
  blackoutDates,
}: ProductMiniAvailabilityCalendarProps) => {
  return (
    <div className="mt-3 rounded-lg border bg-muted/40 px-2 pb-2 pt-1">
      <p className="text-[11px] font-medium text-muted-foreground mb-1">
        Availability preview
      </p>
      <Calendar
        mode="single"
        selected={undefined}
        numberOfMonths={1}
        showOutsideDays={false}
        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
        className={cn("rounded-md border pointer-events-auto text-[10px]")}
        modifiers={{
          booked: blackoutDates,
        }}
        modifiersClassNames={{
          booked:
            "bg-destructive text-destructive-foreground font-bold opacity-60",
        }}
      />
      <p className="mt-1 text-[10px] text-muted-foreground">
        Marked dates are booked or unavailable.
      </p>
    </div>
  );
};

export default ProductMiniAvailabilityCalendar;
