import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { ReplaceAllIcon } from "lucide-react";
import { PencilIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { commands as dbCommands, type SpeakerIdentity, type Word } from "@hypr/plugin-db";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import TranscriptEditor from "@hypr/tiptap/transcript";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";

export const Route = createFileRoute("/app/transcript/$id")({
  component: Component,
  loader: async ({ params: { id }, context: { onboardingSessionId } }) => {
    const participants = await dbCommands.sessionListParticipants(id);
    const words = id === onboardingSessionId
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

  const [content, _d] = useState(fromWordsToEditor(words));

  return (
    <div className="px-6 py-2">
      <TranscriptToolbar editorRef={editorRef} />

      <div className="flex-1 overflow-auto min-h-0">
        <TranscriptEditor
          ref={editorRef}
          initialContent={content}
          speakers={participants.map((p) => ({ id: p.id, name: p.full_name ?? "Unknown" }))}
        />
      </div>
    </div>
  );
}

function TranscriptToolbar({ editorRef }: { editorRef: React.RefObject<any> }) {
  const { id } = useParams({ from: "/app/transcript/$id" });

  const title = useQuery({
    queryKey: ["session-title", id],
    queryFn: () => dbCommands.getSession({ id }).then((v) => v?.title),
  });

  const handleSave = () => {
    const content = editorRef.current?.editor.getJSON();
    const words = fromEditorToWords(content);

    dbCommands.getSession({ id }).then((session) => {
      if (session) {
        dbCommands.upsertSession({
          ...session,
          words,
        });
      }
    }).then(() => {
      windowsCommands.windowDestroy({ type: "transcript", value: id });
    });
  };

  const handleCancel = () => {
    windowsCommands.windowDestroy({ type: "transcript", value: id });
  };

  return (
    <header
      data-tauri-drag-region
      className="flex w-full items-center justify-between min-h-11 p-1 px-3 border-b border-border bg-background/80 backdrop-blur-sm"
    >
      <div className="w-20 ml-20">
        <SearchAndReplace editorRef={editorRef} />
      </div>

      <div
        className="flex-1 flex items-center justify-center"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-2">
          <PencilIcon className="w-3 h-3 text-muted-foreground" />
          <h1 className="text-sm font-light truncate max-w-md" data-tauri-drag-region>
            (Transcript) {title.data}
          </h1>
        </div>
      </div>

      <div className="w-40 flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
        >
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave}>
          Save
        </Button>
      </div>
    </header>
  );
}

function SearchAndReplace({ editorRef }: { editorRef: React.RefObject<any> }) {
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

  return (
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
  );
}

const fromWordsToEditor = (words: Word[]): EditorContent => {
  return {
    type: "doc",
    content: words.reduce<{ cur: SpeakerIdentity | null; acc: SpeakerContent[] }>((state, word) => {
      const isFirst = state.acc.length === 0;

      const isSameSpeaker = (!state.cur && !word.speaker)
        || (state.cur?.type === "unassigned" && word.speaker?.type === "unassigned"
          && state.cur.value.index === word.speaker.value.index)
        || (state.cur?.type === "assigned" && word.speaker?.type === "assigned"
          && state.cur.value.id === word.speaker.value.id);

      if (isFirst || !isSameSpeaker) {
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

const fromEditorToWords = (content: EditorContent): Word[] => {
  if (!content?.content) {
    return [];
  }

  const words: Word[] = [];

  for (const speakerBlock of content.content) {
    if (speakerBlock.type !== "speaker" || !speakerBlock.content) {
      continue;
    }

    let speaker: SpeakerIdentity | null = null;
    if (speakerBlock.attrs["speaker-id"]) {
      speaker = {
        type: "assigned",
        value: {
          id: speakerBlock.attrs["speaker-id"],
          label: speakerBlock.attrs["speaker-label"] ?? "",
        },
      };
    } else if (typeof speakerBlock.attrs["speaker-index"] === "number") {
      speaker = {
        type: "unassigned",
        value: {
          index: speakerBlock.attrs["speaker-index"],
        },
      };
    }

    for (const wordBlock of speakerBlock.content) {
      if (wordBlock.type !== "word" || !wordBlock.content?.[0]?.text) {
        continue;
      }

      words.push({
        text: wordBlock.content[0].text,
        speaker,
        confidence: 1,
        start_ms: 0,
        end_ms: 0,
      });
    }
  }

  return words;
};
