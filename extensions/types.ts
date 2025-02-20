export interface Extension {
  init: () => Promise<void>;
  modal?: (client: any, onClose: () => void) => React.ReactNode;
  panelSmall?: (client: any) => React.ReactNode;
  panelLarge?: (client: any) => React.ReactNode;
}
