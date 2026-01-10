import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";

function App() {
  useEffect(() => {
    invoke("init");
  }, []);

  return (
    <main className="menubar-panel flex flex-col justify-center items-center min-h-screen p-4 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-xl rounded-[13px] font-sans antialiased">
      <h1 className="text-xl font-semibold mb-2">Hyprnote Control</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Your menubar content goes here...
      </p>
    </main>
  );
}

export default App;
