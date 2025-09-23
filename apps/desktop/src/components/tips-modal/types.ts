export interface TipsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type TipSlide = {
  title: string;
  description: string;
};
