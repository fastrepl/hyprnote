import { createFileRoute } from "@tanstack/react-router";
import { ReplaceAllIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { commands as dbCommands, type SpeakerIdentity, type Word } from "@hypr/plugin-db";
import TranscriptEditor from "@hypr/tiptap/transcript";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";

export const Route = createFileRoute("/app/transcript/$id")({
  component: Component,
  loader: async ({ params: { id }, context: { onboardingSessionId } }) => {
    const participants = await dbCommands.sessionListParticipants(id);
    const words = onboardingSessionId
      ? await dbCommands.getWordsOnboarding()
      : await dbCommands.getWords(id);

    return { participants, words };
  },
});

type EditorContent = {
  type: "doc";
  content: SpeakerContent[];
};

type SpeakerContent = {
  type: "speaker";
  attrs: { "speaker-index": number | null; "speaker-id": string | null; "speaker-label": string | null };
  content: WordContent[];
};

type WordContent = {
  type: "word";
  content: { type: "text"; text: string }[];
};

function Component() {
  const { participants, words } = Route.useLoaderData();
  const editorRef = useRef(null);

  const fromWordsToEditor = (words: Word[]): EditorContent => {
    return {
      type: "doc",
      content: words.reduce<{ cur: SpeakerIdentity | null; acc: SpeakerContent[] }>((state, word) => {
        const isSameSpeaker = (!state.cur && !word.speaker) // Both null
          || (state.cur?.type === "unassigned" && word.speaker?.type === "unassigned"
            && state.cur.value.index === word.speaker.value.index)
          || (state.cur?.type === "assigned" && word.speaker?.type === "assigned"
            && state.cur.value.id === word.speaker.value.id);

        if (!isSameSpeaker) {
          state.cur = word.speaker;

          state.acc.push({
            type: "speaker",
            attrs: {
              "speaker-index": word.speaker?.type === "unassigned" ? word.speaker.value?.index : null,
              "speaker-id": word.speaker?.type === "assigned" ? word.speaker.value?.id : null,
              "speaker-label": word.speaker?.type === "assigned" ? word.speaker.value?.label || "" : null,
            },
            content: [],
          });
        }

        if (state.acc.length > 0) {
          state.acc[state.acc.length - 1].content.push({
            type: "word",
            content: [{ type: "text", text: word.text }],
          });
        }

        return state;
      }, { cur: null, acc: [] }).acc,
    };
  };

  const [content, setContent] = useState(fromWordsToEditor(words));

  const [expanded, setExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");

  useEffect(() => {
    if (editorRef.current) {
      // @ts-ignore
      editorRef.current.editor.commands.setSearchTerm(searchTerm);

      if (searchTerm.substring(0, searchTerm.length - 1) === replaceTerm) {
        setReplaceTerm(searchTerm);
      }
    }
  }, [searchTerm]);

  useEffect(() => {
    if (editorRef.current) {
      // @ts-ignore
      editorRef.current.editor.commands.setReplaceTerm(replaceTerm);
    }
  }, [replaceTerm]);

  const handleReplaceAll = () => {
    if (editorRef.current && searchTerm) {
      // @ts-ignore
      editorRef.current.editor.commands.replaceAll(replaceTerm);
      setExpanded(false);
      setSearchTerm("");
      setReplaceTerm("");
    }
  };

  const handleChange = (content: Record<string, unknown>) => {
    setContent(content as EditorContent);
  };

  return (
    <div className="p-6 flex-1 flex flex-col overflow-hidden min-h-0">
      <Popover open={expanded} onOpenChange={setExpanded}>
        <PopoverTrigger asChild>
          <Button
            className="w-8"
            variant="default"
            size="icon"
          >
            <ReplaceAllIcon size={12} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-2">
          <div className="flex flex-row gap-2">
            <Input
              className="h-6"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
            />
            <Input
              className="h-6"
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              placeholder="Replace"
            />
            <Button
              className="h-6"
              variant="default"
              onClick={handleReplaceAll}
            >
              Replace
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex-1 overflow-auto min-h-0">
        <TranscriptEditor
          ref={editorRef}
          initialContent={content}
          speakers={participants.map((p) => ({ id: p.id, name: p.full_name ?? "Unknown" }))}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
