interface EnhancedNoteProps {
  title: string;
  content: {
    description: string;
    deadline: {
      date: string;
      note: string;
    };
    keyPoints: string[];
    actionItems: string[];
  };
}

export function EnhancedNote({ title, content }: EnhancedNoteProps) {
  return (
    <div className="p-6 bg-white h-[400px] overflow-y-auto max-w-none text-left">
      <h1 className="text-xl font-semibold mb-4">{title}</h1>

      <div className="flex flex-col gap-4">
        <p className="text-gray-700">{content.description}</p>

        <div className="bg-yellow-50 p-2 px-3 rounded-lg flex flex-col gap-1 border border-yellow-700 text-sm">
          <p className="font-medium text-yellow-800 mb-1">
            Deadline: {content.deadline.date}
          </p>
          <p className="text-yellow-700">{content.deadline.note}</p>
        </div>

        <div className="bg-blue-50 p-2 px-3 rounded-lg flex flex-col gap-1 border border-blue-700 text-sm">
          <p className="text-blue-700">
            <span className="font-medium">Key Points:</span>{" "}
            {content.keyPoints.join(", ")}
          </p>
        </div>

        <div>
          <h2 className="font-medium mb-2">Action Items:</h2>
          <ul className="list-disc ml-4 space-y-1 text-gray-700">
            {content.actionItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
