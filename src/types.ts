export interface Patient {
  id: string;
  tokenNumber: number;
  name: string;
  phone: string;
  age: number;
  gender: string;
  complaint: string;
  status: "WAITING" | "CALLING" | "CONSULTING" | "SKIPPED" | "COMPLETED";
  isEmergency: boolean;
  joinedAt: string;
  doctorId: string;
  estimatedWaitMinutes: number;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  cabin: string;
  avgConsultationMinutes: number;
  isAvailable: boolean;
  currentDelayMinutes: number;
}

export interface VisitHistory {
  id: string;
  patientName: string;
  age: number;
  gender: string;
  doctorName: string;
  specialization: string;
  waitDurationMinutes: number;
  consultationDurationMinutes: number;
  isEmergency: boolean;
  status: "COMPLETED" | "SKIPPED" | "LEFT";
  timestamp: string;
}
