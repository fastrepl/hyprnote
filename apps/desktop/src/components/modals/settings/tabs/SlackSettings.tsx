import SlackIcon from "../../../../constants/icons/SlackIcon";

export function SlackSettings() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <SlackIcon />
        <h3 className="mb-2 text-lg font-medium text-gray-900">
          Slack 연동하기
        </h3>
        <p className="mb-6 text-sm text-gray-600">
          Slack에서 미팅 알림을 받고 상태를 자동으로 업데이트하세요
        </p>
        <button
          onClick={() => {
            /* TODO: Implement Slack connection */
          }}
          className="inline-flex items-center gap-2 rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
          Slack으로 연결하기
        </button>
      </div>
    </div>
  );
}
