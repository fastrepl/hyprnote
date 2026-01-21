import { create } from "zustand";

type UndoableOperation = {
  type: "delete_session";
  sessionId: string;
  checkpointId: string;
  timestamp: number;
  audioDeleteTimeoutId?: ReturnType<typeof setTimeout>;
};

interface UndoState {
  operations: UndoableOperation[];
  addOperation: (operation: Omit<UndoableOperation, "timestamp">) => void;
  removeOperation: (checkpointId: string) => void;
  getLatestOperation: () => UndoableOperation | undefined;
  clearOperations: () => void;
}

const UNDO_TIMEOUT_MS = 10000;

export const useUndoStore = create<UndoState>((set, get) => ({
  operations: [],

  addOperation: (operation) => {
    const newOperation: UndoableOperation = {
      ...operation,
      timestamp: Date.now(),
    };

    set((state) => {
      const filtered = state.operations.filter(
        (op) => Date.now() - op.timestamp < UNDO_TIMEOUT_MS,
      );
      return { operations: [...filtered, newOperation] };
    });

    setTimeout(() => {
      set((state) => ({
        operations: state.operations.filter(
          (op) => op.checkpointId !== operation.checkpointId,
        ),
      }));
    }, UNDO_TIMEOUT_MS);
  },

  removeOperation: (checkpointId) => {
    const operation = get().operations.find(
      (op) => op.checkpointId === checkpointId,
    );
    if (operation?.audioDeleteTimeoutId) {
      clearTimeout(operation.audioDeleteTimeoutId);
    }
    set((state) => ({
      operations: state.operations.filter(
        (op) => op.checkpointId !== checkpointId,
      ),
    }));
  },

  getLatestOperation: () => {
    const { operations } = get();
    if (operations.length === 0) return undefined;
    return operations[operations.length - 1];
  },

  clearOperations: () => {
    const { operations } = get();
    for (const op of operations) {
      if (op.audioDeleteTimeoutId) {
        clearTimeout(op.audioDeleteTimeoutId);
      }
    }
    set({ operations: [] });
  },
}));
