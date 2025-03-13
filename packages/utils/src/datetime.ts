import { format } from "date-fns";

export const formatDate = (date: Date, formatString: string) => {
  return format(date, formatString);
};
