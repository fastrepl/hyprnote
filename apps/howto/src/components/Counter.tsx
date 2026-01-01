import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="my-4 p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
      <p className="text-lg mb-2">
        Count: <span className="font-bold">{count}</span>
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setCount(count - 1)}
          className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          -
        </button>
        <button
          onClick={() => setCount(count + 1)}
          className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white"
        >
          +
        </button>
      </div>
    </div>
  );
}
