import { useParams } from "@tanstack/react-router";
import { FileText, Share2Icon, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Modal, ModalBody, ModalHeader, ModalTitle } from "@hypr/ui/components/ui/modal";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { useSession } from "@hypr/utils/contexts";
import { exportToPDF } from "../utils/pdf-export";

// Slack Logo Component with official colors
const SlackIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z"
      fill="#E01E5A"
    />
    <path
      d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
      fill="#E01E5A"
    />
    <path
      d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z"
      fill="#36C5F0"
    />
    <path
      d="M8.834 6.313a2.527 2.527 0 0 1 2.521 2.521 2.527 2.527 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
      fill="#36C5F0"
    />
    <path
      d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z"
      fill="#2EB67D"
    />
    <path
      d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
      fill="#2EB67D"
    />
    <path
      d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z"
      fill="#ECB22E"
    />
    <path
      d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
      fill="#ECB22E"
    />
  </svg>
);

export function ShareButton() {
  const param = useParams({ from: "/app/note/$id", shouldThrow: false });
  return param ? <ShareButtonInNote /> : null;
}

function ShareButtonInNote() {
  const param = useParams({ from: "/app/note/$id", shouldThrow: true });
  const [open, setOpen] = useState(false);
  const [slackModalOpen, setSlackModalOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Slack form state
  
  const [selectedWorkspace, setSelectedWorkspace] = useState("Atlassian");
  const [selectedChannel, setSelectedChannel] = useState("");
  const [message, setMessage] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  const session = useSession(param.id, (s) => s.session);
  const hasEnhancedNote = !!session?.enhanced_memo_html;

  {
    /*
  const handleShareToSlack = () => {
    setOpen(false); // Close the popover
    setSlackModalOpen(true); // Open the modal
  };
  */
  }

  const handleCloseSlackModal = () => {
    setSlackModalOpen(false);
    // Reset form state
    setSelectedChannel("");
    setMessage("");
    setIsSharing(false);
  };

  const handleSlackShare = async () => {
    if (!selectedChannel) {
      alert("Please select a channel");
      return;
    }

    setIsSharing(true);

    try {
      // TODO: Implement actual Slack API call
      console.log("Sharing to Slack:", {
        workspace: selectedWorkspace,
        channel: selectedChannel,
        message,
        content: session?.enhanced_memo_html,
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      alert("Successfully shared to Slack!");
      handleCloseSlackModal();
    } catch (error) {
      console.error("Failed to share to Slack:", error);
      alert("Failed to share to Slack. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleExportToPDF = async () => {
    if (!session) {
      return;
    }

    setIsExportingPDF(true);
    setOpen(false); // Close popover

    try {
      const filename = await exportToPDF(session);
      alert(`PDF saved to Downloads folder: ${filename}`);
    } catch (error) {
      console.error("Failed to export PDF:", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const renderMainView = () => (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h3 className="text-sm font-medium text-gray-900">Share Enhanced Note</h3>
        <p className="text-xs text-gray-500 mt-0.5">Share your AI-enhanced meeting notes</p>
      </div>

      {/* Share Actions */}
      <div className="space-y-1.5">
        {
          /*
        <Button
          onClick={handleShareToSlack}
          className="w-full justify-start h-8 text-sm"
          variant="outline"
        >
          <SlackIcon className="size-4 mr-2" />
          Share to Slack
        </Button>
        */
        }

        <Button
          onClick={handleExportToPDF}
          disabled={isExportingPDF}
          className="w-full justify-start h-8 text-sm"
          variant="outline"
        >
          <FileText className="size-4 mr-2" />
          {isExportingPDF ? "Exporting..." : "Export as PDF"}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            disabled={!hasEnhancedNote}
            variant="ghost"
            size="icon"
            className="hover:bg-neutral-200"
            aria-label="Share"
          >
            <Share2Icon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 p-3 focus:outline-none focus:ring-0 focus:ring-offset-0"
          align="end"
        >
          {renderMainView()}
        </PopoverContent>
      </Popover>

      {/* Slack Share Modal */}
      <Modal
        open={slackModalOpen}
        onClose={handleCloseSlackModal}
        size="md"
        className="w-[420px] max-w-[90vw]"
      >
        <ModalHeader className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SlackIcon className="size-5" />
              <ModalTitle className="text-base">Share to Slack</ModalTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseSlackModal}
              className="h-7 w-7"
            >
              <X className="size-4" />
            </Button>
          </div>
        </ModalHeader>

        <ModalBody className="p-4 pt-0">
          <div className="space-y-4">
            {/* Workspace Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">
                Workspace
              </label>
              <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                <SelectTrigger>
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Atlassian">Atlassian</SelectItem>
                  <SelectItem value="Company">Company</SelectItem>
                  <SelectItem value="Team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Channel Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">
                Channel
              </label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person or channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="#general"># general</SelectItem>
                  <SelectItem value="#random"># random</SelectItem>
                  <SelectItem value="#meeting-notes"># meeting-notes</SelectItem>
                  <SelectItem value="@john.doe">@ john.doe</SelectItem>
                  <SelectItem value="@jane.smith">@ jane.smith</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">
                Message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message"
                rows={3}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
              />
            </div>

            {/* Share Button */}
            <Button
              onClick={handleSlackShare}
              disabled={isSharing || !selectedChannel}
              className="w-full"
            >
              {isSharing ? "Sharing..." : "Share to Slack"}
            </Button>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
}
