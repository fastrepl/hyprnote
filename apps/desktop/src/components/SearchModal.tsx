import "../styles/cmdk.css";

import { useEffect, useState, useRef } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  id: string;
  title: string;
  type: "meeting" | "note";
  date?: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  // Mock data
  const mockResults = [
    {
      id: "1",
      title: "주간 회의 - 제품 로드맵 논의",
      type: "meeting",
      date: "2024-03-20",
    },
    {
      id: "2",
      title: "팀 스크럼 미팅",
      type: "meeting",
      date: "2024-03-19",
    },
    {
      id: "3",
      title: "사용자 인터뷰 노트",
      type: "note",
      date: "2024-03-18",
    },
  ];

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <Command
        ref={modalRef}
        className="fixed left-1/2 top-[20%] mx-4 w-full max-w-2xl -translate-x-1/2"
        shouldFilter={false}
      >
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xl">
          <Command.Input
            value={search}
            onValueChange={setSearch}
            className="h-12 w-full border-b px-4 text-gray-700 outline-none"
            placeholder="회의와 노트 검색하기..."
            autoFocus
          />
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-gray-500">
              검색 결과가 없습니다
            </Command.Empty>

            {mockResults.map((result) => (
              <Command.Item
                key={result.id}
                value={result.title}
                onSelect={() => {
                  navigate(`/note/${result.id}`);
                  onClose();
                }}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 text-sm text-gray-900 hover:bg-gray-100"
              >
                <div className="h-4 w-4">
                  {result.type === "meeting" ? (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  ) : (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{result.title}</div>
                  <div className="text-xs text-gray-500">{result.date}</div>
                </div>
              </Command.Item>
            ))}
          </Command.List>
        </div>
      </Command>
    </div>
  );
}
