import {
  WidgetTwoByTwo,
  WidgetTwoByTwoWrapper,
} from "@hypr/ui/components/ui/widgets";
import { ClockItem } from "../components/clock-item";

const WorldClock2x2: WidgetTwoByTwo = () => {
  const timezones = [
    { timezone: "America/New_York", city: "New York" },
    { timezone: "Europe/London", city: "London" },
    { timezone: "Asia/Tokyo", city: "Tokyo" },
    { timezone: "Australia/Sydney", city: "Sydney" },
  ];

  return (
    <WidgetTwoByTwoWrapper>
      <div className="grid grid-cols-2 grid-rows-2 h-full w-full">
        {timezones.map((tz, index) => (
          <ClockItem key={index} timezone={tz.timezone} city={tz.city} />
        ))}
      </div>
    </WidgetTwoByTwoWrapper>
  );
};

export default WorldClock2x2;
