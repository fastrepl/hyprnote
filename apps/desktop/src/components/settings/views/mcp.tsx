import { commands, type McpServer } from "@hypr/plugin-mcp";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Label } from "@hypr/ui/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { Switch } from "@hypr/ui/components/ui/switch";
import { useMutation } from "@tanstack/react-query";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";

export default function MCP() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");
  const [loading, setLoading] = useState(true);

  const MAX_SERVERS = 3;
  const isAtMaxLimit = servers.length >= MAX_SERVERS;

  // Load servers on mount
  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      setLoading(true);
      const loadedServers = await commands.getServers();
      setServers(loadedServers);
    } catch (error) {
      console.error("Failed to load MCP servers:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveServersMutation = useMutation({
    mutationFn: async (updatedServers: McpServer[]) => {
      await commands.setServers(updatedServers);
      return updatedServers;
    },
    onSuccess: (updatedServers) => {
      setServers(updatedServers);
    },
    onError: (error) => {
      console.error("Failed to save MCP servers:", error);
    },
  });

  const handleAddServer = () => {
    if (!newUrl.trim() || isAtMaxLimit) {
      return;
    }

    const newServer: McpServer = {
      url: newUrl,
      type: "sse",
      enabled: true,
      headerKey: newHeaderKey.trim() || null,
      headerValue: newHeaderValue.trim() || null,
    };

    const updatedServers = [...servers, newServer];
    saveServersMutation.mutate(updatedServers);
    setNewUrl("");
    setNewHeaderKey("");
    setNewHeaderValue("");
  };

  const handleToggleServer = (index: number) => {
    const updatedServers = servers.map((server, i) =>
      i === index
        ? { ...server, enabled: !server.enabled }
        : server
    );
    saveServersMutation.mutate(updatedServers);
  };

  const handleDeleteServer = (index: number) => {
    const updatedServers = servers.filter((_, i) => i !== index);
    saveServersMutation.mutate(updatedServers);
  };

  const handleUpdateServerHeader = (index: number, headerKey: string, headerValue: string) => {
    const updatedServers = servers.map((server, i) =>
      i === index
        ? {
          ...server,
          headerKey: headerKey.trim() || null,
          headerValue: headerValue.trim() || null,
        }
        : server
    );
    saveServersMutation.mutate(updatedServers);
  };

  const handleUpdateServerUrl = (index: number, newUrl: string) => {
    const updatedServers = servers.map((server, i) =>
      i === index
        ? { ...server, url: newUrl }
        : server
    );
    saveServersMutation.mutate(updatedServers);
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-lg font-semibold">MCP Servers</h2>
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              Preview
            </span>
          </div>
          <p className="text-sm text-neutral-600 mb-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-lg font-semibold">MCP Servers</h2>
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            Preview
          </span>
        </div>
        <p className="text-sm text-neutral-600 mb-4">
          Connect MCP servers with AI chat (currently supports Claude Sonnet 4, gpt-4o and gpt-4.1)
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-3 p-4 border rounded-lg bg-neutral-50">
          <h3 className="text-sm font-medium">Add New Server</h3>

          <div className="space-y-3">
            <div>
              <Label htmlFor="url" className="text-xs text-neutral-600">Server URL</Label>
              <Input
                id="url"
                placeholder={isAtMaxLimit ? `Maximum ${MAX_SERVERS} servers allowed` : "Enter MCP server URL"}
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isAtMaxLimit) {
                    handleAddServer();
                  }
                }}
                disabled={isAtMaxLimit}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="headerKey" className="text-xs text-neutral-600">Header Key (Optional)</Label>
                <Input
                  id="headerKey"
                  placeholder="e.g., Authorization"
                  value={newHeaderKey}
                  onChange={(e) => setNewHeaderKey(e.target.value)}
                  disabled={isAtMaxLimit}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="headerValue" className="text-xs text-neutral-600">Header Value (Optional)</Label>
                <Input
                  id="headerValue"
                  placeholder="e.g., Bearer token123"
                  value={newHeaderValue}
                  onChange={(e) => setNewHeaderValue(e.target.value)}
                  disabled={isAtMaxLimit}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleAddServer}
            disabled={!newUrl.trim() || isAtMaxLimit}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Server
          </Button>
        </div>

        {isAtMaxLimit && (
          <div className="text-xs text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg p-3">
            Due to stability issues, we only allow {MAX_SERVERS}{" "}
            MCP servers during preview. Remove a server to add a new one.
          </div>
        )}

        {servers.length === 0
          ? (
            <div className="text-center py-8 text-neutral-500 border rounded-lg">
              <p className="text-sm">No MCP servers configured</p>
              <p className="text-xs mt-1">Add a server URL above to get started</p>
            </div>
          )
          : (
            <div className="space-y-3">
              {servers.map((server, index) => (
                <div
                  key={index}
                  className="space-y-3 p-4 border rounded-lg bg-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={server.url}
                          onChange={(e) => handleUpdateServerUrl(index, e.target.value)}
                          className="flex-1"
                        />
                        <Select value={server.type} disabled>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sse">SSE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label htmlFor={`switch-${index}`} className="text-sm">
                        {server.enabled ? "Enabled" : "Disabled"}
                      </Label>
                      <Switch
                        id={`switch-${index}`}
                        checked={server.enabled}
                        onCheckedChange={() => handleToggleServer(index)}
                      />
                      <Button
                        onClick={() => handleDeleteServer(index)}
                        variant="ghost"
                        size="sm"
                        className="text-neutral-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Header configuration for existing servers */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
                    <div>
                      <Label className="text-xs text-neutral-600">Header Key</Label>
                      <Input
                        placeholder="e.g., Authorization"
                        value={server.headerKey || ""}
                        onChange={(e) => handleUpdateServerHeader(index, e.target.value, server.headerValue || "")}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-neutral-600">Header Value</Label>
                      <Input
                        placeholder="e.g., Bearer token123"
                        value={server.headerValue || ""}
                        onChange={(e) => handleUpdateServerHeader(index, server.headerKey || "", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
