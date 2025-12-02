import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface ProductMiniAvailabilityCalendarProps {
  blackoutDates: Date[];
}

const ProductMiniAvailabilityCalendar = ({
  blackoutDates,
}: ProductMiniAvailabilityCalendarProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isDateBooked = (date: Date) => {
    return blackoutDates.some(bd => bd.toDateString() === date.toDateString());
  };

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
        disabled={(date) => date < today || isDateBooked(date)}
        className={cn("rounded-md border pointer-events-auto text-[10px]")}
        modifiers={{
          booked: blackoutDates,
          available: (date) => date >= today && !isDateBooked(date),
        }}
        modifiersClassNames={{
          booked: "!bg-[#D3D3D3] !text-gray-500 !cursor-not-allowed !opacity-60",
          available: "bg-[#FF69B4]/20 hover:!bg-[#FF69B4] hover:!text-white",
        }}
      />
      <p className="mt-1 text-[10px] text-muted-foreground">
        Grey dates are booked or unavailable.
      </p>
    </div>
  );
};

export default ProductMiniAvailabilityCalendar;
