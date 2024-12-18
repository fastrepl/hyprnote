"use client";

import { useState } from "react";
import {
  RiPencilFill,
  RiArrowRightSLine,
  RiFlashlightFill,
} from "@remixicon/react";

export default function Demo() {
  const [isRecording, setIsRecording] = useState(true);
  const rawNote =
    "Meeting with Design Team\n\nDiscussed new feature implementation\nNeed to follow up with John re: UI specs\n\nDeadline set for next Friday\n\nAction items:\n- Create wireframes\n- Schedule follow-up";

  return (
    <div className="flex gap-8 items-center justify-center w-full mt-20">
      {/* Before - Raw Note Taking */}
      <div className="w-[400px] bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Window Controls */}
        <div className="bg-gray-100 px-4 py-2 border-b flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>

        {/* Editor Title */}
        <div className="border-b px-6 py-3 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800">
              Meeting with Design Team
            </span>
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded flex items-center gap-1">
              <RiPencilFill className="w-3 h-3" />
              Draft
            </span>
          </div>
        </div>

        {/* Note Content */}
        <div className="p-6 relative bg-white h-[400px]">
          <div className="text-sm whitespace-pre-wrap text-left h-full overflow-y-auto">
            {rawNote}
            <span className="inline-block w-0.5 h-5 bg-black animate-[blink_1s_steps(1)_infinite] ml-0.5" />
          </div>

          {/* Recording Indicator */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-record-blink" />
            <span className="text-xs text-red-500">Recording</span>
          </div>
        </div>
      </div>

      <RiArrowRightSLine className="w-8 h-8 text-gray-500" />

      {/* After - Enhanced Note */}
      <div className="w-[400px] bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Window Controls */}
        <div className="bg-gray-100 px-4 py-2 border-b flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>

        {/* Editor Title */}
        <div className="border-b px-6 py-3 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800">
              Meeting with Design Team
            </span>
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded flex items-center gap-1">
              <RiFlashlightFill className="w-3 h-3" />
              Hypercharged
            </span>
          </div>
        </div>

        {/* Enhanced Note Content */}
        <div className="p-6 bg-white h-[400px]">
          <div className="prose prose-sm max-w-none text-left h-full overflow-y-auto">
            <h1 className="text-xl font-semibold mb-4">
              Meeting with Design Team
            </h1>
            <div className="space-y-4">
              <p className="text-gray-700">
                Discussed new feature implementation for the upcoming product
                release. The team expressed enthusiasm about the innovative
                approach. Need to follow up with John regarding UI
                specifications and design system integration.
              </p>

              <div className="bg-yellow-50 p-3 rounded-lg space-y-2">
                <p className="font-medium text-yellow-800">
                  Deadline: Next Friday
                </p>
                <p className="text-sm text-yellow-700">
                  Team agreed to prioritize this feature for Q1 roadmap
                </p>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Key Points:</span> Design system
                  consistency, accessibility requirements, mobile-first approach
                </p>
              </div>

              <div>
                <h2 className="font-medium mb-2">Action Items:</h2>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Create wireframes with focus on responsive layouts</li>
                  <li>Schedule follow-up meeting with design system team</li>
                  <li>Review accessibility guidelines</li>
                  <li>Prepare prototype for stakeholder review</li>
                </ul>
              </div>

              <div className="text-sm text-gray-500">
                <span className="font-medium">Attendees:</span> Design Team
                (Sarah, Mike, Jennifer), Product (John), Engineering Lead
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
