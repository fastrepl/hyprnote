interface LicenseInfo {
  type: "Free" | "Starter Pack" | "For Life";
  price: string;
  features: string[];
  duration: string;
  buttonText: string;
}

interface LicenseSettingsProps {
  licenses: LicenseInfo[];
}

export function LicenseSettings({ licenses }: LicenseSettingsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {licenses.map((license) => (
        <div
          key={license.type}
          className="rounded-lg border border-gray-200 p-6 shadow-sm"
        >
          <h3 className="text-lg font-medium text-gray-900">{license.type}</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {license.price}
          </p>
          <p className="mt-1 text-sm text-gray-500">{license.duration}</p>
          <ul className="mt-4 space-y-2">
            {license.features.map((feature, index) => (
              <li
                key={index}
                className="flex items-center text-sm text-gray-600"
              >
                <svg
                  className="mr-2 h-4 w-4 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-6 w-full rounded-md border border-transparent bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {license.buttonText}
          </button>
        </div>
      ))}
    </div>
  );
}
