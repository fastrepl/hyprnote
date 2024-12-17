import useEmblaCarousel from "embla-carousel-react";
import { Note } from "../../types";
import { EventCard } from "./EventCard";
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";
import { useCallback } from "react";

interface UpcomingEventsProps {
  futureNotes: Note[];
  onNoteClick: (noteId: string) => void;
}

export const UpcomingEvents = ({
  futureNotes,
  onNoteClick,
}: UpcomingEventsProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    slidesToScroll: 1,
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const limitedFutureNotes = futureNotes.slice(0, 10);

  return (
    <div className="relative">
      <h2 className="text-xl font-semibold">다가오는 이벤트</h2>
      <div className="relative">
        <div className="overflow-hidden px-2 py-4" ref={emblaRef}>
          <div className="flex gap-4">
            {limitedFutureNotes.map((note) => (
              <div
                key={note.id}
                className="w-[280px] flex-[0_0_auto] max-[400px]:w-full max-[400px]:flex-[0_0_100%]"
              >
                <EventCard note={note} onClick={() => onNoteClick(note.id)} />
              </div>
            ))}
          </div>
        </div>
        {limitedFutureNotes.length > 1 && (
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
};
