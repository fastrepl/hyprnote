import { RiLinkedinFill } from "@remixicon/react";
import { Globe, Mail } from "lucide-react";

import { commands as dbCommands, type Human, type Organization } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";

export function ContactInfo({
  human,
  organization,
  isEditing,
  handleInputChange,
  getOrganizationWebsite,
}: {
  human: Human;
  organization: Organization | null;
  isEditing: boolean;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  getOrganizationWebsite: () => string | null;
}) {
  const humanQuery = useQuery({
    initialData: human,
    queryKey: ["human", human.id],
    queryFn: () => dbCommands.getHuman(human.id),
  });

  if (isEditing) {
    return (
      <div className="w-full">
        <table className="w-full">
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-2 pr-4 w-1/3 text-sm font-medium text-gray-500">
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-gray-400" />
                  <span>Email</span>
                </div>
              </td>
              <td className="py-2">
                <Input
                  id="email"
                  name="email"
                  value={humanQuery.data?.email || ""}
                  onChange={handleInputChange}
                  placeholder="Email Address"
                  className="border-none text-sm shadow-none px-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4 w-1/3 text-sm font-medium text-gray-500">
                <div className="flex items-center gap-2">
                  <RiLinkedinFill className="size-4 text-gray-400" />
                  <span>LinkedIn</span>
                </div>
              </td>
              <td className="py-2">
                <Input
                  id="linkedin_username"
                  name="linkedin_username"
                  value={humanQuery.data?.linkedin_username || ""}
                  onChange={handleInputChange}
                  placeholder="LinkedIn Username"
                  className="border-none text-sm shadow-none px-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-4">
      {human.email && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <a href={`mailto:${human.email}`}>
                <Button
                  variant="outline"
                  size="icon"
                >
                  <Mail className="h-5 w-5" />
                </Button>
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">{human.email}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {human.linkedin_username && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={`https://linkedin.com/in/${human.linkedin_username}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  size="icon"
                >
                  <RiLinkedinFill className="h-5 w-5" />
                </Button>
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">LinkedIn: {human.linkedin_username}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {organization && getOrganizationWebsite() !== null && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={getOrganizationWebsite()!}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  size="icon"
                >
                  <Globe className="h-5 w-5" />
                </Button>
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">{organization.name} Website</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
