import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Trans } from "@lingui/react/macro";
import { Calendar, Clock, Users } from "lucide-react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@hypr/ui/components/ui/carousel";
import { Badge } from "@hypr/ui/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@hypr/ui/components/ui/card";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@hypr/ui/components/ui/avatar";

import type { Event, Participant } from "@/types/tauri";

interface UpcomingEventsProps {
  events: Event[];
  handleClickEvent: (event: Event) => void;
}

export default function UpcomingEvents({ events }: UpcomingEventsProps) {
  const navigate = useNavigate();

  const handleClickEvent = useCallback(
    (event: Event) => {
      navigate({
        to: "/note/$id",
        params: { id: event.id.toString() },
      });
    },
    [navigate],
  );

  return (
    <div className="flex flex-col gap-4 text-foreground">
      <h2 className="text-2xl font-semibold">
        <Trans>Upcoming Events</Trans>
      </h2>
      <Carousel>
        <CarouselContent>
          {events.map((event) => (
            <CarouselItem key={event.id} className="md:basis-1/2 lg:basis-1/3">
              <div onClick={() => handleClickEvent(event)}>
                <EventCard event={event} />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="absolute left-2 top-1/2 flex items-center justify-center">
          <CarouselPrevious className="relative left-0 translate-x-0 hover:translate-x-0 hover:bg-secondary/90" />
        </div>
        <div className="absolute right-2 top-1/2 flex items-center justify-center">
          <CarouselNext className="relative right-0 translate-x-0 hover:translate-x-0 hover:bg-secondary/90" />
        </div>
      </Carousel>
    </div>
  );
}

interface EventCardProps {
  event: Event;
}

function EventCard({ event }: EventCardProps) {
  return (
    <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="truncate text-lg font-semibold">{event.name}</span>
          <Badge variant="outline">{event.platform}</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="mr-2 h-4 w-4" />
          <span>{new Date(event.start_date).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="mr-2 h-4 w-4" />
          <span>
            {new Date(event.start_date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            -
            {new Date(event.end_date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="flex items-center">
          <Users className="mr-2 h-4 w-4 text-muted-foreground" />
          <div className="flex -space-x-2">
            {[].map((participant: Participant) => (
              <Avatar
                key={participant.email}
                className="h-6 w-6 border-2 border-background"
              >
                <AvatarImage
                  src={`https://api.dicebear.com/6.x/initials/svg?seed=${participant.name}`}
                />
                <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
        {event.note && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {event.note}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
