import { useState, useRef } from "react";
import { UserCircle } from "lucide-react";

export function Profile() {
  const [fullName, setFullName] = useState("");
  const [email] = useState("john@example.com");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [initialFullName] = useState(fullName);
  const [initialAvatarUrl] = useState(avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isChanged =
    fullName !== initialFullName || avatarUrl !== initialAvatarUrl;

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    // TODO: Save changes
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900">프로필</h3>
        <p className="mt-1 text-sm text-gray-500">프로필 정보를 관리하세요</p>
      </div>

      <div className="h-px bg-gray-200" />

      <div className="space-y-6">
        <div>
          <div className="relative h-24 w-24 overflow-hidden rounded-full bg-gray-100">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <UserCircle className="h-full w-full text-gray-400" />
            )}
            <button
              type="button"
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 transition-opacity hover:opacity-100"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="text-xs text-white">변경</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-700"
            >
              이름
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="이름을 입력하세요"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              이메일
            </label>
            <input
              type="email"
              id="email"
              value={email}
              disabled
              className="mt-1 block rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500"
            />
          </div>
        </div>

        <div>
          <button
            type="button"
            disabled={!isChanged}
            onClick={handleSave}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isChanged
                ? "bg-blue-600 hover:bg-blue-700"
                : "cursor-not-allowed bg-gray-400"
            }`}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
