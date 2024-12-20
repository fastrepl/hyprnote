import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { UIProvider } from "./contexts/UIContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import "./i18n/config";
import NavBar from "./components/layout/NavBar";
import Home from "./pages/Home";
import Note from "./pages/Note";
import Login from "./pages/Login";

// interface ProtectedRouteProps {
//   children: React.ReactNode;
// }

// const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
//   // Replace this with your actual authentication check
//   const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
//   return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
// };

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
      <LanguageProvider>
        <UIProvider>
          <div className="flex h-screen flex-col">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <>
                    <NavBar />
                    <main className="w-full flex-1 overflow-auto bg-gray-50">
                      <Home />
                    </main>
                  </>
                }
              />
              <Route
                path="/note/:id"
                element={
                  <>
                    <NavBar />
                    <main className="w-full flex-1 overflow-auto bg-gray-50">
                      <Note />
                    </main>
                  </>
                }
              />
            </Routes>
          </div>
        </UIProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
