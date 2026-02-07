import { User, Session, AttendanceRecord, StudentData } from '../types';

// Keys
const K_USERS = 'buc_users';
const K_SESSIONS = 'buc_sessions';
const K_ATTENDANCE = 'buc_attendance';
const K_STUDENT_DB = 'buc_student_db';

// Helper to get IP (mock/public api)
export const getClientIp = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (e) {
    console.error("Failed to get IP", e);
    return "unknown-ip";
  }
};

// Users
export const getUsers = (): User[] => {
  const data = localStorage.getItem(K_USERS);
  return data ? JSON.parse(data) : [];
};

export const saveUser = (user: User) => {
  const users = getUsers();
  users.push(user);
  localStorage.setItem(K_USERS, JSON.stringify(users));
};

export const findUserByEmail = (email: string): User | undefined => {
  const users = getUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
};

export const verifyUser = (email: string): boolean => {
  const users = getUsers();
  const index = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  if (index !== -1) {
    users[index].isVerified = true;
    localStorage.setItem(K_USERS, JSON.stringify(users));
    return true;
  }
  return false;
};

// Sessions
export const getSessions = (): Session[] => {
  const data = localStorage.getItem(K_SESSIONS);
  return data ? JSON.parse(data) : [];
};

export const saveSession = (session: Session) => {
  const sessions = getSessions();
  sessions.push(session);
  localStorage.setItem(K_SESSIONS, JSON.stringify(sessions));
};

export const updateSession = (updatedSession: Session) => {
  const sessions = getSessions();
  const index = sessions.findIndex(s => s.id === updatedSession.id);
  if (index !== -1) {
    sessions[index] = updatedSession;
    localStorage.setItem(K_SESSIONS, JSON.stringify(sessions));
  }
};

// Attendance
export const getAttendance = (): AttendanceRecord[] => {
  const data = localStorage.getItem(K_ATTENDANCE);
  return data ? JSON.parse(data) : [];
};

export const saveAttendance = (record: AttendanceRecord) => {
  const records = getAttendance();
  // Check for duplicates
  const exists = records.find(r => r.sessionId === record.sessionId && r.studentId === record.studentId);
  if (!exists) {
    records.push(record);
    localStorage.setItem(K_ATTENDANCE, JSON.stringify(records));
  }
};

// Student Database (Uploaded by Admin)
export const getStudentDatabase = (): StudentData[] => {
  const data = localStorage.getItem(K_STUDENT_DB);
  return data ? JSON.parse(data) : [];
};

export const saveStudentDatabase = (students: StudentData[]) => {
  localStorage.setItem(K_STUDENT_DB, JSON.stringify(students));
};