import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  eachDayOfInterval, 
  isWeekend, 
  format, 
  parseISO
} from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculates the number of business days (excluding weekends and provided holidays)
 * between two dates inclusive.
 */
export function calculateBusinessDays(
  startDateStr: string,
  endDateStr: string,
  isHalfDay: boolean,
  holidays: string[] = [] // Array of ISO date strings 'YYYY-MM-DD'
): number {
  if (!startDateStr || !endDateStr) return 0;
  if (isHalfDay) return 0.5;

  try {
    const start = parseISO(startDateStr);
    const end = parseISO(endDateStr);

    if (start > end) return 0;

    const days = eachDayOfInterval({ start, end });
    
    const businessDays = days.filter(day => {
      // Check if it's a weekend
      if (isWeekend(day)) return false;
      
      // Check if it's a public holiday
      const formattedDay = format(day, 'yyyy-MM-dd');
      if (holidays.includes(formattedDay)) return false;
      
      return true;
    });

    return businessDays.length;
  } catch (e) {
    console.error("Error calculating business days:", e);
    return 0;
  }
}
