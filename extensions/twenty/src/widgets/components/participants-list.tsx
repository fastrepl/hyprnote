import { User, XIcon } from "lucide-react";

interface ParticipantsListProps {
  selectedPeople: Array<{ id: string; name: string; email: string }>;
  handleRemovePerson: (id: string) => void;
  isMeetingActive: boolean;
}

export const ParticipantsList = ({
  selectedPeople,
  handleRemovePerson,
  isMeetingActive,
}: ParticipantsListProps) => {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto border border-border rounded-md scrollbar-none">
      {selectedPeople.length > 0
        ? (
          <ul className="divide-y divide-border">
            {selectedPeople.map((person) => (
              <ParticipantItem
                key={person.id}
                person={person}
                handleRemovePerson={handleRemovePerson}
                isMeetingActive={isMeetingActive}
              />
            ))}
          </ul>
        )
        : (
          <div className="flex items-center justify-center h-full text-sm text-neutral-500 p-4">
            No participants selected
          </div>
        )}
    </div>
  );
};

interface ParticipantItemProps {
  person: { id: string; name: string; email: string };
  handleRemovePerson: (id: string) => void;
  isMeetingActive: boolean;
}

const ParticipantItem = ({ person, handleRemovePerson, isMeetingActive }: ParticipantItemProps) => {
  return (
    <li className="flex items-center justify-between p-2 hover:bg-neutral-50">
      <div className="flex items-center gap-2">
        <div className="flex-shrink-0 size-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full">
          <User className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium">{person.name}</p>
          <p className="text-xs text-neutral-500">{person.email}</p>
        </div>
      </div>
      <button
        onClick={() => handleRemovePerson(person.id)}
        className="text-neutral-500 hover:text-neutral-700 p-1"
        disabled={isMeetingActive}
      >
        <XIcon size={16} />
      </button>
    </li>
  );
};
