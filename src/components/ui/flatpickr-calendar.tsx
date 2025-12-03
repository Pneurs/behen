import Flatpickr from "react-flatpickr";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import { cn } from "@/lib/utils";

interface FlatpickrCalendarProps {
  mode?: "single" | "range" | "multiple";
  selectedDates?: Date | Date[] | { from?: Date; to?: Date };
  onDateChange?: (dates: Date[]) => void;
  disabledDates?: Date[];
  minDate?: Date;
  maxDate?: Date;
  inline?: boolean;
  placeholder?: string;
  className?: string;
  showMonths?: number;
}

const FlatpickrCalendar = ({
  mode = "range",
  selectedDates,
  onDateChange,
  disabledDates = [],
  minDate,
  maxDate,
  inline = false,
  placeholder = "Select dates",
  className,
  showMonths = 1,
}: FlatpickrCalendarProps) => {
  // Convert disabledDates to string format for flatpickr
  const disabledDateStrings = disabledDates.map(
    (d) => d.toISOString().split("T")[0]
  );

  // Convert selectedDates to array format
  const getDefaultDate = (): Date[] | undefined => {
    if (!selectedDates) return undefined;
    if (Array.isArray(selectedDates)) return selectedDates;
    if (selectedDates instanceof Date) return [selectedDates];
    if (typeof selectedDates === "object" && "from" in selectedDates) {
      const dates: Date[] = [];
      if (selectedDates.from) dates.push(selectedDates.from);
      if (selectedDates.to) dates.push(selectedDates.to);
      return dates.length > 0 ? dates : undefined;
    }
    return undefined;
  };

  const options: flatpickr.Options.Options = {
    mode,
    inline,
    dateFormat: "Y-m-d",
    altInput: !inline,
    altFormat: "M j, Y",
    minDate: minDate || "today",
    maxDate,
    showMonths,
    defaultDate: getDefaultDate(),
    disable: [
      (date: Date) => {
        const dateStr = date.toISOString().split("T")[0];
        return disabledDateStrings.includes(dateStr);
      },
    ],
    onChange: (dates: Date[]) => {
      onDateChange?.(dates);
    },
    onDayCreate: (dObj, dStr, fp, dayElem) => {
      const date = dayElem.dateObj;
      const dateStr = date.toISOString().split("T")[0];
      const isDisabled = disabledDateStrings.includes(dateStr);
      const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

      if (isDisabled) {
        dayElem.classList.add("flatpickr-disabled-booked");
        dayElem.setAttribute("title", "Unavailable - Already booked");
      } else if (!isPast) {
        dayElem.classList.add("flatpickr-available");
        dayElem.setAttribute("title", "Available for booking");
      }
    },
  };

  return (
    <div className={cn("flatpickr-behen-wrapper", className)}>
      <Flatpickr
        options={options}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          "ring-offset-background placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />
    </div>
  );
};

export default FlatpickrCalendar;
