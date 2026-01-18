import { ModalClient } from "modal";

let modalClient: ModalClient | null = null;

export function getModalClient(): ModalClient {
  if (!modalClient) {
    modalClient = new ModalClient();
  }
  return modalClient;
}
