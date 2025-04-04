import React, { createContext, useContext, useEffect, useState } from "react";

interface LoginModalContextType {
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  shouldShowLoginModal: boolean;
  setShouldShowLoginModal: (value: boolean) => void;
}

const LoginModalContext = createContext<LoginModalContextType | undefined>(undefined);

export function useLoginModal() {
  const context = useContext(LoginModalContext);
  if (context === undefined) {
    throw new Error("useLoginModal must be used within a LoginModalProvider");
  }
  return context;
}

interface LoginModalProviderProps {
  children: React.ReactNode;
}

export function LoginModalProvider({ children }: LoginModalProviderProps) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [shouldShowLoginModal, setShouldShowLoginModal] = useState(true);

  useEffect(() => {
    const hasLoginBeenDismissed = localStorage.getItem("loginModalDismissed") === "true";

    if (shouldShowLoginModal && !hasLoginBeenDismissed) {
      setIsLoginModalOpen(true);
    }
  }, [shouldShowLoginModal]);

  const openLoginModal = () => setIsLoginModalOpen(true);

  const closeLoginModal = () => {
    localStorage.setItem("loginModalDismissed", "true");
    setIsLoginModalOpen(false);
  };

  return (
    <LoginModalContext.Provider
      value={{
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        shouldShowLoginModal,
        setShouldShowLoginModal,
      }}
    >
      {children}
    </LoginModalContext.Provider>
  );
}
