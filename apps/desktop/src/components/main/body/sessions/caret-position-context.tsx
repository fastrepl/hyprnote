import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

interface CaretPositionContextValue {
  isCaretNearBottom: boolean;
  setCaretNearBottom: (value: boolean) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const CaretPositionContext = createContext<CaretPositionContextValue | null>(
  null,
);

export function useCaretPosition() {
  return useContext(CaretPositionContext);
}

const BOTTOM_THRESHOLD = 112;

export function CaretPositionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCaretNearBottom, setIsCaretNearBottom] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const setCaretNearBottom = useCallback((value: boolean) => {
    setIsCaretNearBottom(value);
  }, []);

  const value = useMemo(
    () => ({
      isCaretNearBottom,
      setCaretNearBottom,
      containerRef,
    }),
    [isCaretNearBottom, setCaretNearBottom],
  );

  return (
    <CaretPositionContext.Provider value={value}>
      {children}
    </CaretPositionContext.Provider>
  );
}

export { BOTTOM_THRESHOLD };
