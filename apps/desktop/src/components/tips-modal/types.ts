export interface TipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export type TipSlide = {
  title: string;
  description: string;
};
