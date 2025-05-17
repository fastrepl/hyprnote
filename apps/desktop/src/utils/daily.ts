export const daily = {
  today: () => {
    const now = new Date();
    return now.toISOString().split("T")[0].replace(/-/g, "");
  },
  render: (date: string | Date) => {
    const d = (typeof date === "string") ? new Date(date) : date;
    return d.toISOString().split("T")[0].replace(/-/g, "");
  },
};
