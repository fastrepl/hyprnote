import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { mockNotes } from "../mocks/data";

export default function Home() {
  const [isNewUser] = useState(true);
  const navigate = useNavigate();

  return (
    <main className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <div className="space-y-8">
          {isNewUser && (
            <section>
              <h2 className="mb-4 text-xl font-semibold">다가오는 일정</h2>
              <div className="flex cursor-pointer items-center rounded-lg bg-white p-4 shadow-sm hover:bg-gray-50">
                <div className="mr-4 h-10 w-10 overflow-hidden rounded-full">
                  <img
                    src="/avatar.png"
                    alt="프로필 사진"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-medium">하이퍼 시작하기</h3>
                  <p className="text-sm text-emerald-600">
                    데모 미팅 체험하기 (2분)
                  </p>
                </div>
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-4 text-xl font-semibold">최근 노트</h2>

            <div className="space-y-4">
              {mockNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => navigate(`/note/${note.id}`)}
                  className="cursor-pointer rounded-lg bg-white p-4 shadow-sm hover:bg-gray-50"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <h3 className="font-medium">{note.title}</h3>
                    <span className="text-sm text-gray-500">
                      {new Date(note.updatedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mb-2 text-sm text-gray-600">{note.rawMemo}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
