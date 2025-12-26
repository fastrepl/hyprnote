import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

interface CaretPositionContextValue {
  isCaretNearBottom: boolean;
  setCaretNearBottom: (value: boolean) => void;
}

const CaretPositionContext = createContext<CaretPositionContextValue | null>(
  null,
);

export function CaretPositionProvider({ children }: { children: ReactNode }) {
  const [isCaretNearBottom, setIsCaretNearBottom] = useState(false);

  const setCaretNearBottom = useCallback((value: boolean) => {
    setIsCaretNearBottom(value);
  }, []);

  return (
    <CaretPositionContext.Provider
      value={{ isCaretNearBottom, setCaretNearBottom }}
    >
      {children}
    </CaretPositionContext.Provider>
  );
}

export function useCaretPosition() {
  return useContext(CaretPositionContext);
}
