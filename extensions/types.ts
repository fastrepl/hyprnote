export interface Extension {
  init: () => Promise<void>;
  modal?: (client: any, onClose: () => void) => React.ReactNode;
}
