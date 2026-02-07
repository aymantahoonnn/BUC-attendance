export type Role = 'admin' | 'student';

export interface User {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  bucId?: string; // Student ID
  password?: string; // Mock password for Microsoft simulation
  registeredAt: string;
  registeredIp?: string;
  isVerified: boolean; // Simulates email activation
}

export interface StudentData {
  bucId: string;
  fullName: string;
}

export interface Session {
  id: string;
  type: 'Lecture' | 'Section';
  name: string; // e.g., "Software Engineering"
  group: string; // A, B, A1, A2...
  week: number; // 1-14
  startTime: number;
  isActive: boolean;
  latitude: number;
  longitude: number;
  radius: number; // meters
  createdBy: string;
}

export interface AttendanceRecord {
  sessionId: string;
  studentId: string; // BUC ID
  studentEmail: string;
  studentName: string;
  timestamp: number;
  status: 1 | 0; // 1 = Present, 0 = Absent (default)
  ipAddress?: string;
}

export enum WarningLevel {
  None = 0,
  First = 1, // > 3 absences
  Second = 2, // > 5 absences
  Final = 3  // > 7 absences
}