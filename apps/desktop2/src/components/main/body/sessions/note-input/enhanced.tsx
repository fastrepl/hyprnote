import NoteEditor from "@hypr/tiptap/editor";

export function EnhancedEditor({
  editorKey,
  value,
  onChange,
}: {
  editorKey: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <NoteEditor
      key={editorKey}
      initialContent={value}
      handleChange={onChange}
      mentionConfig={{
        trigger: "@",
        handleSearch: async () => {
          return [];
        },
      }}
    />
  );
}
