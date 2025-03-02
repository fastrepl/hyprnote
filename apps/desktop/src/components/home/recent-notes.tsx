export default function RecentNotes() {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Recent Notes</h2>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="aspect-square border-2 border-black rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
          />
        ))}
      </div>
    </div>
  );
}
