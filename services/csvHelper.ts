import { AttendanceRecord, Session, StudentData } from '../types';

export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob(["\ufeff" + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateWeeklyReport = (week: number, sessions: Session[], attendance: AttendanceRecord[]) => {
  // Filter sessions for this week
  const weekSessions = sessions.filter(s => s.week === week);
  const sessionIds = weekSessions.map(s => s.id);
  const weekAttendance = attendance.filter(a => sessionIds.includes(a.sessionId));

  let csv = "Week,Session Name,Type,Group,Student Name,Student ID,Timestamp,Status\n";
  
  weekAttendance.forEach(record => {
    const session = weekSessions.find(s => s.id === record.sessionId);
    if (!session) return;
    
    csv += `${week},"${session.name}",${session.type},${session.group},"${record.studentName}",${record.studentId},"${new Date(record.timestamp).toLocaleString()}",Present\n`;
  });

  return csv;
};

export const generateMasterReport = (students: StudentData[], sessions: Session[], attendance: AttendanceRecord[]) => {
  // Header: ID, Name, W1_Lec, W1_Sec, W2_Lec, W2_Sec ... W14_Lec, W14_Sec, Total_Absent, Total_Present, Absence %, Warning
  let header = "Student ID,Student Name";
  for(let i=1; i<=14; i++) {
    header += `,Week ${i} Lecture,Week ${i} Section`;
  }
  header += ",Total Present,Total Absent,Absence %,Status Warning\n";

  let csv = header;

  students.forEach(student => {
    let row = `${student.bucId},"${student.fullName}"`;
    let totalPresent = 0;
    let totalAbsent = 0;
    
    // We iterate 14 weeks
    for (let w = 1; w <= 14; w++) {
      // Find lecture session for this week (Assuming matching group logic is handled during check-in, 
      // here we simplisticly look if they attended ANY lecture this week or specific group if we tracked it deeper.
      // For simplicity in this system: Did they attend the session they were supposed to?)
      
      // Get student's attendance records for this week
      const studentRecords = attendance.filter(a => a.studentId === student.bucId);
      
      // Check Lecture Attendance
      const attendedLecture = studentRecords.some(r => {
        const session = sessions.find(s => s.id === r.sessionId);
        return session && session.week === w && session.type === 'Lecture';
      });

      // Check Section Attendance
      const attendedSection = studentRecords.some(r => {
        const session = sessions.find(s => s.id === r.sessionId);
        return session && session.week === w && session.type === 'Section';
      });

      row += `,${attendedLecture ? '1' : '0'},${attendedSection ? '1' : '0'}`;

      if (attendedLecture) totalPresent++; else totalAbsent++;
      if (attendedSection) totalPresent++; else totalAbsent++;
    }

    const totalSessions = 28; // 14 weeks * 2
    const absencePercent = ((totalAbsent / totalSessions) * 100).toFixed(1);
    
    // Warning Logic
    let warning = "Good";
    if (totalAbsent >= 7) warning = "BANNED (7+)";
    else if (totalAbsent >= 5) warning = "2nd Warning (5+)";
    else if (totalAbsent >= 3) warning = "1st Warning (3+)";

    row += `,${totalPresent},${totalAbsent},${absencePercent}%,${warning}\n`;
    csv += row;
  });

  return csv;
};
