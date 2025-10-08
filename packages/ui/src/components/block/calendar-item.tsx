interface CalendarItemProps {
    eventName: string;
}

export const CalendarItem = ({ eventName }: CalendarItemProps) => {
    return <div className="text-xs bg-blue-100 px-1.5 py-0.5 rounded truncate">{eventName}</div>
}