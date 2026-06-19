import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize Gemini API client on the server side
const geminiApiKey = process.env.GEMINI_API_KEY || "";
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// -------------------------------------------------------------
// IN-MEMORY COMPREHENSIVE DATA ENGINE & IN-BUILT DEMO SEEDING
// -------------------------------------------------------------
interface Patient {
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

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  cabin: string;
  avgConsultationMinutes: number;
  isAvailable: boolean;
  currentDelayMinutes: number;
}

interface VisitLog {
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

let doctors: Doctor[] = [
  { id: "doc_1", name: "Dr. Alok Sharma", specialization: "General Medicine", cabin: "Cabin 1", avgConsultationMinutes: 12, isAvailable: true, currentDelayMinutes: 0 },
  { id: "doc_2", name: "Dr. Ananya Patel", specialization: "Pediatrics", cabin: "Cabin 2", avgConsultationMinutes: 10, isAvailable: true, currentDelayMinutes: 0 },
  { id: "doc_3", name: "Dr. Vikram Iyer", specialization: "Cardiology", cabin: "Cabin 3", avgConsultationMinutes: 18, isAvailable: true, currentDelayMinutes: 15 },
  { id: "doc_4", name: "Dr. Deepa Reddy", specialization: "Orthopedics", cabin: "Cabin 4", avgConsultationMinutes: 15, isAvailable: true, currentDelayMinutes: 0 },
];

let patients: Patient[] = [
  // Dr. Sharma's Active Queue (cabin 1)
  { id: "pat_1", tokenNumber: 101, name: "Ramesh Kumar", phone: "+91 98765 43210", age: 45, gender: "Male", complaint: "High fever and persistent body aches", status: "CONSULTING", isEmergency: false, joinedAt: new Date(Date.now() - 3600000).toISOString(), doctorId: "doc_1", estimatedWaitMinutes: 0 },
  { id: "pat_2", tokenNumber: 102, name: "Sunita Deshmukh", phone: "+91 91234 56789", age: 38, gender: "Female", complaint: "Sudden high blood pressure and headache", status: "WAITING", isEmergency: false, joinedAt: new Date(Date.now() - 2500000).toISOString(), doctorId: "doc_1", estimatedWaitMinutes: 12 },
  { id: "pat_3", tokenNumber: 103, name: "Aarav Sharma", phone: "+91 94456 78123", age: 62, gender: "Male", complaint: "Chest discomfort & cough", status: "WAITING", isEmergency: false, joinedAt: new Date(Date.now() - 1200000).toISOString(), doctorId: "doc_1", estimatedWaitMinutes: 24 },
  { id: "skp_1", tokenNumber: 99, name: "Vijay Patil", phone: "+91 90123 45678", age: 29, gender: "Male", complaint: "Food poisoning symptoms", status: "SKIPPED", isEmergency: false, joinedAt: new Date(Date.now() - 4800000).toISOString(), doctorId: "doc_1", estimatedWaitMinutes: 0 },

  // Dr. Patel's Queue (cabin 2)
  { id: "pat_4", tokenNumber: 201, name: "Baby Ishaan (Parent: Amit)", phone: "+91 98901 23456", age: 4, gender: "Male", complaint: "Whooping cough and high fever", status: "WAITING", isEmergency: false, joinedAt: new Date(Date.now() - 1800000).toISOString(), doctorId: "doc_2", estimatedWaitMinutes: 10 },
  { id: "pat_5", tokenNumber: 202, name: "Prisha Joshi", phone: "+91 97712 34567", age: 7, gender: "Female", complaint: "Mild throat infection & checkup", status: "WAITING", isEmergency: false, joinedAt: new Date(Date.now() - 500000).toISOString(), doctorId: "doc_2", estimatedWaitMinutes: 20 },

  // Dr. Iyer's Queue (cabin 3)
  { id: "pat_6", tokenNumber: 301, name: "Gopal Krishna Rao", phone: "+91 96634 56789", age: 71, gender: "Male", complaint: "Arrythmia and chest pain feedback", status: "CONSULTING", isEmergency: false, joinedAt: new Date(Date.now() - 3000000).toISOString(), doctorId: "doc_3", estimatedWaitMinutes: 0 },
];

let visitHistory: VisitLog[] = [
  { id: "h_1", patientName: "Rahul Sharma", age: 34, gender: "Male", doctorName: "Dr. Alok Sharma", specialization: "General Medicine", waitDurationMinutes: 22, consultationDurationMinutes: 11, isEmergency: false, status: "COMPLETED", timestamp: new Date(Date.now() - 4 * 3600000).toISOString() },
  { id: "h_2", patientName: "Meera Nair", age: 28, gender: "Female", doctorName: "Dr. Ananya Patel", specialization: "Pediatrics", waitDurationMinutes: 14, consultationDurationMinutes: 9, isEmergency: false, status: "COMPLETED", timestamp: new Date(Date.now() - 3.5 * 3600000).toISOString() },
  { id: "h_3", patientName: "Anil Kulkarni", age: 55, gender: "Male", doctorName: "Dr. Alok Sharma", specialization: "General Medicine", waitDurationMinutes: 3, consultationDurationMinutes: 14, isEmergency: true, status: "COMPLETED", timestamp: new Date(Date.now() - 3 * 3600000).toISOString() },
  { id: "h_4", patientName: "Sneha Gupte", age: 42, gender: "Female", doctorName: "Dr. Vikram Iyer", specialization: "Cardiology", waitDurationMinutes: 45, consultationDurationMinutes: 20, isEmergency: false, status: "COMPLETED", timestamp: new Date(Date.now() - 2.5 * 3600000).toISOString() },
  { id: "h_5", patientName: "Devendra Singh", age: 50, gender: "Male", doctorName: "Dr. Deepa Reddy", specialization: "Orthopedics", waitDurationMinutes: 30, consultationDurationMinutes: 12, isEmergency: false, status: "COMPLETED", timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: "h_6", patientName: "Karan Johar", age: 60, gender: "Male", doctorName: "Dr. Deepa Reddy", specialization: "Orthopedics", waitDurationMinutes: 18, consultationDurationMinutes: 15, isEmergency: false, status: "COMPLETED", timestamp: new Date(Date.now() - 1 * 3600000).toISOString() }
];

// Helper to calculate estimated wait times dynamically
function recalculateWaitTimes(doctorId: string) {
  const doctor = doctors.find(d => d.id === doctorId);
  if (!doctor) return;

  const doctorPatients = patients.filter(p => p.doctorId === doctorId);
  const activeConsulting = doctorPatients.find(p => p.status === "CONSULTING");
  const waitingPatients = doctorPatients
    .filter(p => p.status === "WAITING" || p.status === "CALLING")
    .sort((a, b) => {
      // Emergency priority first
      if (a.isEmergency !== b.isEmergency) {
        return a.isEmergency ? -1 : 1;
      }
      return a.tokenNumber - b.tokenNumber;
    });

  let accumTime = 0;
  // If there is currently a patient consulting, they have some remaining time
  if (activeConsulting) {
    accumTime += Math.max(2, Math.floor(doctor.avgConsultationMinutes / 2));
  }

  waitingPatients.forEach((patient) => {
    // Each waiting patient's estimated wait is the accumulation before them
    patient.estimatedWaitMinutes = accumTime + doctor.currentDelayMinutes;
    accumTime += doctor.avgConsultationMinutes;
  });
}

function recalculateAllWaitTimes() {
  doctors.forEach(doc => recalculateWaitTimes(doc.id));
}

// Recalculate initially
recalculateAllWaitTimes();

// -------------------------------------------------------------
// SERVER SENT EVENTS (SSE) BROADCAST HUB
// -------------------------------------------------------------
let sseClients: any[] = [];

function notifySSEClients(event: string, data: any) {
  sseClients.forEach((client) => {
    client.res.write(`event: ${event}\n`);
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

// -------------------------------------------------------------
// CORE ROUTING & API ENDPOINTS
// -------------------------------------------------------------

// Active State API
app.get("/api/state", (req, res) => {
  res.json({
    doctors,
    patients,
    visitHistory
  });
});

// Join Queue / Create Patient Check-in
app.post("/api/queue/join", (req, res) => {
  try {
    const { name, phone, age, gender, complaint, doctorId, isEmergency } = req.body;

    if (!name || !doctorId) {
      return res.status(400).json({ error: "Patient Name and Doctor are required fields" });
    }

    const doctor = doctors.find(d => d.id === doctorId);
    if (!doctor) {
      return res.status(400).json({ error: "Invalid doctor selected" });
    }

    // Generate Token Number based on Doctor's block (e.g. 100+, 200+)
    const docIndex = doctors.findIndex(d => d.id === doctorId) + 1;
    const sameDocPatients = patients.filter(p => p.doctorId === doctorId);
    let nextToken = docIndex * 100 + 1;
    if (sameDocPatients.length > 0) {
      const maxToken = Math.max(...sameDocPatients.map(p => p.tokenNumber));
      nextToken = maxToken + 1;
    }

    const newPatient: Patient = {
      id: `pat_${Date.now()}`,
      tokenNumber: nextToken,
      name,
      phone: phone || "+91 99999 99999",
      age: Number(age) || 30,
      gender: gender || "Male",
      complaint: complaint || "General checkup",
      status: "WAITING",
      isEmergency: !!isEmergency,
      joinedAt: new Date().toISOString(),
      doctorId,
      estimatedWaitMinutes: 0
    };

    patients.push(newPatient);
    recalculateWaitTimes(doctorId);

    // Trigger SSE real-time broadcast
    notifySSEClients("stateUpdated", { doctors, patients });
    notifySSEClients("patientAdded", { patient: newPatient, doctorName: doctor.name });

    res.status(201).json(newPatient);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Doctor Calls Next Patient
app.post("/api/queue/next", (req, res) => {
  try {
    const { doctorId } = req.body;
    const doctor = doctors.find(d => d.id === doctorId);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    // Active Patients for Doctor
    const doctorPatients = patients.filter(p => p.doctorId === doctorId);
    
    // Complete existing active patient consulting if any
    const activeConsulting = doctorPatients.find(p => p.status === "CONSULTING");
    if (activeConsulting) {
      activeConsulting.status = "COMPLETED";
      // Log visit log to history
      const duration = Math.floor(Math.random() * 8) + 8; // Random 8-15 mins
      visitHistory.push({
        id: `h_${Date.now()}`,
        patientName: activeConsulting.name,
        age: activeConsulting.age,
        gender: activeConsulting.gender,
        doctorName: doctor.name,
        specialization: doctor.specialization,
        waitDurationMinutes: Math.floor((Date.now() - new Date(activeConsulting.joinedAt).getTime()) / 60000),
        consultationDurationMinutes: duration,
        isEmergency: activeConsulting.isEmergency,
        status: "COMPLETED",
        timestamp: new Date().toISOString()
      });
      // Remove or keep as completed in temporary array
      patients = patients.filter(p => p.id !== activeConsulting.id);
    }

    // Prioritize calling next patient: Emergency first, then ascending Token numbers
    const remainWaiting = patients
      .filter(p => p.doctorId === doctorId && (p.status === "WAITING" || p.status === "CALLING" || p.status === "SKIPPED"))
      .sort((a, b) => {
        if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
        return a.tokenNumber - b.tokenNumber;
      });

    let nextPatient = remainWaiting[0];
    if (nextPatient) {
      nextPatient.status = "CONSULTING";
      
      // Trigger voice announcement event
      notifySSEClients("tokenCalled", {
        tokenNumber: nextPatient.tokenNumber,
        patientName: nextPatient.name,
        doctorName: doctor.name,
        cabin: doctor.cabin
      });
    }

    recalculateWaitTimes(doctorId);
    notifySSEClients("stateUpdated", { doctors, patients, visitHistory });

    res.json({ success: true, nextPatient });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Skip/Miss Patient (puts them in "SKIPPED" holding tab)
app.post("/api/queue/skip", (req, res) => {
  const { patientId } = req.body;
  const patient = patients.find(p => p.id === patientId);
  if (!patient) return res.status(404).json({ error: "Patient not found in queue" });

  patient.status = "SKIPPED";
  recalculateWaitTimes(patient.doctorId);

  notifySSEClients("stateUpdated", { doctors, patients });
  notifySSEClients("patientSkipped", { patient });

  res.json({ success: true, patient });
});

// Recall Patient / Manual alert
app.post("/api/queue/recall", (req, res) => {
  const { patientId } = req.body;
  const patient = patients.find(p => p.id === patientId);
  if (!patient) return res.status(404).json({ error: "Patient not found" });

  const doctor = doctors.find(d => d.id === patient.doctorId);
  
  notifySSEClients("tokenCalled", {
    tokenNumber: patient.tokenNumber,
    patientName: patient.name,
    doctorName: doctor ? doctor.name : "the doctor",
    cabin: doctor ? doctor.cabin : "Cabin"
  });

  res.json({ success: true });
});

// Emergency Priority Insert
app.post("/api/queue/emergency", (req, res) => {
  const { patientId } = req.body;
  const patient = patients.find(p => p.id === patientId);
  if (!patient) return res.status(404).json({ error: "Patient not found" });

  patient.isEmergency = true;
  recalculateWaitTimes(patient.doctorId);

  notifySSEClients("stateUpdated", { doctors, patients });
  notifySSEClients("emergencyInserted", { patient });

  res.json({ success: true, patient });
});

// Recover/Restore Missed Patient (re-ranks them with priority)
app.post("/api/queue/recover", (req, res) => {
  const { patientId } = req.body;
  const patient = patients.find(p => p.id === patientId);
  if (!patient) return res.status(404).json({ error: "Patient not found" });

  // Reset status to WAITING and insert near top
  patient.status = "WAITING";
  // Add an emergency-like minor ranking bump or place at correct active waiting index
  recalculateWaitTimes(patient.doctorId);

  notifySSEClients("stateUpdated", { doctors, patients });
  notifySSEClients("patientAdded", { patient, doctorName: "Sharma" });

  res.json({ success: true, patient });
});

// Doctor Availability or Delay update
app.post("/api/doctor/config", (req, res) => {
  const { doctorId, isAvailable, currentDelayMinutes } = req.body;
  const doctor = doctors.find(d => d.id === doctorId);
  if (!doctor) return res.status(404).json({ error: "Doctor not found" });

  if (typeof isAvailable !== "undefined") doctor.isAvailable = isAvailable;
  if (typeof currentDelayMinutes !== "undefined") doctor.currentDelayMinutes = Number(currentDelayMinutes);

  recalculateWaitTimes(doctorId);

  notifySSEClients("stateUpdated", { doctors, patients });
  notifySSEClients("doctorDelayed", { doctor, delay: doctor.currentDelayMinutes });

  res.json({ success: true, doctor });
});

// Delete patient check-in
app.delete("/api/queue/remove/:id", (req, res) => {
  const patientId = req.params.id;
  const patient = patients.find(p => p.id === patientId);
  if (!patient) return res.status(404).json({ error: "Patient not found" });

  patients = patients.filter(p => p.id !== patientId);
  recalculateWaitTimes(patient.doctorId);

  notifySSEClients("stateUpdated", { doctors, patients });
  res.json({ success: true });
});

// -------------------------------------------------------------
// REAL-TIME SYSTEM EVENTS SSE ENDPOINT
// -------------------------------------------------------------
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  // Send initial load sync data
  res.write(`event: welcome\n`);
  res.write(`data: ${JSON.stringify({ clientId, message: "Connected to QueueCure Realtime Engine" })}\n\n`);

  req.on("close", () => {
    sseClients = sseClients.filter(client => client.id !== clientId);
  });
});

// -------------------------------------------------------------
// DYNAMIC AI ANALYTICS & REASONING ASSISTANT (GEMINI API)
// -------------------------------------------------------------
app.post("/api/ai/assistant", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Prompt message is required" });
    }

    if (!ai) {
      return res.status(200).json({
        text: "**AI Operational Intelligence is currently running in offline simulation mode.**\n\nTo assist your clinic audit instantly, here is the simulated answer:\n\n* **Current Bottleneck:** Dr. Vikram Iyer (Cardiology) is experiencing a 15-minute operational delay because patient consultations are extending to 18 minutes on average today.\n* **Doctor Load:** Dr. Alok Sharma is currently treating रमेश कुमार (Ramesh Kumar - Token 101) with 2 more active patients in the queue waiting.\n* **Recommendations:** Active queue load balancing is recommended. Consider routing minor flu cases to General Medicine or utilizing pediatrician idle states to manage patient influx flows."
      });
    }

    // Prepare contextual parameters about the live database to inject into system prompt
    const context = `
You are the built-in Operations intelligence neural core of QueueCure AI, a professional smart clinic queue SaaS deployed in India.
Here is the active telemetry of the Indian clinic right now:

Active Doctors:
${JSON.stringify(doctors, null, 2)}

Active Patients Queue:
${JSON.stringify(patients, null, 2)}

Completed Visit History Metrics:
${JSON.stringify(visitHistory, null, 2)}

User asks: "${message}"

Formulate a concise, operational, professional, and friendly response with clear actionable medical insights, bottleneck identification, and operational predictions. Address terms like "average wait", "peak hours", "which doctor has highest delay", or any administrative question with actual statistics matching the telemetry above. Avoid generic responses. Use bullet points and appropriate text formatting.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: context,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// SERVICE BOOTSTRAPING WITH INTEGRATED VITE SERVING
// -------------------------------------------------------------
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite development middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving build artifact index.html in production...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`QueueCure AI Backend Server fully booted on http://0.0.0.0:${PORT}`);
  });
}

bootstrap();
