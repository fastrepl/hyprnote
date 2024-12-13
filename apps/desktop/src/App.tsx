import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import NotePage from "./pages/NotePage";
import { UIProvider } from "./contexts/UIContext";

function App() {
  return (
    <BrowserRouter>
      <UIProvider>
        <div className="flex h-screen flex-col">
          <NavBar />
          <main className="w-full flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/note/:id" element={<NotePage />} />
            </Routes>
          </main>
        </div>
      </UIProvider>
    </BrowserRouter>
  );
}

export default App;
