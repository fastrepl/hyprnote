export interface ProGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "template" | "chat";
}

export type ProGateType = "template" | "chat";
