import { useCallback } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";
import useEmblaCarousel from "embla-carousel-react";
import { Trans } from "@lingui/react/macro";

import type { Event } from "../types";

interface UpcomingEventsProps {
  events: Event[];
  handleClickEvent: (event: Event) => void;
}

export default function UpcomingEvents({
  events,
  handleClickEvent,
}: UpcomingEventsProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    slidesToScroll: 1,
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollPrev();
    }
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollNext();
    }
  }, [emblaApi]);

  return (
    <div className="relative">
      <h2 className="text-xl font-semibold">
        <Trans>Upcoming Events</Trans>
      </h2>

      <div className="relative">
        <div className="overflow-hidden px-2 py-4" ref={emblaRef}>
          <div className="flex gap-4">
            {events.map((event) => (
              <pre>{JSON.stringify(event, null, 2)}</pre>
            ))}
          </div>
        </div>

        {events.length > 1 && (
          <>
            <button
              onClick={scrollPrev}
              className="absolute -left-4 top-1/2 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg hover:bg-gray-50"
            >
              <RiArrowLeftSLine className="size-5" />
            </button>
            <button
              onClick={scrollNext}
              className="absolute -right-4 top-1/2 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg hover:bg-gray-50"
            >
              <RiArrowRightSLine className="size-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
