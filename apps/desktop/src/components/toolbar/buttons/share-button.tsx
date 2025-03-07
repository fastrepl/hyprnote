import {
  Building2,
  ChevronDown,
  ChevronRight,
  Copy,
  HelpCircle,
  ShareIcon,
  Users2Icon,
  X,
} from "lucide-react";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@hypr/ui/components/ui/tooltip";
import { useLocation } from "@tanstack/react-router";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@hypr/ui/components/ui/popover";
import { Input } from "@hypr/ui/components/ui/input";
import { useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@hypr/ui/components/ui/tabs";
import { Avatar, AvatarImage } from "@hypr/ui/components/ui/avatar";

export function ShareButton() {
  const { pathname } = useLocation();
  const inNote = pathname.includes("/app/note/");
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
    );
  };

  if (!inNote) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <PopoverTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-neutral-100 rounded"
              aria-label="Share"
            >
              <ShareIcon className="size-4 text-neutral-600" />
            </Button>
          </TooltipTrigger>
        </PopoverTrigger>
        <TooltipContent>
          <p>Share</p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80 p-0" align="end">
        <Tabs defaultValue="share" className="w-full">
          <TabsList className="w-full h-auto p-0 bg-transparent border-b">
            <TabsTrigger
              value="share"
              className="flex-1 px-4 py-3 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-neutral-950 rounded-none hover:bg-neutral-100"
            >
              Share
            </TabsTrigger>
            <TabsTrigger
              value="publish"
              className="flex-1 px-4 py-3 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-neutral-950 rounded-none hover:bg-neutral-100"
            >
              Publish
            </TabsTrigger>
          </TabsList>

          <div className="p-4 space-y-4">
            <TabsContent value="share" className="mt-0">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Email separated by commas"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-sm"
                  />
                  <Button variant="outline">Invite</Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 bg-neutral-100">
                        <AvatarImage src="/avatar.png" alt="User avatar" />
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">
                          John Jeong (You)
                        </div>
                        <div className="text-xs text-neutral-600">
                          john@fastrepl.com
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-neutral-100"
                    >
                      <X className="size-4 text-neutral-600" />
                    </Button>
                  </div>

                  <div
                    className="flex items-center justify-between hover:bg-neutral-50 rounded py-1 cursor-pointer"
                    onClick={() => toggleGroup("participants")}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                        <Users2Icon className="size-4 text-neutral-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          All Participants
                        </div>
                        <div className="text-xs text-neutral-600">
                          Teamspace · 2 people
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-transparent"
                    >
                      {expandedGroups.includes("participants") ? (
                        <ChevronDown className="size-4 text-neutral-600" />
                      ) : (
                        <ChevronRight className="size-4 text-neutral-600" />
                      )}
                    </Button>
                  </div>

                  {expandedGroups.includes("participants") && (
                    <div className="pl-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 flex items-center gap-3 min-w-0">
                          <Avatar className="h-8 w-8 flex-shrink-0 bg-neutral-100">
                            <AvatarImage src="/avatar2.png" alt="User avatar" />
                          </Avatar>

                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">Bobby Min</div>
                            <div className="text-xs text-neutral-600 truncate">
                              bobby.min@krewcapital.comasasdasdsdsdsd
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0 hover:bg-neutral-100"
                        >
                          <X className="size-4 text-neutral-600" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex-1 flex items-center gap-3 min-w-0">
                          <Avatar className="h-8 w-8 flex-shrink-0 bg-neutral-100">
                            <AvatarImage src="/avatar2.png" alt="User avatar" />
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">Minjae Song</div>
                            <div className="text-xs text-neutral-600 truncate">
                              minjae.song@krewcapital.com
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0 hover:bg-neutral-100"
                        >
                          <X className="size-4 text-neutral-600" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="pt-4">
                    <div className="text-xs text-neutral-600 mb-2">
                      General access
                    </div>
                    <div
                      className="flex items-center justify-between hover:bg-neutral-100 rounded px-2 py-1 cursor-pointer"
                      onClick={() => toggleGroup("workspace")}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded bg-amber-100 flex items-center justify-center">
                          <Building2 className="size-4 text-amber-500" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            Everyone at Fastrepl
                          </div>
                          <div className="text-xs text-neutral-600">
                            Can view
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {expandedGroups.includes("workspace") ? (
                          <ChevronDown className="size-4 text-neutral-600" />
                        ) : (
                          <ChevronRight className="size-4 text-neutral-600" />
                        )}
                      </div>
                    </div>

                    {expandedGroups.includes("workspace") && (
                      <div className="pl-2 space-y-3 mt-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded bg-amber-100 flex items-center justify-center">
                              <Building2 className="size-4 text-amber-500" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">
                                Fastrepl
                              </div>
                              <div className="text-xs text-neutral-600">
                                12 people
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t pt-4">
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 text-sm text-neutral-600 hover:bg-neutral-100"
                    >
                      <HelpCircle className="size-4 text-neutral-600" />
                      Learn about sharing
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 text-sm text-neutral-600 hover:bg-neutral-100"
                    >
                      <Copy className="size-4 text-neutral-600" />
                      Copy link
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="publish" className="mt-0">
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-1">Publish to web</h3>
                  <p className="text-sm text-neutral-600">
                    Create a website with Hyprnote{" "}
                    <span className="inline-flex items-center justify-center size-4 rounded-full bg-neutral-100 ml-1 text-xs">
                      ?
                    </span>
                  </p>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <Button
                    variant="outline"
                    className="w-72 rounded hover:bg-neutral-100"
                  >
                    Create website
                  </Button>
                  <p className="text-xs text-neutral-600">
                    Anyone with the link can view this page
                  </p>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
