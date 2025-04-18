import { Button } from "@hypr/ui/components/ui/button";
import { type WidgetTwoByOne, WidgetTwoByOneWrapper } from "@hypr/ui/components/ui/widgets";
import { cn } from "@hypr/ui/lib/utils";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const INIT_MINUTES = 60;

const DigitsTimer2x1: WidgetTwoByOne = () => {
  const [timeLeft, setTimeLeft] = useState(INIT_MINUTES * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [inputTime, setInputTime] = useState(INIT_MINUTES.toString());
  const [isEditing, setIsEditing] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const timerRef = useRef<number | null>(null);
  const blinkRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isTimeUp = timeLeft === 0;

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (!isRunning && timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0) {
      setIsRunning(false);

      if (!blinkRef.current) {
        blinkRef.current = window.setInterval(() => {
          setIsBlinking((prev) => !prev);
        }, 500);
      }
    } else {
      if (blinkRef.current) {
        clearInterval(blinkRef.current);
        blinkRef.current = null;
        setIsBlinking(false);
      }
    }

    return () => {
      if (blinkRef.current) {
        clearInterval(blinkRef.current);
        blinkRef.current = null;
      }
    };
  }, [timeLeft]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isEditing && inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsEditing(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing]);

  const toggleTimer = () => {
    setIsRunning((prev) => !prev);
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (blinkRef.current) {
      clearInterval(blinkRef.current);
      blinkRef.current = null;
      setIsBlinking(false);
    }
    const parsedTime = Math.max(Math.min(parseInt(inputTime || "1"), 60), 1);
    setInputTime(parsedTime.toString());
    setTimeLeft(parsedTime * 60);
  };

  const formatTime = (seconds: number) => {
    if (seconds === 0) {
      return "TIME'S UP!";
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTimeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setInputTime(value);

    if (!isRunning) {
      const parsedValue = parseInt(value || "1");
      const validValue = Math.max(Math.min(parsedValue, 60), 1);

      if (parsedValue !== validValue) {
        setInputTime(validValue.toString());
      }

      setTimeLeft(validValue * 60);
    }
  };

  return (
    <WidgetTwoByOneWrapper>
      <div className="flex flex-col items-center justify-center w-full h-full gap-4 p-4">
        {isEditing && !isRunning && !isTimeUp
          ? (
            <input
              ref={inputRef}
              type="number"
              min="1"
              max="60"
              value={inputTime}
              onChange={handleTimeInput}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
              className="w-24 text-center text-2xl font-mono bg-transparent border rounded focus:outline-none"
              style={{
                appearance: "textfield",
                MozAppearance: "textfield",
              }}
            />
          )
          : (
            <div
              onClick={() => !isRunning && !isTimeUp && setIsEditing(true)}
              className={cn(
                "text-4xl font-mono cursor-pointer  transition-colors duration-300",
                isTimeUp && "font-bold",
                isTimeUp && isBlinking && "text-red-500",
              )}
            >
              {formatTime(timeLeft)}
            </div>
          )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTimer}
            disabled={isTimeUp}
          >
            {isRunning ? <Pause size={20} /> : <Play size={20} />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={resetTimer}
            className={isTimeUp ? "border-red-500 text-red-500 hover:bg-red-100" : ""}
          >
            <RotateCcw size={20} />
          </Button>
        </div>
      </div>
    </WidgetTwoByOneWrapper>
  );
};

export default DigitsTimer2x1;
