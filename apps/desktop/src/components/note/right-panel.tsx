import { useSession } from "@/contexts";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { ScrollArea } from "@hypr/ui/components/ui/scroll-area";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@hypr/ui/components/ui/tabs";

export default function RightPanel() {
  const { timeline } = useSession((s) => ({
    timeline: s.timeline,
  }));

  return (
    <Tabs defaultValue="transcript" className="p-1">
      <TabsList className="w-full">
        <TabsTrigger className="flex-1 text-xs" value="transcript">
          Transcript
        </TabsTrigger>
        <TabsTrigger className="flex-1 text-xs" value="summary">
          Summary
        </TabsTrigger>
      </TabsList>

      <TabsContent value="transcript">
        <div className="flex h-full flex-col justify-end">
          <ScrollArea type="auto" className="flex-1 p-2">
            <div className="space-y-4 text-sm">
              {timeline.items.map(({ speaker, text, start, end }) => (
                <div className="flex flex-row gap-2" key={`${start}-${end}`}>
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {speaker[speaker.length - 1]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg bg-muted px-3 py-1 text-neutral-200">
                    {text}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </TabsContent>

      <TabsContent value="summary">
        <div className="flex h-full flex-col justify-end">
          <ScrollArea type="auto" className="flex-1 p-2">
            123
          </ScrollArea>
        </div>
      </TabsContent>
    </Tabs>
  );
}
