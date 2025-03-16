import { Button } from "@hypr/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";
import { Input } from "@hypr/ui/components/ui/input";
import { Modal, ModalBody, ModalDescription, ModalHeader, ModalTitle } from "@hypr/ui/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { Trans, useLingui } from "@lingui/react/macro";
import { MoreVertical, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type Member = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: "workspace_owner" | "admin" | "member";
};

const members: Member[] = [
  {
    id: "1",
    name: "John / Nemo Toys",
    email: "john@fastrepl.com",
    avatar: "J",
    role: "workspace_owner",
  },
  {
    id: "2",
    name: "Yujong Lee",
    email: "yujonglee@fastrepl.com",
    avatar: "Y",
    role: "workspace_owner",
  },
];

export default function TeamComponent() {
  const { t } = useLingui();
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteRole, setInviteRole] = useState<Member["role"]>("member");

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members;

    const query = searchQuery.toLowerCase();
    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(query)
        || member.email.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  const handleDelete = (member: Member) => {
    // TODO: Implement delete functionality
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t`Type to search...`}
            className="max-w-60 pl-8 focus-visible:ring-0 focus-visible:ring-offset-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowInviteModal(true)}
        >
          <Plus className="h-4 w-4" />
          <Trans>Add members</Trans>
        </Button>
      </div>

      <div className="overflow-clip rounded-lg border bg-card">
        <div className="grid grid-cols-2 gap-4 border-b bg-neutral-50 px-6 py-3 text-sm font-bold text-neutral-700">
          <div>
            <Trans>User</Trans>
          </div>
          <div>
            <Trans>Role</Trans>
          </div>
        </div>

        <div>
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="grid grid-cols-2 gap-4 border-t px-6 py-4 first:border-t-0"
            >
              <div className="flex items-center gap-3">
                {member.id === "1"
                  ? <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700" />
                  : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-secondary text-sm font-medium">
                      {member.avatar}
                    </div>
                  )}
                <div>
                  <div className="text-sm font-medium">{member.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {member.email}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Select defaultValue={member.role}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="workspace_owner"
                      className="cursor-pointer"
                    >
                      <Trans>Owner</Trans>
                    </SelectItem>
                    <SelectItem value="admin" className="cursor-pointer">
                      <Trans>Admin</Trans>
                    </SelectItem>
                    <SelectItem value="member" className="cursor-pointer">
                      <Trans>Member</Trans>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer hover:bg-neutral-900 hover:text-neutral-300"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive cursor-pointer"
                      onClick={() => handleDelete(member)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <Trans>Delete</Trans>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}

          {filteredMembers.length === 0 && (
            <div className="px-6 py-4 text-sm text-muted-foreground">
              <Trans>No members found</Trans>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        size="sm"
      >
        <ModalBody>
          <ModalHeader>
            <ModalTitle>
              <Trans>Invite members</Trans>
            </ModalTitle>
            <ModalDescription>
              <Trans>
                Type or paste in emails below, separated by commas. Your workspace will be billed by members.
              </Trans>
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                <Trans>Email addresses</Trans>
              </label>
              <Input
                placeholder={t`Search names or emails`}
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                className="focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                <Trans>Role</Trans>
              </label>
              <Select
                value={inviteRole}
                onValueChange={(
                  value: "workspace_owner" | "admin" | "member",
                ) => setInviteRole(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workspace_owner">
                    <Trans>Owner</Trans>
                  </SelectItem>
                  <SelectItem value="admin">
                    <Trans>Admin</Trans>
                  </SelectItem>
                  <SelectItem value="member">
                    <Trans>Member</Trans>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setShowInviteModal(false)}>
                <Trans>Send invite</Trans>
              </Button>
            </div>
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
}
