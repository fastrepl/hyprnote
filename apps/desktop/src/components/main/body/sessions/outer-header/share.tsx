import { CircleMinus, SearchIcon, Share2 } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { Separator } from "@hypr/ui/components/ui/separator";
import { getInitials } from "../../contacts/shared";

interface Person {
  id: string;
  name: string;
  email?: string;
  role: "viewer" | "editor";
  isParticipant?: boolean;
}

export function ShareButton(_: { sessionId: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeople, setSelectedPeople] = useState<Person[]>([]);
  const [invitedPeople, setInvitedPeople] = useState<Person[]>([
    { id: "1", name: "John Doe", email: "john@example.com", role: "editor", isParticipant: true },
    { id: "2", name: "Jane Smith", email: "jane@example.com", role: "editor", isParticipant: true },
  ]);

  const searchResults: Person[] = searchQuery.trim()
    ? [
      { id: "3", name: "Alice Johnson", email: "alice@example.com", role: "viewer" as const },
      { id: "4", name: "Bob Wilson", email: "bob@example.com", role: "viewer" as const },
    ].filter((person) => person.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleSelectPerson = (person: Person) => {
    if (!selectedPeople.find((p) => p.id === person.id)) {
      setSelectedPeople([...selectedPeople, person]);
    }
    setSearchQuery("");
  };

  const handleRemoveSelected = (personId: string) => {
    setSelectedPeople(selectedPeople.filter((p) => p.id !== personId));
  };

  const handleInvite = () => {
    const newInvites = selectedPeople.filter(
      (selected) => !invitedPeople.find((invited) => invited.id === selected.id),
    );
    setInvitedPeople([...invitedPeople, ...newInvites]);
    setSelectedPeople([]);
    // TODO: Implement actual invite functionality
    console.log("Invite:", newInvites);
  };

  const handleRemovePerson = (personId: string) => {
    setInvitedPeople(invitedPeople.filter((p) => p.id !== personId));
  };

  const handleRoleChange = (personId: string, role: "viewer" | "editor") => {
    setInvitedPeople(
      invitedPeople.map((p) => (p.id === personId ? { ...p, role } : p)),
    );
  };

  const handleCopyLink = () => {
    // TODO: Implement copy link functionality
    console.log("Copy link");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5"
          aria-label="Share"
          title="Share"
        >
          <Share2 className="size-4" />
          <span className="hidden md:inline">Share</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[340px] shadow-lg p-0 max-h-[80vh] flex flex-col rounded-lg" align="end">
        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center px-3 py-2 gap-2 rounded-md bg-neutral-50 border border-neutral-200">
              <SearchIcon className="size-4 text-neutral-700 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for people"
                className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-500"
              />
            </div>

            {searchQuery.trim() && searchResults.length > 0 && (
              <div className="flex flex-col rounded-md border border-neutral-200 overflow-hidden">
                {searchResults.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => handleSelectPerson(person)}
                    className="flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-neutral-100 transition-colors w-full disabled:opacity-50"
                    disabled={selectedPeople.some((p) => p.id === person.id)
                      || invitedPeople.some((p) => p.id === person.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarFallback className="text-xs bg-neutral-200 text-neutral-700 font-medium">
                          {getInitials(person.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium truncate">{person.name}</span>
                        {person.email && <span className="text-xs text-neutral-500">{person.email}</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedPeople.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col rounded-md border border-neutral-100 bg-neutral-50 overflow-hidden">
                {selectedPeople.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between gap-3 py-2 px-3 hover:bg-neutral-100 group transition-colors"
                  >
                    <div className="flex items-center gap-2.5 relative min-w-0 flex-1">
                      <div className="relative size-7 flex items-center justify-center flex-shrink-0">
                        <div className="absolute inset-0 flex items-center justify-center transition-opacity group-hover:opacity-0">
                          <Avatar className="size-7">
                            <AvatarFallback className="text-xs bg-neutral-200 text-neutral-700 font-medium">
                              {getInitials(person.name)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSelected(person.id);
                          }}
                          className="flex items-center justify-center text-red-400 hover:text-red-600 absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm"
                        >
                          <CircleMinus className="size-4" />
                        </button>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-neutral-700 truncate">
                          {person.name}
                        </span>
                        {person.email && <span className="text-xs text-neutral-500 truncate">{person.email}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedPeople.length > 0 && (
            <Button onClick={handleInvite} variant="outline" className="w-full">
              Invite {selectedPeople.length} {selectedPeople.length === 1 ? "person" : "people"}
            </Button>
          )}

          {selectedPeople.length > 0 && <Separator />}

          {invitedPeople.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-xs font-medium text-neutral-500">
                People with access
              </div>
              <div className="flex flex-col rounded-md border border-neutral-100 bg-neutral-50">
                {invitedPeople.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between gap-3 py-2 px-3 hover:bg-neutral-100 group transition-colors"
                  >
                    <div className="flex items-center gap-2.5 relative min-w-0 flex-1">
                      <div className="relative size-7 flex items-center justify-center flex-shrink-0">
                        <div className="absolute inset-0 flex items-center justify-center transition-opacity group-hover:opacity-0">
                          <Avatar className="size-7">
                            <AvatarFallback className="text-xs bg-neutral-200 text-neutral-700 font-medium">
                              {getInitials(person.name)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePerson(person.id);
                          }}
                          className="flex items-center justify-center text-red-400 hover:text-red-600 absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm"
                        >
                          <CircleMinus className="size-4" />
                        </button>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-neutral-700 truncate">
                          {person.name}
                        </span>
                        {person.email && <span className="text-xs text-neutral-500 truncate">{person.email}</span>}
                      </div>
                    </div>

                    <Select
                      value={person.role}
                      onValueChange={(value: "viewer" | "editor") => handleRoleChange(person.id, value)}
                    >
                      <SelectTrigger
                        className="w-[100px] h-8 text-xs focus:ring-0 focus:ring-offset-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer" className="cursor-pointer">Viewer</SelectItem>
                        <SelectItem value="editor" className="cursor-pointer">Editor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            className="w-full rounded-lg"
            onClick={handleCopyLink}
          >
            Copy link
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
