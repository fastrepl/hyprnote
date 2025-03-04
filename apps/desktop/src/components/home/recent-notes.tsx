import { Card } from "@hypr/ui/components/ui/card";

export default function RecentNotes() {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Recently Opened</h2>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="aspect-square p-4"></Card>
        ))}
      </div>
    </div>
  );
}
