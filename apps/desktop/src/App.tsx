import "./App.css";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import NotePage from "./pages/NotePage";
import { UIProvider } from "./contexts/UIContext";

function App() {
  return (
    <BrowserRouter>
      <UIProvider>
        <div className="h-screen flex flex-col">
          <NavBar />
          <main className="flex-1">
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
