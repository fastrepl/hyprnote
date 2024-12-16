import { useState } from "react";
import * as Switch from "@radix-ui/react-switch";

export function General() {
  const [settings, setSettings] = useState({
    autoStart: true,
    autoUpdate: true,
    sendCrashReports: true,
    sendUsageData: false,
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900">일반</h3>
        <p className="mt-1 text-sm text-gray-500">
          기본적인 앱 설정을 관리하세요
        </p>
      </div>

      <div className="h-px bg-gray-200" />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">자동 시작</h4>
            <p className="text-sm text-gray-500">
              컴퓨터를 켤 때 자동으로 앱을 실행합니다
            </p>
          </div>
          <Switch.Root
            checked={settings.autoStart}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, autoStart: checked }))
            }
            className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-600"
          >
            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">자동 업데이트</h4>
            <p className="text-sm text-gray-500">
              새로운 버전이 있을 때 자동으로 업데이트합니다
            </p>
          </div>
          <Switch.Root
            checked={settings.autoUpdate}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, autoUpdate: checked }))
            }
            className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-600"
          >
            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              오류 보고서 전송
            </h4>
            <p className="text-sm text-gray-500">
              앱 개선을 위해 오류 보고서를 전송합니다
            </p>
          </div>
          <Switch.Root
            checked={settings.sendCrashReports}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, sendCrashReports: checked }))
            }
            className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-600"
          >
            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              사용 데이터 전송
            </h4>
            <p className="text-sm text-gray-500">
              앱 개선을 위해 사용 데이터를 전송합니다
            </p>
          </div>
          <Switch.Root
            checked={settings.sendUsageData}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, sendUsageData: checked }))
            }
            className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-600"
          >
            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
        </div>
      </div>
    </div>
  );
}
