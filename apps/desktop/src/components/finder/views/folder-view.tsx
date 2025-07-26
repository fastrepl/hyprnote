interface FolderViewProps {
  date: Date;
  onNavigate: (params: { date: string }) => void;
}

export function FolderView({ date, onNavigate }: FolderViewProps) {
  return (
    <div className="p-4">
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Folder View</h2>
          <p className="text-gray-500">
            Here you'll be able to view and manage your notes in a folder structure.
          </p>
          <p className="text-gray-500 mt-4">Coming soon...</p>
        </div>
      </div>
    </div>
  );
}
