import { commands, type McpServer } from "@hypr/plugin-mcp";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Label } from "@hypr/ui/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { Switch } from "@hypr/ui/components/ui/switch";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";

export default function MCP() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [loading, setLoading] = useState(true);

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

  const saveServers = async (updatedServers: McpServer[]) => {
    try {
      await commands.setServers(updatedServers);
      setServers(updatedServers);
    } catch (error) {
      console.error("Failed to save MCP servers:", error);
    }
  };

  const handleAddServer = async () => {
    if (!newUrl.trim()) return;
    
    const newServer: McpServer = {
      url: newUrl,
      type: "sse",
      enabled: true,
    };
    
    const updatedServers = [...servers, newServer];
    await saveServers(updatedServers);
    setNewUrl("");
  };

  const handleToggleServer = async (index: number) => {
    const updatedServers = servers.map((server, i) => 
      i === index 
        ? { ...server, enabled: !server.enabled }
        : server
    );
    await saveServers(updatedServers);
  };

  const handleDeleteServer = async (index: number) => {
    const updatedServers = servers.filter((_, i) => i !== index);
    await saveServers(updatedServers);
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">MCP Servers</h2>
          <p className="text-sm text-neutral-600 mb-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">MCP Servers</h2>
        <p className="text-sm text-neutral-600 mb-4">
          Configure MCP servers for connecting with AI chat
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter MCP server URL"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddServer();
              }
            }}
            className="flex-1"
          />
          <Button
            onClick={handleAddServer}
            disabled={!newUrl.trim()}
            variant="outline"
            size="sm"
            className="px-4"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>

        {servers.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 border rounded-lg">
            <p className="text-sm">No MCP servers configured</p>
            <p className="text-xs mt-1">Add a server URL above to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {servers.map((server, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border rounded-lg bg-white"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={server.url}
                      readOnly
                      className="flex-1 bg-neutral-50"
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}