declare module "*.jinja?raw" {
  const content: string;
  export default content;
}

declare interface Extension {
  init: () => Promise<void>;
  modal?: () => React.ReactNode;
}
