import React, { useState } from "react";
import ChatbotView from "./components/ChatbotView";
import AdminView from "./components/AdminView";
import LoginModal from "./components/LoginModal";

export default function App() {
  const [isAdminView, setIsAdminView] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleAdminLoginSuccess = () => {
    setShowLoginModal(false);
    setIsAdminView(true);
  };

  if (isAdminView) {
    return (
      <AdminView 
        onLogout={() => setIsAdminView(false)} 
      />
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen">
      <ChatbotView 
        onAdminLoginClick={() => setShowLoginModal(true)} 
      />

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleAdminLoginSuccess}
        />
      )}
    </div>
  );
}
