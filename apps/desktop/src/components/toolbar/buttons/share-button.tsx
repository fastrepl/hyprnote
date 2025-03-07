import { ShareIcon } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@hypr/ui/components/ui/tabs";

export function ShareButton() {
  const { pathname } = useLocation();
  const inNote = pathname.includes("/app/note/");
  const [email, setEmail] = useState("");

  if (!inNote) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className=" hover:bg-neutral-200"
              aria-label="Share"
            >
              <ShareIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Share</p>
          </TooltipContent>
        </Tooltip>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-4" align="end">
        <Tabs defaultValue="share" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="share" className="flex-1">
              Share
            </TabsTrigger>
            <TabsTrigger value="publish" className="flex-1">
              Publish
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Email or group, separated by commas"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-72 rounded"
            />
            <Button className="rounded">Invite</Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full overflow-hidden bg-neutral-100">
                  <img
                    src="/avatar.png"
                    alt="User avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-sm font-medium">
                    John / Nemo Toys (You)
                  </div>
                  <div className="text-sm text-neutral-500">
                    john@fastrepl.com
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-72 rounded text-neutral-500 hover:bg-neutral-200"
              >
                Full access
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded bg-amber-100 flex items-center justify-center">
                  <svg className="size-4 text-amber-500" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M13 10h7l-9 13v-9H4l9-13z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium">People in Hyprnote</div>
                  <div className="text-sm text-neutral-500">
                    Teamspace · 2 people
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-72 rounded text-neutral-500 hover:bg-neutral-200"
              >
                Full access
              </Button>
            </div>

            <div className="pt-2">
              <div className="text-sm font-medium text-neutral-500 mb-2">
                General access
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded bg-neutral-100 flex items-center justify-center">
                    <span className="text-lg font-medium text-neutral-500">
                      F
                    </span>
                  </div>
                  <div className="text-sm font-medium">
                    Everyone at Fastrepl
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-72 rounded text-neutral-500 hover:bg-neutral-200"
                >
                  Full access
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-neutral-500">
                <svg className="size-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"
                  />
                </svg>
                <span className="text-sm">Learn about sharing</span>
              </div>
              <Button
                variant="outline"
                className="w-72 rounded gap-2 hover:bg-neutral-200"
              >
                <svg className="size-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
                  />
                </svg>
                Copy link
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
