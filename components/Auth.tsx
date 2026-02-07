import React, { useState } from 'react';
import { ADMIN_EMAIL, ALLOWED_DOMAIN, UNIVERSITY_NAME } from '../constants';
import { User, Role } from '../types';
import { findUserByEmail, saveUser, getClientIp, verifyUser } from '../services/storage';
import { Mail, ShieldCheck, BookOpen, Lock, User as UserIcon, CheckCircle, ArrowRight } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

type AuthMode = 'signin' | 'signup' | 'activation_pending' | 'simulated_email_link';

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bucId, setBucId] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const validateEmail = (e: string) => {
    return e.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError('Please enter email and password.');
      return;
    }

    if (!validateEmail(normalizedEmail)) {
      setError(`Only @${ALLOWED_DOMAIN} emails are allowed.`);
      return;
    }

    const user = findUserByEmail(normalizedEmail);
    const isAdmin = normalizedEmail === ADMIN_EMAIL.toLowerCase();

    if (isAdmin) {
      // Admin Auto-Creation/Login Logic
      if (user) {
        if (user.password === password) {
          onLogin(user);
        } else {
          setError('Invalid admin password.');
        }
      } else {
        // First time admin login - Create account transparently
        const ip = await getClientIp();
        const newAdmin: User = {
          email: normalizedEmail,
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          password: password,
          registeredAt: new Date().toISOString(),
          registeredIp: ip,
          isVerified: true
        };
        saveUser(newAdmin);
        onLogin(newAdmin);
      }
      return;
    }

    // Student Login Logic
    if (!user) {
      setError('Account not found. Please Sign Up to register your account.');
      return;
    }

    if (user.password !== password) {
      setError('Invalid password.');
      return;
    }

    if (!user.isVerified) {
      setError('Account is not activated. Please check your email for the activation link.');
      return;
    }

    onLogin(user);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password || !firstName || !lastName || !bucId) {
      setError('All fields are required.');
      return;
    }

    if (!validateEmail(normalizedEmail)) {
      setError(`Registration restricted to @${ALLOWED_DOMAIN} emails only.`);
      return;
    }

    const existingUser = findUserByEmail(normalizedEmail);
    if (existingUser) {
      setError('User already exists. Please Sign In.');
      return;
    }

    const ip = await getClientIp();

    const newUser: User = {
      email: normalizedEmail,
      firstName,
      lastName,
      bucId: bucId,
      role: 'student',
      password: password,
      registeredAt: new Date().toISOString(),
      registeredIp: ip,
      isVerified: false // Must activate first
    };

    saveUser(newUser);
    setMode('activation_pending');
  };

  const handleSimulateActivation = () => {
    verifyUser(email);
    setMode('signin');
    setSuccessMsg('Account activated successfully! You can now sign in.');
    setPassword(''); // Clear password for security
  };

  // --- RENDER FUNCTIONS ---

  if (mode === 'activation_pending') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <Mail className="w-16 h-16 mx-auto text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Check your Email</h2>
          <p className="text-gray-600 mb-6">
            We've sent an activation link to <strong>{email}</strong>. <br/>
            Please click the link in the email to activate your account.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-sm text-yellow-800 mb-6">
            <strong>Simulation Mode:</strong> Since this is a demo, click the button below to simulate clicking the email link.
          </div>
          <button 
            onClick={() => setMode('simulated_email_link')}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
            Open Email Inbox (Simulation)
          </button>
          <button 
            onClick={() => setMode('signin')}
            className="mt-4 text-gray-500 text-sm hover:underline">
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'simulated_email_link') {
    return (
      <div className="min-h-screen bg-gray-200 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-lg bg-white shadow-2xl rounded-lg overflow-hidden border border-gray-300">
            {/* Fake Email Header */}
            <div className="bg-gray-100 p-4 border-b flex justify-between items-center">
                <span className="font-bold text-gray-700">Inbox</span>
                <span className="text-xs text-gray-500">Just now</span>
            </div>
            {/* Email Body */}
            <div className="p-8">
                <h1 className="text-xl font-bold text-blue-900 mb-4">{UNIVERSITY_NAME}</h1>
                <p className="mb-4">Hello {firstName},</p>
                <p className="mb-6">Thank you for registering. Please confirm your email address to activate your attendance account.</p>
                <button 
                    onClick={handleSimulateActivation}
                    className="bg-green-600 text-white px-6 py-3 rounded font-bold hover:bg-green-700 block mx-auto">
                    Activate Account
                </button>
                <p className="mt-6 text-sm text-gray-500">If you did not request this, please ignore this email.</p>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-900 p-8 text-white text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-blue-300" />
          <h1 className="text-2xl font-bold">{UNIVERSITY_NAME}</h1>
          <p className="text-blue-200 mt-2">Smart Attendance Portal</p>
        </div>

        <div className="p-8">
          {/* Tabs */}
          <div className="flex justify-center mb-8 bg-gray-100 p-1 rounded-lg">
            <button 
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'signin' ? 'bg-white shadow text-blue-900' : 'text-gray-500'}`}
              onClick={() => { setMode('signin'); setError(''); setSuccessMsg(''); }}
            >
              Sign In
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'signup' ? 'bg-white shadow text-blue-900' : 'text-gray-500'}`}
              onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}
            >
              Sign Up
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg flex items-center gap-2 mb-4">
               <ShieldCheck className="w-4 h-4" /> {error}
            </div>
          )}
          {successMsg && (
            <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg flex items-center gap-2 mb-4">
               <CheckCircle className="w-4 h-4" /> {successMsg}
            </div>
          )}

          {/* Forms */}
          <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
            
            {/* SIGN UP EXTRA FIELDS */}
            {mode === 'signup' && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                        <input 
                            type="text"
                            placeholder="First Name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                    </div>
                    <div className="relative">
                        <input 
                            type="text"
                            placeholder="Last Name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                    </div>
                    <div className="relative col-span-2">
                        <span className="absolute left-3 top-3 text-gray-400 font-bold text-xs">ID</span>
                        <input 
                            type="text"
                            placeholder="Student ID (e.g. 2021001)"
                            value={bucId}
                            onChange={(e) => setBucId(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
            )}

            {/* COMMON FIELDS */}
            <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="University Email (@buc.edu.eg)"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? "Create Password" : "Password"}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-900 hover:bg-blue-800 text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg">
              {mode === 'signin' ? 'Sign In' : 'Register Account'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-4">
             {mode === 'signin' 
                ? "Students must register before logging in." 
                : "A confirmation link will be sent to your university email."}
          </p>
        </div>
      </div>
    </div>
  );
};