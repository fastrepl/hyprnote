import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";

function App() {
  useEffect(() => {
    invoke("init");
  }, []);

  return (
    <main className="menubar-panel">
      <h1>Hyprnote Control</h1>
      <p>Your menubar content goes here...</p>
    </main>
  );
}

export default App;
