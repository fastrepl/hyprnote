import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { BottomSheet, BottomSheetContent } from "@hypr/ui/components/ui/bottom-sheet";
import { getInitials } from "@hypr/utils";

// Define the Participant interface since it's not exported from @hypr/plugin-db
interface Participant {
  id: string;
  full_name: string;
  job_title?: string;
  organization_id: string;
}

interface ParticipantsSheetProps {
  open: boolean;
  onClose: () => void;
  groupedParticipants: Record<string, Participant[]>;
}

export function ParticipantsSheet({
  open,
  onClose,
  groupedParticipants,
}: ParticipantsSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheetContent className="bg-white">
        <div className="p-4 space-y-4">
          <h3 className="text-lg font-medium mb-2">Participants</h3>

          <div className="space-y-4">
            {Object.entries(groupedParticipants).map(([orgId, members]) => (
              <div key={orgId} className="space-y-2">
                <div className="pb-1">
                  <p className="text-xs font-medium text-neutral-500">
                    {orgId}
                  </p>
                </div>
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex w-full items-start justify-between rounded py-2 text-sm"
                    >
                      <div className="flex w-full items-center">
                        <div className="flex items-center gap-3">
                          <Avatar
                            className="size-8"
                            style={{ backgroundColor: "gray" }}
                          >
                            <AvatarFallback className="text-xs">
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex flex-col">
                            <span className="font-medium">{member.full_name}</span>
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
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}
