import React, { useState, useEffect } from 'react';
import { User, Session, AttendanceRecord, StudentData } from '../types';
import { getSessions, getAttendance, saveAttendance, getStudentDatabase, getClientIp } from '../services/storage';
import { ATTENDANCE_WINDOW_MS } from '../constants';
import { MapPin, CheckCircle, XCircle, Loader2, RefreshCw, Clock } from 'lucide-react';

interface StudentPanelProps {
  currentUser: User;
}

export const StudentPanel: React.FC<StudentPanelProps> = ({ currentUser }) => {
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const allSessions = getSessions();
    // Filter active sessions
    const active = allSessions.filter(s => s.isActive);
    setActiveSessions(active);
    
    // Load history
    const allAttendance = getAttendance();
    const myHistory = allAttendance.filter(a => a.studentId === currentUser.bucId);
    setHistory(myHistory);
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handleCheckIn = async (session: Session) => {
    setMessage(null);
    setCheckingIn(session.id);

    // 0. Time Limit Check (30 minutes)
    const timeElapsed = Date.now() - session.startTime;
    if (timeElapsed > ATTENDANCE_WINDOW_MS) {
        setMessage({ text: "Attendance window closed. You have been marked absent.", type: 'error' });
        setCheckingIn(null);
        return;
    }

    // 1. Check if already checked in
    const already = history.find(h => h.sessionId === session.id);
    if (already) {
        setMessage({ text: "You have already recorded attendance for this session.", type: 'error' });
        setCheckingIn(null);
        return;
    }

    // 2. Validate Student against Master Database (Name vs ID)
    const db = getStudentDatabase();
    // Assuming currentUser.bucId is valid.
    // Check if ID matches Name roughly (First name)
    const studentRecord = db.find(s => s.bucId === currentUser.bucId);
    
    // STRICT CHECK: The ID in the database must exist
    if (db.length > 0 && !studentRecord) {
        setMessage({ text: "Your ID is not found in the Instructor's student list. Please contact the instructor.", type: 'error' });
        setCheckingIn(null);
        return;
    }

    // Optional: Check name match if record exists
    if (studentRecord) {
        const registeredFirstName = currentUser.firstName.toLowerCase();
        const dbName = studentRecord.fullName.toLowerCase();
        if (!dbName.includes(registeredFirstName)) {
             // We allow it but warn, or block. Let's block for strictness as requested.
             setMessage({ text: `ID mismatch: The ID ${currentUser.bucId} belongs to ${studentRecord.fullName}, but you are registered as ${currentUser.firstName}.`, type: 'error' });
             setCheckingIn(null);
             return;
        }
    }

    // 3. IP Check (Simulated)
    const currentIp = await getClientIp();
    // Check if this IP has already checked in for THIS session with a DIFFERENT student ID
    const sessionAttendance = getAttendance().filter(a => a.sessionId === session.id);
    const usedIp = sessionAttendance.find(a => a.ipAddress === currentIp && a.studentId !== currentUser.bucId);
    
    if (usedIp) {
         setMessage({ text: "Suspicious activity: This device/network has already been used to check in another student.", type: 'error' });
         setCheckingIn(null);
         return;
    }

    // 4. Geolocation Check
    if (!navigator.geolocation) {
        setMessage({ text: "Geolocation is not supported. Please enable permissions.", type: 'error' });
        setCheckingIn(null);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const dist = getDistance(
                pos.coords.latitude, pos.coords.longitude,
                session.latitude, session.longitude
            );

            if (dist > session.radius) {
                 setMessage({ text: `You are too far from the hall (${Math.round(dist)}m). You must be within ${session.radius}m.`, type: 'error' });
                 setCheckingIn(null);
                 return;
            }

            // SUCCESS
            const record: AttendanceRecord = {
                sessionId: session.id,
                studentId: currentUser.bucId!,
                studentEmail: currentUser.email,
                studentName: `${currentUser.firstName} ${currentUser.lastName}`,
                timestamp: Date.now(),
                status: 1,
                ipAddress: currentIp
            };

            saveAttendance(record);
            setMessage({ text: "Attendance Recorded Successfully!", type: 'success' });
            setCheckingIn(null);
            loadData(); // Refresh history
        },
        (err) => {
            setMessage({ text: "Could not get location. Please allow GPS permissions.", type: 'error' });
            setCheckingIn(null);
        },
        { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white p-4 shadow-sm border-b border-gray-200">
         <div className="max-w-md mx-auto flex justify-between items-center">
            <div>
                <h1 className="font-bold text-lg text-gray-800">Student Portal</h1>
                <p className="text-xs text-gray-500">{currentUser.firstName} • {currentUser.bucId}</p>
            </div>
            <button onClick={loadData} className="text-gray-600 p-2 bg-gray-100 rounded-full">
                <RefreshCw className="w-4 h-4" />
            </button>
         </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Messages */}
        {message && (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
                <p className="text-sm">{message.text}</p>
            </div>
        )}

        {/* Active Sessions */}
        <section>
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" /> Nearby Sessions
            </h2>
            
            {activeSessions.length === 0 ? (
                <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 opacity-20 animate-spin" />
                    <p>No active sessions found.</p>
                    <p className="text-xs mt-2">Wait for your instructor to start the session.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {activeSessions.map(session => {
                        const timeLeft = Math.max(0, ATTENDANCE_WINDOW_MS - (Date.now() - session.startTime));
                        const minutesLeft = Math.ceil(timeLeft / 60000);
                        const isExpired = timeLeft <= 0;

                        return (
                            <div key={session.id} className={`bg-white border ${isExpired ? 'border-red-200 opacity-75' : 'border-blue-200'} rounded-xl p-5 shadow-sm relative overflow-hidden`}>
                                <div className={`absolute top-0 right-0 ${isExpired ? 'bg-red-600' : 'bg-blue-600'} text-white text-xs px-3 py-1 rounded-bl-lg`}>
                                    Week {session.week}
                                </div>
                                <h3 className="font-bold text-lg">{session.name}</h3>
                                <div className="flex gap-2 text-sm text-gray-600 mt-1 mb-4">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded">{session.type}</span>
                                    <span className="bg-gray-100 px-2 py-0.5 rounded">{session.group}</span>
                                </div>
                                
                                <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                                    <Clock className="w-3 h-3" />
                                    {isExpired ? "Attendance Closed" : `Closes in ${minutesLeft} mins`}
                                </div>

                                {history.find(h => h.sessionId === session.id) ? (
                                    <button disabled className="w-full bg-green-100 text-green-700 font-bold py-3 rounded-lg flex justify-center items-center gap-2 cursor-default">
                                        <CheckCircle className="w-5 h-5" /> Checked In
                                    </button>
                                ) : isExpired ? (
                                    <button disabled className="w-full bg-red-100 text-red-700 font-bold py-3 rounded-lg flex justify-center items-center gap-2 cursor-default">
                                        <XCircle className="w-5 h-5" /> Marked Absent
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleCheckIn(session)}
                                        disabled={checkingIn === session.id}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2">
                                        {checkingIn === session.id ? (
                                            <>Checking Location...</>
                                        ) : (
                                            <>Check In Now</>
                                        )}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>

        {/* Recent History */}
        <section className="pt-4 border-t">
            <h2 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wider">Attendance History</h2>
            <div className="space-y-2">
                {history.slice().reverse().map(h => {
                    // find session details (might be inactive now)
                    const s = getSessions().find(x => x.id === h.sessionId);
                    return (
                        <div key={h.sessionId} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 text-sm">
                            <div>
                                <div className="font-medium text-gray-800">{s?.name || 'Unknown Session'}</div>
                                <div className="text-xs text-gray-500">Week {s?.week} • {s?.type}</div>
                            </div>
                            <div className="text-xs text-gray-400">
                                {new Date(h.timestamp).toLocaleDateString()}
                            </div>
                        </div>
                    );
                })}
                {history.length === 0 && <p className="text-gray-400 text-sm italic">No records yet.</p>}
            </div>
        </section>
      </div>
    </div>
  );
};