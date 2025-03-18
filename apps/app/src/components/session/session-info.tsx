import { CalendarIcon, Users2Icon } from "lucide-react";
import type { Session } from "../../client";

import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";

interface SessionInfoProps {
  session: Session;
}

// TODO: Change the mock participants data to a real data

const mockParticipants = [
  {
    id: "1",
    full_name: "John Doe",
    job_title: "Product Manager",
    organization_id: "Acme Inc",
  },
  {
    id: "2",
    full_name: "Jane Smith",
    job_title: "Software Engineer",
    organization_id: "Acme Inc",
  },
  {
    id: "3",
    full_name: "Alex Johnson",
    job_title: "Designer",
    organization_id: "Design Studio",
  },
];

export function SessionInfo({ session }: SessionInfoProps) {
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const groupedParticipants = {
    "Acme Inc": mockParticipants.filter(p => p.organization_id === "Acme Inc"),
    "Design Studio": mockParticipants.filter(p => p.organization_id === "Design Studio"),
  };

  return (
    <div className="mx-auto max-w-2xl w-full flex flex-col p-4 overflow-x-auto scrollbar-none">
      <h2 className="text-2xl font-medium text-neutral-800 mb-2">
        {session.title || "Untitled"}
      </h2>

      <div className="-mx-1.5 flex flex-row items-center whitespace-nowrap gap-2">
        <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 text-xs border">
          <CalendarIcon size={14} />
          <span>{currentDate}</span>
        </div>

        <Popover>
          <PopoverTrigger className="flex flex-row items-center gap-2 rounded-md border px-2 py-1.5 hover:bg-neutral-100 text-xs cursor-pointer">
            <Users2Icon size={14} />
            <span>
              {mockParticipants[0].full_name} +{mockParticipants.length - 1}
            </span>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="shadow-lg border-neutral-200 bg-white"
            closeOnClickOutside={true}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="space-y-2 p-1">
              {Object.entries(groupedParticipants).map(([orgId, members]) => (
                <div key={orgId} className="space-y-1">
                  <div className="pb-1">
                    <p className="text-xs font-medium text-neutral-500">
                      {orgId}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        tabIndex={-1}
                        className="flex w-full items-start justify-between rounded py-2 text-sm"
                      >
                        <div className="flex w-full items-center">
                          <div className="flex items-center gap-3">
                            <Avatar
                              className="size-6"
                              style={{ backgroundColor: "#e5e7eb" }}
                            >
                              <AvatarFallback className="text-xs text-neutral-700">
                                {getInitials(member.full_name)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex flex-col">
                              <span className="font-medium text-neutral-800">{member.full_name}</span>
                              {member.job_title && (
                                <span className="text-xs text-neutral-500">
                                  {member.job_title}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
