import { useState } from "react";

export default function MyTasks() {
  const [tasks] = useState([
    "Lorem ipsum dolor sit amet",
    "Aliquam faucibus",
    "Fusce dictum nec tellus",
  ]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">My Tasks</h2>
      <div className="space-y-2">
        {tasks.map((task, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="checkbox" className="border-2 border-black rounded" />
            <span>{task}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
