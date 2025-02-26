import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@hypr/ui/components/ui/carousel";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@hypr/ui/components/ui/card";
import { Badge } from "@hypr/ui/components/ui/badge";
import { commands as dbCommands, type Event } from "@hypr/plugin-db";

export default function UpcomingEvents() {
  console.log("upcoming events");
  const data = useQuery({
    queryKey: ["events"],
    queryFn: () => dbCommands.listEvents(),
  });

  return (
    <div className="mb-8 space-y-4 pt-12">
      <h2 className="text-lg font-semibold">
        <Trans>Upcoming</Trans>
      </h2>

      <Carousel className="-ml-2">
        <CarouselContent className="px-2">
          {data.data?.map((event) => (
            <CarouselItem key={event.id} className="sm:basis-1/2 xl:basis-1/3">
              <EventCard event={event} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-0 top-1/2 z-10 hover:bg-neutral-50" />
        <CarouselNext className="absolute right-0 top-1/2 z-10 hover:bg-neutral-50" />
      </Carousel>
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const navigate = useNavigate();

  const participants = useQuery({
    queryKey: ["event-participants", event.id],
    queryFn: async () => dbCommands.listParticipants(event.id),
  });

  const session = useQuery({
    queryKey: ["event-session", event.id],
    queryFn: async () => dbCommands.getSession({ calendarEventId: event.id }),
  });

  const handleClick = () => {
    if (!session.data) {
      navigate({
        to: "/note/new",
        search: { eventId: event.id.toString() },
      });
    } else {
      navigate({
        to: "/app/note/$id",
        params: { id: session.data!.id },
      });
    }
  };

  const isEventInProgress = (event: Event) => {
    const now = new Date();
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    return now >= startDate && now <= endDate;
  };

  const getEventStatusClass = (event: Event) => {
    return isEventInProgress(event)
      ? "rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-600 shadow-sm shadow-red-500/20 animate-[pulse_1.5s_ease-in-out_infinite]"
      : "rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600";
  };

  function formatRemainingTime(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} later`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} later`;
    } else if (minutes > 1) {
      return `${minutes} minutes later`;
    } else if (minutes > 0) {
      return "Starting soon";
    } else {
      return "In progress";
    }
  }

  return (
    <Card
      onClick={handleClick}
      className="h-full cursor-pointer transition-all hover:bg-neutral-50"
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="truncate text-lg font-semibold">{event.name}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          {new Date(event.start_date).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}

          <Badge variant="outline" className={getEventStatusClass(event)}>
            {formatRemainingTime(new Date(event.start_date))}
          </Badge>
        </div>

        <div className="flex items-center">
          <span className="truncate text-sm text-neutral-600">
            {participants.data?.length
              ? participants.data.map((p) => p.full_name).join(", ")
              : "No participants"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
