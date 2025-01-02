import { RiFlashlightLine } from "@remixicon/react";

export default function LightBulb() {
  return (
    <div className="flex min-h-48 items-center justify-center bg-slate-800 p-8">
      <div className="relative">
        <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-yellow-300 shadow-lg shadow-yellow-300/50">
          <RiFlashlightLine size={20} className="text-yellow-600" />
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-3">
          <div className="h-5 w-6 rounded bg-gray-400" />
        </div>
      </div>
    </div>
  );
}
