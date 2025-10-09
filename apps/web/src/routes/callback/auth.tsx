import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/callback/auth")({
  component: Component,
});

function Component() {
  const searchParams = Route.useSearch();
  const params = new URLSearchParams(searchParams as Record<string, string>);
  const code = params.get("code");
  const deeplink = "hypr://auth/callback?" + params.toString();

  const handleOpenApp = () => {
    window.open(deeplink);
  };

  if (typeof window !== "undefined") {
    setTimeout(() => {
      window.open(deeplink);
    }, 0);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="space-y-4">
          <p className="font-mono text-lg bg-gray-100 p-2 rounded">Code: {code}</p>
          <button
            onClick={handleOpenApp}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Open App
          </button>
        </div>
      </div>
    </div>
  );
}
