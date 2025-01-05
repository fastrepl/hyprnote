import { Trans } from "@lingui/react/macro";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@hypr/ui/components/ui/carousel";

import type { Event } from "@/types/db";

interface UpcomingEventsProps {
  events: Event[];
  handleClickEvent: (event: Event) => void;
}

export default function UpcomingEvents({ events }: UpcomingEventsProps) {
  return (
    <div className="text-foreground">
      <h2 className="text-xl font-semibold">
        <Trans>Upcoming Events</Trans>
      </h2>

      <Carousel>
        <CarouselContent>
          {events.map((event) => (
            <CarouselItem className="basis-1/3">
              <pre>{JSON.stringify(event, null, 2)}</pre>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}
