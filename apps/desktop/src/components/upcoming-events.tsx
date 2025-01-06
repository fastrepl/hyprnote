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

import type { Event, Participant } from "@/types/db";

interface UpcomingEventsProps {
  events: Event[];
  handleClickEvent: (event: Event) => void;
}

export default function UpcomingEvents({ events }: UpcomingEventsProps) {
  return (
    <div className="text-foreground">
      <h2 className="text-2xl font-semibold mb-4">Upcoming Events</h2>

      <div className="relative">
        <Carousel className="w-full">
          <CarouselContent>
            {events.map((event) => (
              <CarouselItem key={event.id} className="md:basis-1/2 lg:basis-1/3">
                <EventCard event={event} handleClickEvent={() => {}} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="absolute left-0 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
          <CarouselNext className="absolute right-0 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
        </Carousel>
      </div>
    </div>
  );
}

interface EventCardProps {
  event: Event;
  handleClickEvent: (event: Event) => void;
}

function EventCard({ event, handleClickEvent }: EventCardProps) {
  return (
    <Card
      className="h-full cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => handleClickEvent(event)}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="truncate text-lg font-semibold">{event.name}</span>
          <Badge variant="outline">{event.platform}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
            {event.participants.map((participant: Participant) => (
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
