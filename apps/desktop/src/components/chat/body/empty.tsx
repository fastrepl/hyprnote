export function ChatBodyEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
      <img src="/assets/dynamic.gif" alt="Hyprnote" className="w-24 h-24 mb-6 mt-12" />
      <p className="text-neutral-600 text-base mb-1">Ask the AI assistant about anything.</p>
      <p className="text-neutral-400 text-sm mb-10">It can also do few cool stuff for you.</p>
    </div>
  );
}
