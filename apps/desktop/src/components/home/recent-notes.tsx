import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@hypr/ui/components/ui/carousel";

export default function RecentNotes() {
  return (
    <div className="mb-8 space-y-4">
      <h2 className="text-2xl font-bold">Recently Opened</h2>
      <Carousel className="-ml-2">
        <CarouselContent className="px-2">
          {[...Array(7)].map((_, i) => (
            <CarouselItem key={i} className="basis-auto">
              <div className="h-40 w-40 p-4 cursor-pointer transition-all border rounded-lg hover:bg-neutral-50 flex flex-col">
                <div className="font-medium text-base truncate">
                  Lorem ipsum dolor sit amet
                </div>
                <div className="mt-1 text-sm text-neutral-600 line-clamp-5">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                  do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  Ut enim ad minim veniam, quis nostrud exercitation.
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-0 top-1/2 z-10 hover:bg-neutral-50" />
        <CarouselNext className="absolute right-0 top-1/2 z-10 hover:bg-neutral-50" />
      </Carousel>
    </div>
  );
}
