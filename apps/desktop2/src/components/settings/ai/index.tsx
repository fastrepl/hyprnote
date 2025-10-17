import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hypr/ui/components/ui/tabs";
import { LLM } from "./llm";
import { STT } from "./stt";

export function SettingsAI() {
  const [activeTab, setActiveTab] = useState<"transcription" | "intelligence">("transcription");

  return (
    <div>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="mb-6 w-full grid grid-cols-2">
          <TabsTrigger value="transcription">Transcription</TabsTrigger>
          <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
        </TabsList>
        <TabsContent value="transcription" className="w-full">
          <STT />
        </TabsContent>
        <TabsContent value="intelligence" className="w-full">
          <LLM />
        </TabsContent>
      </Tabs>
    </div>
  );
}
