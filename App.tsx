import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { AdminPanel } from './components/AdminPanel';
import { StudentPanel } from './components/StudentPanel';
import { User } from './types';
import { getSessions, updateSession } from './services/storage';
import { SESSION_TIMEOUT_MS } from './constants';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // 1. Session Cleanup: Deactivate sessions older than timeout
    const sessions = getSessions();
    const now = Date.now();
    let updated = false;

    sessions.forEach((s) => {
      if (s.isActive && now - s.startTime > SESSION_TIMEOUT_MS) {
        s.isActive = false;
        updateSession(s);
        updated = true;
      }
    });

    if (updated) {
      console.log('Auto-closed old sessions.');
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  if (!currentUser) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <>
      {currentUser.role === 'admin' ? (
        <AdminPanel currentUser={currentUser} />
      ) : (
        <StudentPanel currentUser={currentUser} />
      )}
    </>
  );
};

export default App;
