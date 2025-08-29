export interface ProGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "template" | "chat" | "template_duplicate";
}

export type ProGateType = "template" | "chat" | "template_duplicate";
