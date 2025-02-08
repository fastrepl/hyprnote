import { Trans } from "@lingui/react/macro";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@hypr/ui/components/ui/carousel";
import { type Event } from "@/types/tauri.gen";
import { EventCard } from "@/components/upcoming-events/event-card";

interface UpcomingEventsProps {
  events: Event[];
}

export default function UpcomingEvents({ events }: UpcomingEventsProps) {
  return (
    <div className="container mx-auto mb-8 flex flex-col gap-4 pt-12 text-foreground">
      <h2 className="text-2xl font-semibold">
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
