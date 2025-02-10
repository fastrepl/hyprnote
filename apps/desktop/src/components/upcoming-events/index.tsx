import { Trans } from "@lingui/react/macro";
import { type Event } from "@/types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@hypr/ui/components/ui/carousel";
import { EventCard } from "./event-card";

export default function UpcomingEvents({ events }: { events: Event[] }) {
  return (
    <div className="mb-8 space-y-4 pt-12">
      <h2 className="text-lg font-semibold">
        <Trans>Upcoming</Trans>
      </h2>

      <Carousel>
        <CarouselContent className="px-2">
          {events.map((event) => (
            <CarouselItem
              key={event.id}
              className="sm:basis-1/2 xl:basis-1/3 2xl:basis-1/4"
            >
              <EventCard event={event} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-0 top-1/2 z-10 hover:bg-secondary/90" />
        <CarouselNext className="absolute right-0 top-1/2 z-10 hover:bg-secondary/90" />
      </Carousel>
    </div>
  );
}
