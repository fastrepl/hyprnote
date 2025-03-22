import { useState } from "react";

import { type WidgetTwoByTwo, WidgetTwoByTwoWrapper } from "@hypr/ui/components/ui/widgets";
import { cn } from "@hypr/ui/lib/utils";
import type { CalculatorState } from "../../types";
import {
  formatDisplayValue,
  handleClear,
  handleDecimal,
  handleDelete,
  handleEquals,
  handleNumber,
  handleOperator,
} from "../../utils";

const BasicCalculator2x2: WidgetTwoByTwo = () => {
  const [state, setState] = useState<CalculatorState>({
    display: "0",
    prevValue: null,
    operator: null,
    operation: "",
    newNumber: true,
  });

  const updateState = (updates: Partial<CalculatorState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const Button = ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full h-full text-2xl font-light border border-neutral-200 hover:bg-neutral-100",
        className,
      )}
    >
      {children}
    </button>
  );

  return (
    <WidgetTwoByTwoWrapper>
      <div className="h-full flex flex-col bg-white text-neutral-900 rounded-lg overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex-none h-32 flex flex-col items-end justify-end p-4 overflow-hidden">
            <div className="text-2xl text-neutral-400 font-light truncate max-w-full">
              {state.operation || ""}
            </div>
            <div className="text-5xl font-light truncate max-w-full">
              {formatDisplayValue(state.display)}
            </div>
          </div>
          <div className="flex-1 grid grid-cols-4">
            <Button
              onClick={() => setState(handleClear())}
              className="text-neutral-600 bg-neutral-100"
            >
              C
            </Button>
            <Button
              onClick={() => updateState(handleDelete(state))}
              className="text-neutral-600 bg-neutral-100"
            >
              ⌫
            </Button>
            <Button
              onClick={() => {}}
              className="text-neutral-600 bg-neutral-100"
            >
              %
            </Button>
            <Button
              onClick={() => updateState(handleOperator(state, "÷"))}
              className="bg-neutral-200"
            >
              ÷
            </Button>

            <Button onClick={() => updateState(handleNumber(state, "7"))}>
              7
            </Button>
            <Button onClick={() => updateState(handleNumber(state, "8"))}>
              8
            </Button>
            <Button onClick={() => updateState(handleNumber(state, "9"))}>
              9
            </Button>
            <Button
              onClick={() => updateState(handleOperator(state, "×"))}
              className="bg-neutral-200"
            >
              ×
            </Button>

            <Button onClick={() => updateState(handleNumber(state, "4"))}>
              4
            </Button>
            <Button onClick={() => updateState(handleNumber(state, "5"))}>
              5
            </Button>
            <Button onClick={() => updateState(handleNumber(state, "6"))}>
              6
            </Button>
            <Button
              onClick={() => updateState(handleOperator(state, "-"))}
              className="bg-neutral-200"
            >
              −
            </Button>

            <Button onClick={() => updateState(handleNumber(state, "1"))}>
              1
            </Button>
            <Button onClick={() => updateState(handleNumber(state, "2"))}>
              2
            </Button>
            <Button onClick={() => updateState(handleNumber(state, "3"))}>
              3
            </Button>
            <Button
              onClick={() => updateState(handleOperator(state, "+"))}
              className="bg-neutral-200"
            >
              +
            </Button>

            <Button
              onClick={() => updateState(handleNumber(state, "0"))}
              className="col-span-2"
            >
              0
            </Button>
            <Button onClick={() => updateState(handleDecimal(state))}>.</Button>
            <Button
              onClick={() => updateState(handleEquals(state))}
              className="bg-neutral-200"
            >
              =
            </Button>
          </div>
        </div>
      </div>
    </WidgetTwoByTwoWrapper>
  );
};

export default BasicCalculator2x2;
