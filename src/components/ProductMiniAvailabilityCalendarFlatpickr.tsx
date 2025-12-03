import FlatpickrCalendar from "@/components/ui/flatpickr-calendar";

interface ProductMiniAvailabilityCalendarFlatpickrProps {
  blackoutDates: Date[];
}

const ProductMiniAvailabilityCalendarFlatpickr = ({
  blackoutDates,
}: ProductMiniAvailabilityCalendarFlatpickrProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="mt-3 rounded-lg border bg-muted/40 px-2 pb-2 pt-1">
      <p className="text-[11px] font-medium text-muted-foreground mb-1">
        Availability preview
      </p>
      <div className="mini-calendar-wrapper">
        <FlatpickrCalendar
          mode="single"
          disabledDates={blackoutDates}
          minDate={today}
          inline={true}
          onDateChange={() => {}}
          className="mini-calendar"
        />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Grey dates are booked or unavailable.
      </p>
    </div>
  );
};

export default ProductMiniAvailabilityCalendarFlatpickr;
