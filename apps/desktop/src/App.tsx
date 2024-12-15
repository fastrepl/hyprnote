import { BrowserRouter, Routes, Route } from "react-router";
import { useEffect } from "react";
import NavBar from "./components/layout/NavBar";
import Home from "./pages/Home";
import Note from "./pages/Note";
import { UIProvider } from "./contexts/UIContext";

function App() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        e.key === "Backspace" &&
        !["INPUT", "TEXTAREA"].includes(target.tagName) &&
        !(target.getAttribute("contenteditable") === "true")
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <BrowserRouter>
      <UIProvider>
        <div className="flex h-screen flex-col">
          <NavBar />
          <main className="w-full flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/note/:id" element={<Note />} />
            </Routes>
          </main>
        </div>
      </UIProvider>
    </BrowserRouter>
  );
}

export default App;