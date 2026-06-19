import { useState, useEffect, useRef } from "react";
import {
  Users,
  UserCheck,
  Clock,
  Volume2,
  VolumeX,
  AlertOctagon,
  Undo2,
  Plus,
  Search,
  CheckCircle,
  HelpCircle,
  Shield,
  Smartphone,
  Sparkles,
  BarChart3,
  ListOrdered,
  PlusCircle,
  TrendingUp,
  Sliders,
  Send,
  RefreshCw,
  QrCode,
  UserPlus,
  Check,
  Stethoscope,
  Info
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";
import { Patient, Doctor, VisitHistory } from "./types";

export default function App() {
  // -------------------------------------------------------------
  // APP VIEW PORTAL COORDINATION
  // -------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<"receptionist" | "doctor" | "patient" | "analytics">("receptionist");

  // Telemetry Lists
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [visitHistory, setVisitHistory] = useState<VisitHistory[]>([]);
  
  // App UI State variables
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("doc_1"); // for Doctor dashboard simulation
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null); // for Patient Hub selection
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [announcementVoice, setAnnouncementVoice] = useState<'hi-IN' | 'en-IN'>('en-IN');
  const [showQRModal, setShowQRModal] = useState<string | null>(null); // holds doctor ID to show QR for
  
  // Realtime Connection State
  const [isRealtime, setIsRealtime] = useState(false);
  const [serverLogs, setServerLogs] = useState<string[]>(["Initialising QueueCure AI client..."]);

  // Form State for receptionist checked-in
  const [newPatientForm, setNewPatientForm] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "Male",
    complaint: "",
    doctorId: "doc_1",
    isEmergency: false
  });

  // Patient Mobile App States inside Android simulator
  const [mobileDoctorId, setMobileDoctorId] = useState("doc_1");
  const [mobilePatientName, setMobilePatientName] = useState("");
  const [mobilePatientPhone, setMobilePatientPhone] = useState("");
  const [mobilePatientAge, setMobilePatientAge] = useState("");
  const [mobilePatientGender, setMobilePatientGender] = useState("Male");
  const [mobilePatientComplaint, setMobilePatientComplaint] = useState("");
  const [mobileCurrentPatientId, setMobileCurrentPatientId] = useState<string | null>(null);
  const [mobileCheckinStep, setMobileCheckinStep] = useState<"scan" | "form" | "tracking">("scan");
  
  // AI assistant states
  const [assistantMessages, setAssistantMessages] = useState<Array<{ role: 'user' | 'assistant' | 'system', text: string }>>([
    { role: 'assistant', text: "Hello! I am your QueueCure AI Operations Intelligent Auditor. Ask me anything about clinic status, doctor load, wait times, or bottleneck advice." }
  ]);
  const [assistantInput, setAssistantInput] = useState("");
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);

  // Patient App Nurse AI states
  const [patientAiMessages, setPatientAiMessages] = useState<Array<{ sender: 'ai' | 'user', text: string }>>([
    { sender: 'ai', text: "Namaste! I'm Shreya, your Virtual Clinic Guide. You can ask me: 'Can I go drink tea?', 'How many people ahead of me?', or 'Is Dr. Sharma fast today?'" }
  ]);
  const [patientAiInput, setPatientAiInput] = useState("");
  const [isPatientAiTyping, setIsPatientAiTyping] = useState(false);

  // Active called token notification card
  const [calledTokenNotification, setCalledTokenNotification] = useState<{
    tokenNumber: number;
    patientName: string;
    doctorName: string;
    cabin: string;
  } | null>(null);

  // Ref to play announcements and keep current SSE state
  const lastStateHash = useRef("");

  // -------------------------------------------------------------
  // REAL-TIME SYNCHRONISATION STREAM (Server-Sent Events)
  // -------------------------------------------------------------
  useEffect(() => {
    // Fetch initial static state
    fetchState();

    // Listen to real-time events via Server Sent Events relative to Port 3000
    const eventSource = new EventSource("/api/events");

    eventSource.onopen = () => {
      setIsRealtime(true);
      addServerLog("Secure SSE tunnel successfully open on PORT 3000.");
    };

    eventSource.onerror = () => {
      setIsRealtime(false);
      addServerLog("SSE Server offline or starting up. Reverting to smart safe offline state simulation.");
    };

    eventSource.addEventListener("welcome", (e: any) => {
      const data = JSON.parse(e.data);
      addServerLog(`Welcome event: ${data.message}`);
    });

    eventSource.addEventListener("stateUpdated", (e: any) => {
      try {
        const data = JSON.parse(e.data);
        if (data.doctors) setDoctors(data.doctors);
        if (data.patients) setPatients(data.patients);
        if (data.visitHistory) setVisitHistory(data.visitHistory);
        addServerLog("Synchronised state updated dynamically.");
      } catch (err) {
        console.error("Failed to parse SSE stateSync data:", err);
      }
    });

    eventSource.addEventListener("patientAdded", (e: any) => {
      try {
        const data = JSON.parse(e.data);
        showToast(`Checked In: ${data.patient.name} (Token #${data.patient.tokenNumber}) for ${data.doctorName}`);
      } catch (err) {}
    });

    eventSource.addEventListener("tokenCalled", (e: any) => {
      try {
        const data = JSON.parse(e.data);
        triggerVoiceCall(data);
        setCalledTokenNotification(data);
        setTimeout(() => setCalledTokenNotification(null), 10000);
      } catch (err) {}
    });

    eventSource.addEventListener("patientSkipped", (e: any) => {
      try {
        const data = JSON.parse(e.data);
        showToast(`Patient Skipped: ${data.patient.name} is moved to Skip holding.`);
      } catch (err) {}
    });

    eventSource.addEventListener("doctorDelayed", (e: any) => {
      try {
        const data = JSON.parse(e.data);
        showToast(`${data.doctor.name} added a ${data.delay} mins consultation delay alert.`);
      } catch (err) {}
    });

    eventSource.addEventListener("emergencyInserted", (e: any) => {
      try {
        const data = JSON.parse(e.data);
        showToast(`CRITICAL: Emergency state flagged for ${data.patient.name}. Elevated to Priority #1.`);
      } catch (err) {}
    });

    return () => {
      eventSource.close();
    };
  }, []);

  const addServerLog = (log: string) => {
    setServerLogs(prev => [log, ...prev.slice(0, 15)]);
  };

  const showToast = (message: string) => {
    // Simply print to logs, could show on screen banner
    addServerLog(`[ALERT] ${message}`);
  };

  // Fetch state fallback / initial load
  const fetchState = async () => {
    try {
      const res = await fetch("/api/state");
      const data = await res.json();
      if (data.doctors) setDoctors(data.doctors);
      if (data.patients) setPatients(data.patients);
      if (data.visitHistory) setVisitHistory(data.visitHistory);
    } catch (err) {
      // Offline fallback state seeding for 100% stable interactive experience
      setDoctors([
        { id: "doc_1", name: "Dr. Alok Sharma", specialization: "General Medicine", cabin: "Cabin 1", avgConsultationMinutes: 12, isAvailable: true, currentDelayMinutes: 0 },
        { id: "doc_2", name: "Dr. Ananya Patel", specialization: "Pediatrics", cabin: "Cabin 2", avgConsultationMinutes: 10, isAvailable: true, currentDelayMinutes: 0 },
        { id: "doc_3", name: "Dr. Vikram Iyer", specialization: "Cardiology", cabin: "Cabin 3", avgConsultationMinutes: 18, isAvailable: true, currentDelayMinutes: 15 },
        { id: "doc_4", name: "Dr. Deepa Reddy", specialization: "Orthopedics", cabin: "Cabin 4", avgConsultationMinutes: 15, isAvailable: true, currentDelayMinutes: 0 },
      ]);
      setPatients([
        { id: "pat_1", tokenNumber: 101, name: "Ramesh Kumar", phone: "+91 98765 43210", age: 45, gender: "Male", complaint: "High fever and persistent body aches", status: "CONSULTING", isEmergency: false, joinedAt: new Date(Date.now() - 3600000).toISOString(), doctorId: "doc_1", estimatedWaitMinutes: 0 },
        { id: "pat_2", tokenNumber: 102, name: "Sunita Deshmukh", phone: "+91 91234 56789", age: 38, gender: "Female", complaint: "Sudden high blood pressure and headache", status: "WAITING", isEmergency: false, joinedAt: new Date(Date.now() - 2500000).toISOString(), doctorId: "doc_1", estimatedWaitMinutes: 12 },
        { id: "pat_3", tokenNumber: 103, name: "Aarav Sharma", phone: "+91 94456 78123", age: 62, gender: "Male", complaint: "Chest discomfort & cough", status: "WAITING", isEmergency: false, joinedAt: new Date(Date.now() - 1200000).toISOString(), doctorId: "doc_1", estimatedWaitMinutes: 24 },
        { id: "skp_1", tokenNumber: 99, name: "Vijay Patil", phone: "+91 90123 45678", age: 29, gender: "Male", complaint: "Food poisoning symptoms", status: "SKIPPED", isEmergency: false, joinedAt: new Date(Date.now() - 4800000).toISOString(), doctorId: "doc_1", estimatedWaitMinutes: 0 },
        { id: "pat_4", tokenNumber: 201, name: "Baby Ishaan (Parent: Amit)", phone: "+91 98901 23456", age: 4, gender: "Male", complaint: "Whooping cough and high fever", status: "WAITING", isEmergency: false, joinedAt: new Date(Date.now() - 1800000).toISOString(), doctorId: "doc_2", estimatedWaitMinutes: 10 },
        { id: "pat_5", tokenNumber: 202, name: "Prisha Joshi", phone: "+91 97712 34567", age: 7, gender: "Female", complaint: "Mild throat infection", status: "WAITING", isEmergency: false, joinedAt: new Date(Date.now() - 500000).toISOString(), doctorId: "doc_2", estimatedWaitMinutes: 20 },
        { id: "pat_6", tokenNumber: 301, name: "Gopal Krishna Rao", phone: "+91 96634 56789", age: 71, gender: "Male", complaint: "Arrythmia and chest pain", status: "CONSULTING", isEmergency: false, joinedAt: new Date(Date.now() - 3000000).toISOString(), doctorId: "doc_3", estimatedWaitMinutes: 0 },
      ]);
      setVisitHistory([
        { id: "h_1", patientName: "Rahul Sharma", age: 34, gender: "Male", doctorName: "Dr. Alok Sharma", specialization: "General Medicine", waitDurationMinutes: 22, consultationDurationMinutes: 11, isEmergency: false, status: "COMPLETED", timestamp: new Date(Date.now() - 4 * 3600000).toISOString() },
        { id: "h_2", patientName: "Meera Nair", age: 28, gender: "Female", doctorName: "Dr. Ananya Patel", specialization: "Pediatrics", waitDurationMinutes: 14, consultationDurationMinutes: 9, isEmergency: false, status: "COMPLETED", timestamp: new Date(Date.now() - 3.5 * 3600000).toISOString() },
        { id: "h_3", patientName: "Anil Kulkarni", age: 55, gender: "Male", doctorName: "Dr. Alok Sharma", specialization: "General Medicine", waitDurationMinutes: 3, consultationDurationMinutes: 14, isEmergency: true, status: "COMPLETED", timestamp: new Date(Date.now() - 3 * 3600000).toISOString() },
        { id: "h_4", patientName: "Sneha Gupte", age: 42, gender: "Female", doctorName: "Dr. Vikram Iyer", specialization: "Cardiology", waitDurationMinutes: 45, consultationDurationMinutes: 20, isEmergency: false, status: "COMPLETED", timestamp: new Date(Date.now() - 2.5 * 3600000).toISOString() },
        { id: "h_5", patientName: "Devendra Singh", age: 50, gender: "Male", doctorName: "Dr. Deepa Reddy", specialization: "Orthopedics", waitDurationMinutes: 30, consultationDurationMinutes: 12, isEmergency: false, status: "COMPLETED", timestamp: new Date(Date.now() - 2 * 3600000).toISOString() }
      ]);
    }
  };

  // -------------------------------------------------------------
  // MULTI-LINGUAL VOICE SYNTHESIS INTELLIGENCE
  // -------------------------------------------------------------
  const triggerVoiceCall = (data: { tokenNumber: number; patientName: string; doctorName: string; cabin: string }) => {
    if (!isVoiceEnabled) return;

    try {
      const speech = new SpeechSynthesisUtterance();
      speech.rate = 0.85;
      speech.pitch = 1.0;

      if (announcementVoice === 'hi-IN') {
        speech.lang = 'hi-IN';
        speech.text = `ध्यान दें! टोकन नंबर ${data.tokenNumber}, मरीज ${data.patientName}, कृपया ${data.doctorName} से मिलने के लिए ${data.cabin} में पधारें।`;
      } else {
        speech.lang = 'en-IN';
        speech.text = `Attention please! Token number ${data.tokenNumber}, patient ${data.patientName}, please proceed to ${data.cabin} - to see ${data.doctorName}. Thank you.`;
      }

      window.speechSynthesis.speak(speech);
      addServerLog(`[VOICE ANNOUNCEMENT STARTED] ${speech.text}`);
    } catch (e) {
      console.warn("Speech synthesis error or blocked by frame permission.", e);
    }
  };

  // Speaks on-screen test call
  const triggerSelfTestCall = () => {
    triggerVoiceCall({
      tokenNumber: 105,
      patientName: "Aaradhya Deshmukh",
      doctorName: "Dr. Alok Sharma",
      cabin: "Cabin 1"
    });
  };

  // -------------------------------------------------------------
  // FRONTEND ACTION CONTROLLERS - REALTIME APIS WITH LOCAL BACKUPS
  // -------------------------------------------------------------
  const handleCheckin = async (e: any) => {
    e.preventDefault();
    if (!newPatientForm.name || !newPatientForm.doctorId) return;

    try {
      const res = await fetch("/api/queue/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPatientForm)
      });
      if (res.ok) {
        // clear form
        setNewPatientForm({
          name: "",
          phone: "",
          age: "",
          gender: "Male",
          complaint: "",
          doctorId: "doc_1",
          isEmergency: false
        });
        fetchState();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to join queue");
      }
    } catch (err) {
      // Fallback offline execution
      const newToken = 100 + patients.length + 1;
      const offlinePat: Patient = {
        id: `offline_${Date.now()}`,
        tokenNumber: newToken,
        name: newPatientForm.name,
        phone: newPatientForm.phone || "+91 99000 11000",
        age: Number(newPatientForm.age) || 30,
        gender: newPatientForm.gender,
        complaint: newPatientForm.complaint || "Routine consultation requested",
        status: "WAITING",
        isEmergency: newPatientForm.isEmergency,
        joinedAt: new Date().toISOString(),
        doctorId: newPatientForm.doctorId,
        estimatedWaitMinutes: 15
      };

      setPatients(prev => {
        const next = [...prev, offlinePat];
        return next;
      });
      setNewPatientForm({
        name: "",
        phone: "",
        age: "",
        gender: "Male",
        complaint: "",
        doctorId: "doc_1",
        isEmergency: false
      });
      showToast(`[OFFLINE MODE] Checked in ${offlinePat.name} (Token #${offlinePat.tokenNumber})`);
    }
  };

  // Doctor Action controllers
  const callNextPatient = async (docId: string) => {
    try {
      const res = await fetch("/api/queue/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: docId })
      });
      if (res.ok) {
        fetchState();
      }
    } catch (err) {
      // offline fallback action
      const docPatients = patients.filter(p => p.doctorId === docId);
      const consulting = docPatients.find(p => p.status === "CONSULTING");
      let nextList = prevPatientsState => {
        let updated = prevPatientsState.filter(p => p.id !== (consulting?.id || ""));
        const nextWaiting = updated
          .filter(p => p.doctorId === docId && (p.status === "WAITING" || p.status === "SKIPPED"))
          .sort((a,b) => (a.isEmergency ? -1 : 1) - (b.isEmergency ? -1 : 1))[0];
        if (nextWaiting) {
          nextWaiting.status = "CONSULTING";
          // trigger voice call offline
          const docObj = doctors.find(d => d.id === docId);
          triggerVoiceCall({
            tokenNumber: nextWaiting.tokenNumber,
            patientName: nextWaiting.name,
            doctorName: docObj ? docObj.name : "Sharma",
            cabin: docObj ? docObj.cabin : "Cabin 1"
          });
        }
        return updated.map(p => p.id === nextWaiting?.id ? nextWaiting : p);
      };
      setPatients(nextList);
      showToast(`[OFFLINE MODE] Next patient called for doctor.`);
    }
  };

  const skipPatient = async (patientId: string) => {
    try {
      const res = await fetch("/api/queue/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId })
      });
      if (res.ok) fetchState();
    } catch (err) {
      setPatients(prev => prev.map(p => p.id === patientId ? { ...p, status: "SKIPPED" } : p));
    }
  };

  const triggerEmergencyLevel = async (patientId: string) => {
    try {
      const res = await fetch("/api/queue/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId })
      });
      if (res.ok) fetchState();
    } catch (err) {
      setPatients(prev => prev.map(p => p.id === patientId ? { ...p, isEmergency: true } : p));
    }
  };

  const recoverPatient = async (patientId: string) => {
    try {
      const res = await fetch("/api/queue/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId })
      });
      if (res.ok) fetchState();
    } catch (err) {
      setPatients(prev => prev.map(p => p.id === patientId ? { ...p, status: "WAITING" } : p));
    }
  };

  const removePatient = async (id: string) => {
    try {
      const res = await fetch(`/api/queue/remove/${id}`, { method: "DELETE" });
      if (res.ok) fetchState();
    } catch (err) {
      setPatients(prev => prev.filter(p => p.id !== id));
    }
  };

  const updateDoctorDelay = async (docId: string, delayMins: number) => {
    try {
      const res = await fetch("/api/doctor/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: docId, currentDelayMinutes: delayMins })
      });
      if (res.ok) fetchState();
    } catch (err) {
      setDoctors(prev => prev.map(d => d.id === docId ? { ...d, currentDelayMinutes: delayMins } : d));
    }
  };

  const toggleDoctorStatus = async (docId: string, available: boolean) => {
    try {
      const res = await fetch("/api/doctor/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: docId, isAvailable: available })
      });
      if (res.ok) fetchState();
    } catch (err) {
      setDoctors(prev => prev.map(d => d.id === docId ? { ...d, isAvailable: available } : d));
    }
  };

  // -------------------------------------------------------------
  // AI OPERATIONS AUDITOR INTERROGATION (GEMINI CONNECTOR)
  // -------------------------------------------------------------
  const askAIAssistant = async () => {
    if (!assistantInput.trim()) return;
    const userQuery = assistantInput;
    setAssistantInput("");
    setAssistantMessages(prev => [...prev, { role: 'user', text: userQuery }]);
    setIsAssistantTyping(true);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userQuery })
      });
      const data = await res.json();
      setAssistantMessages(prev => [...prev, { role: 'assistant', text: data.text }]);
    } catch (err) {
      setAssistantMessages(prev => [...prev, {
        role: 'assistant',
        text: "Could not execute model query due to offline state. Recommended suggestion: Shift medical triage priorities immediately."
      }]);
    } finally {
      setIsAssistantTyping(false);
    }
  };

  // -------------------------------------------------------------
  // PATIENT APP VIRTUAL NURSE INTERACTIVE BOT
  // -------------------------------------------------------------
  const askPatientNurse = () => {
    if (!patientAiInput.trim()) return;
    const patientMsg = patientAiInput;
    setPatientAiInput("");
    setPatientAiMessages(prev => [...prev, { sender: 'user', text: patientMsg }]);
    setIsPatientAiTyping(true);

    setTimeout(() => {
      let aiResponseText = "Yes, you can go ahead. You have plenty of time left before your token turns up!";
      const qText = patientMsg.toLowerCase();

      if (qText.includes("tea") || qText.includes("coffee") || qText.includes("exit") || qText.includes("drink")) {
        aiResponseText = "According to our WMA estimate, your wait time is approximately 25 minutes. You can easily step out for 10 minutes to enjoy hot cutting tea or snacks nearby, Shreya will SMS ping you the moment you are third in line!";
      } else if (qText.includes("ahead") || qText.includes("how many") || qText.includes("queue")) {
        aiResponseText = "There are currently 2 patients checked in ahead of you for Dr. Sharma. Your forecasted turn begins in about 12-14 minutes.";
      } else if (qText.includes("fast") || qText.includes("delay")) {
        aiResponseText = "Dr. Sharma is seeing patients exactly at 11 minutes per consultation today, which is 8% faster than his usual history speed. There is absolutely zero backlog delay.";
      } else {
        aiResponseText = "I have queued your medical preference! There is a minor rush but the wait times are predicted to decline. I will send a WhatsApp ping to your mobile phone 5 minutes prior to doctor's call.";
      }

      setPatientAiMessages(prev => [...prev, { sender: 'ai', text: aiResponseText }]);
      setIsPatientAiTyping(false);
    }, 1200);
  };

  // -------------------------------------------------------------
  // CUSTOM MOBILE PWA CHECKIN ON ANDROID FRAMING SIMULATION
  // -------------------------------------------------------------
  const handleMobileCheckinSubmit = (e: any) => {
    e.preventDefault();
    if (!mobilePatientName) return;

    // Simulate onboarding a patient from mobile app
    const generatedToken = 401; // Ortho range
    const simulatedPat: Patient = {
      id: `mob_${Date.now()}`,
      tokenNumber: generatedToken,
      name: mobilePatientName,
      phone: mobilePatientPhone || "+91 91111 22222",
      age: Number(mobilePatientAge) || 28,
      gender: mobilePatientGender,
      complaint: mobilePatientComplaint || "Severe joint pain / walkin scan check",
      status: "WAITING",
      isEmergency: false,
      joinedAt: new Date().toISOString(),
      doctorId: mobileDoctorId,
      estimatedWaitMinutes: 20
    };

    setPatients(prev => [...prev, simulatedPat]);
    setMobileCurrentPatientId(simulatedPat.id);
    setMobileCheckinStep("tracking");
    showToast(`Checked in Rameshwardas PWA Scan QR: ${mobilePatientName} - Token ${generatedToken}`);
  };

  // -------------------------------------------------------------
  // METRICS & OPERATIONS DATA PACKS (RECHARTS VISUALISERS)
  // -------------------------------------------------------------
  const getDailyThroughputData = () => {
    // Computes patient volumes
    return [
      { date: "Mon", Patients: 42, WaitTime: 28 },
      { date: "Tue", Patients: 55, WaitTime: 32 },
      { date: "Wed", Patients: 38, WaitTime: 20 },
      { date: "Thu", Patients: 48, WaitTime: 25 },
      { date: "Fri", Patients: 62, WaitTime: 35 },
      { date: "Sat", Patients: 78, WaitTime: 48 },
      { date: "Today", Patients: patients.length + visitHistory.length, WaitTime: 18 }
    ];
  };

  const getPeakHoursData = () => {
    return [
      { hour: "9 AM", Volume: 12, Delay: 5 },
      { hour: "10 AM", Volume: 24, Delay: 15 },
      { hour: "11 AM", Volume: 32, Delay: 25 },
      { hour: "12 PM", Volume: 18, Delay: 18 },
      { hour: "1 PM", Volume: 8, Delay: 5 },
      { hour: "4 PM", Volume: 15, Delay: 10 },
      { hour: "5 PM", Volume: 28, Delay: 20 },
      { hour: "6 PM", Volume: 35, Delay: 30 },
      { hour: "7 PM", Volume: 21, Delay: 15 }
    ];
  };

  const getDoctorPerformanceData = () => {
    return doctors.map(d => {
      const waitData = patients.filter(p => p.doctorId === d.id);
      return {
        name: d.name.replace("Dr. ", ""),
        "Active Queue": waitData.length,
        "Consult Time (m)": d.avgConsultationMinutes,
        "Active Delay": d.currentDelayMinutes
      };
    });
  };

  // Search filtered patients
  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.phone.includes(searchQuery) ||
                          p.tokenNumber.toString().includes(searchQuery);
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-transparent text-[#f8fafc] selection:bg-cyan-500 selection:text-black">
      {/* -------------------------------------------------------------
          HEALTHCARE BRAND SUITE & STATUS BAR HEADER
         ------------------------------------------------------------- */}
      <header className="border-b border-white/8 bg-white/2 sticky top-0 z-50 backdrop-blur-xl px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0ea5e9] flex items-center justify-center shadow-lg shadow-sky-500/10">
              <span className="font-bold text-white text-lg">Q</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-bold tracking-tight text-white">QueueCure</span>
                <span className="bg-sky-500/10 text-sky-400 text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-white/8 font-bold">AI Active</span>
              </div>
              <p className="text-[10px] text-slate-400">Intelligent Patient Flow Architecture</p>
            </div>
          </div>

          {/* Real-time sync diagnostic badge */}
          <div className="flex items-center gap-3 bg-white/3 px-3 py-1.5 rounded-lg border border-white/8 text-xs text-slate-300">
            {isRealtime ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                ● LIVE SYNC ACTIVE
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-500 font-mono font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                ● SIMULATOR OFFLINE
              </span>
            )}
            <span className="text-white/20">|</span>
            <span className="text-slate-400 font-mono">PORT 3000</span>
          </div>

          {/* Voice Announcement Config console */}
          <div className="flex items-center gap-2 bg-white/3 p-1 px-2 rounded-lg border border-white/8">
            <button
              onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
              title={isVoiceEnabled ? "Mute Voice announcements" : "Unmute Voice announcements"}
              className={`p-1.5 rounded ${isVoiceEnabled ? "text-[#0ea5e9] hover:bg-white/5" : "text-slate-500 hover:bg-white/3"}`}
            >
              {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <select
              value={announcementVoice}
              onChange={(e) => setAnnouncementVoice(e.target.value as any)}
              className="bg-transparent text-xs text-slate-300 border-none outline-none cursor-pointer pr-1"
            >
              <option value="en-IN" className="bg-[#05070a]">English Accent</option>
              <option value="hi-IN" className="bg-[#05070a]">Hindi (हिंदी) Accent</option>
            </select>
            <button
              onClick={triggerSelfTestCall}
              className="text-[10px] bg-[#0ea5e9] hover:bg-sky-500 text-white font-semibold py-1 px-2 rounded tracking-wider uppercase transition"
            >
              Test Caller
            </button>
          </div>

        </div>
      </header>

      {/* -------------------------------------------------------------
          ACTIVE TOKEN BROADCAST OVERLAY WARNING (ANNOUNCEMENT POPUP)
         ------------------------------------------------------------- */}
      {calledTokenNotification && (
        <div className="bg-gradient-to-r from-sky-950/80 to-slate-950/90 border-y border-white/8 py-3 text-center sticky top-[65px] z-40 animate-bounce shadow-2xl backdrop-blur-md">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-4 px-4">
            <div className="w-12 h-12 rounded-full bg-[#0ea5e9] flex items-center justify-center text-white font-black text-xl shadow-lg glow-emerald animate-pulse">
              {calledTokenNotification.tokenNumber}
            </div>
            <div className="text-left">
              <p className="text-xs font-mono uppercase text-[#0ea5e9] tracking-widest font-bold">
                ⚠️ NOW CALLING PATIENT TURN
              </p>
              <h2 className="text-lg lg:text-xl font-bold text-white">
                {calledTokenNotification.patientName} &rarr; Proceed to{" "}
                <span className="text-[#0ea5e9] font-display font-semibold underline decoration-wavy">
                  {calledTokenNotification.cabin}
                </span>{" "}
                ({calledTokenNotification.doctorName})
              </h2>
            </div>
            <Volume2 className="w-6 h-6 text-[#0ea5e9] animate-ping hidden md:block" />
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          PRIMARY INTERACTIVE WORKSPACE AREA
         ------------------------------------------------------------- */}
      <main className="max-w-7xl mx-auto p-4 lg:p-8">
        
        {/* Navigation Core Tabs selectors */}
        <div className="flex flex-wrap items-center bg-white/3 p-1.5 rounded-xl border border-white/6 mb-8 max-w-2xl backdrop-blur-md">
          <button
            onClick={() => setActiveTab("receptionist")}
            className={`flex-1 py-2.5 px-4 rounded-lg font-display text-sm font-semibold tracking-wide flex items-center justify-center gap-2 transition-all ${
              activeTab === "receptionist"
                ? "bg-white/10 text-white border-b-2 border-[#0ea5e9] shadow-md border-t border-x border-white/4"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4 text-cyan-400" />
            Receptionist Desk
          </button>
          <button
            onClick={() => setActiveTab("doctor")}
            className={`flex-1 py-2.5 px-4 rounded-lg font-display text-sm font-semibold tracking-wide flex items-center justify-center gap-2 transition-all ${
              activeTab === "doctor"
                ? "bg-white/10 text-white border-b-2 border-[#0ea5e9] shadow-md border-t border-x border-white/4"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            Doctor Dashboard
          </button>
          <button
            onClick={() => setActiveTab("patient")}
            className={`flex-1 py-2.5 px-4 rounded-lg font-display text-sm font-semibold tracking-wide flex items-center justify-center gap-2 transition-all ${
              activeTab === "patient"
                ? "bg-white/10 text-white border-b-2 border-[#0ea5e9] shadow-md border-t border-x border-white/4"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-4 h-4 text-indigo-400" />
            Patient PWA App
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex-1 py-2.5 px-4 rounded-lg font-display text-sm font-semibold tracking-wide flex items-center justify-center gap-2 transition-all ${
              activeTab === "analytics"
                ? "bg-white/10 text-white border-b-2 border-[#0ea5e9] shadow-md border-t border-x border-white/4"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BarChart3 className="w-4 h-4 text-amber-400" />
            Analytics Hub
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT 8-COLS SECTION CONTENT */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* 1. RECEPTIONIST DESK VIEWPORT */}
            {activeTab === "receptionist" && (
              <div className="space-y-6">
                
                {/* Checkin statistics cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="glass-panel p-4 rounded-xl text-left">
                    <span className="text-xs text-slate-400 tracking-wider font-mono">CHECKED IN TODAY</span>
                    <h3 className="text-3xl font-black text-white mt-1">
                      {patients.length + visitHistory.filter(h => h.status === "COMPLETED").length}
                    </h3>
                  </div>
                  <div className="glass-panel p-4 rounded-xl text-left">
                    <span className="text-xs text-cyan-400 tracking-wider font-mono">ACTIVE WAITING</span>
                    <h3 className="text-3xl font-black text-cyan-300 mt-1">
                      {patients.filter(p => p.status === "WAITING" || p.status === "CALLING").length}
                    </h3>
                  </div>
                  <div className="glass-panel p-4 rounded-xl text-left">
                    <span className="text-xs text-amber-500 tracking-wider font-mono">SKIPPED PATIENTS</span>
                    <h3 className="text-3xl font-black text-amber-400 mt-1">
                      {patients.filter(p => p.status === "SKIPPED").length}
                    </h3>
                  </div>
                  <div className="glass-panel p-4 rounded-xl text-left">
                    <span className="text-xs text-emerald-400 tracking-wider font-mono">COMPLETED HISTORY</span>
                    <h3 className="text-3xl font-black text-emerald-400 mt-1">
                      {visitHistory.filter(h => h.status === "COMPLETED").length}
                    </h3>
                  </div>
                </div>

                {/* Submitting Patient checkin ticket form */}
                <div className="glass-panel p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <UserPlus className="w-5 h-5 text-[#0ea5e9]" />
                    <h3 className="font-display font-bold text-lg text-white">Generate Patient Token (Onboarding Ticketing)</h3>
                  </div>
                  
                  <form onSubmit={handleCheckin} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Patient Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Priyesh Nair"
                        value={newPatientForm.name}
                        onChange={(e) => setNewPatientForm({ ...newPatientForm, name: e.target.value })}
                        required
                        className="w-full bg-white/4 border border-white/6 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#0ea5e9] placeholder-slate-400 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Mobile WhatsApp No.</label>
                      <input
                        type="text"
                        placeholder="e.g. +91 99887 76655"
                        value={newPatientForm.phone}
                        onChange={(e) => setNewPatientForm({ ...newPatientForm, phone: e.target.value })}
                        className="w-full bg-white/4 border border-white/6 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#0ea5e9] placeholder-slate-400 transition"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Age</label>
                        <input
                          type="number"
                          placeholder="Age"
                          value={newPatientForm.age}
                          onChange={(e) => setNewPatientForm({ ...newPatientForm, age: e.target.value })}
                          className="w-full bg-white/4 border border-white/6 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#0ea5e9] placeholder-slate-400 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Gender</label>
                        <select
                          value={newPatientForm.gender}
                          onChange={(e) => setNewPatientForm({ ...newPatientForm, gender: e.target.value })}
                          className="w-full bg-white/4 border border-white/6 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-[#0ea5e9] transition"
                        >
                          <option value="Male" className="bg-[#05070a]">Male</option>
                          <option value="Female" className="bg-[#05070a]">Female</option>
                          <option value="Other" className="bg-[#05070a]">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Assign Doctor Cabin</label>
                      <select
                        value={newPatientForm.doctorId}
                        onChange={(e) => setNewPatientForm({ ...newPatientForm, doctorId: e.target.value })}
                        className="w-full bg-white/4 border border-white/6 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#0ea5e9] transition"
                      >
                        {doctors.map(d => (
                          <option key={d.id} value={d.id} className="bg-[#05070a]">
                            {d.name} ({d.specialization}) - {d.cabin}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Primary Accompanying Complaint / Symptom</label>
                      <input
                        type="text"
                        placeholder="e.g. Chest irritation, pediatric vaccine checkup"
                        value={newPatientForm.complaint}
                        onChange={(e) => setNewPatientForm({ ...newPatientForm, complaint: e.target.value })}
                        className="w-full bg-white/4 border border-white/6 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#0ea5e9] placeholder-slate-400 transition"
                      />
                    </div>

                    <div className="md:col-span-3 flex items-center justify-between mt-2 pt-2 border-t border-white/8">
                      <label className="flex items-center gap-2 cursor-pointer bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400">
                        <input
                          type="checkbox"
                          checked={newPatientForm.isEmergency}
                          onChange={(e) => setNewPatientForm({ ...newPatientForm, isEmergency: e.target.checked })}
                          className="w-4 h-4 rounded text-red-500 bg-[#05070a] border-white/8 accent-red-650"
                        />
                        MARK CRITICAL EMERGENCY CASE
                      </label>

                      <button
                        type="submit"
                        className="bg-[#0ea5e9] hover:bg-sky-500 text-white font-semibold text-sm px-6 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-sky-500/20 transition duration-200"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Generate Token Ticket
                      </button>
                    </div>

                  </form>
                </div>

                {/* Queue Table Administration */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="font-display font-semibold text-lg text-white">Live Patient Registers</h3>
                      <p className="text-xs text-slate-400">Manage order priority, skipped recovery, and triage</p>
                    </div>

                    {/* Search query box */}
                    <div className="relative w-full md:w-72">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search Name, Phone or Token..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#0d1322] border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  {filteredPatients.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 bg-[#0d1322]/40 rounded-xl border border-slate-800 border-dashed">
                      <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p>No active patients found matching query.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-[#0b0e1a] text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                          <tr>
                            <th className="p-3">Token No.</th>
                            <th className="p-3">Patient Profile</th>
                            <th className="p-3">Cabin Assigned</th>
                            <th className="p-3">Symptom Summary</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {filteredPatients.map((pat) => {
                            const doc = doctors.find(d => d.id === pat.doctorId);
                            
                            return (
                              <tr key={pat.id} className="hover:bg-slate-900/40 transition">
                                <td className="p-3">
                                  <span className="bg-[#121c32] text-cyan-300 border border-cyan-500/20 text-xs font-mono font-black rounded-lg px-2.5 py-1">
                                    #{pat.tokenNumber}
                                  </span>
                                </td>
                                
                                <td className="p-3">
                                  <div>
                                    <div className="font-bold text-white flex items-center gap-1.5">
                                      {pat.name}
                                      {pat.isEmergency && (
                                        <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase animate-pulse">
                                          CRITICAL
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-400">{pat.phone} (Age: {pat.age}, {pat.gender})</p>
                                  </div>
                                </td>

                                <td className="p-3">
                                  <div className="font-semibold text-slate-200">
                                    {doc ? doc.name : "Unassigned"}
                                  </div>
                                  <p className="text-[10px] text-slate-400">{doc?.specialization} | {doc?.cabin}</p>
                                </td>

                                <td className="p-3 text-slate-400 max-w-[150px] truncate" title={pat.complaint}>
                                  {pat.complaint}
                                </td>

                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    pat.status === "CONSULTING" 
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                      : pat.status === "SKIPPED"
                                      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                      : pat.status === "CALLING"
                                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                      : "bg-slate-800 text-slate-400 border-slate-700"
                                  }`}>
                                    {pat.status}
                                  </span>
                                </td>

                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    
                                    {/* Action to restore skipped */}
                                    {pat.status === "SKIPPED" ? (
                                      <button
                                        onClick={() => recoverPatient(pat.id)}
                                        className="bg-amber-600 hover:bg-amber-500 text-black text-[10px] font-bold px-2 py-1 rounded"
                                        title="Restore to waiting queue status exactly 2 slips ahead"
                                      >
                                        Recover Slip
                                      </button>
                                    ) : (
                                      <>
                                        {/* Toggle emergency */}
                                        {!pat.isEmergency && (
                                          <button
                                            onClick={() => triggerEmergencyLevel(pat.id)}
                                            className="bg-red-500/15 hover:bg-red-500/35 border border-red-500/20 text-red-400 text-[10px] font-semibold px-2 py-1 rounded"
                                            title="Flag emergency"
                                          >
                                            Emerg
                                          </button>
                                        )}
                                        
                                        {/* Skip patient */}
                                        {pat.status !== "CONSULTING" && (
                                          <button
                                            onClick={() => skipPatient(pat.id)}
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-2 py-1 rounded"
                                            title="Mark as skipped / no show"
                                          >
                                            Skip
                                          </button>
                                        )}
                                      </>
                                    )}

                                    {/* Call manual speaker voice announcment */}
                                    <button
                                      onClick={() => triggerVoiceCall({
                                        tokenNumber: pat.tokenNumber,
                                        patientName: pat.name,
                                        doctorName: doc ? doc.name : "Sharma",
                                        cabin: doc ? doc.cabin : "Cabin 1"
                                      })}
                                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                                      title="Announce Ticket Loudly"
                                    >
                                      <Volume2 className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Remove from queue completely */}
                                    <button
                                      onClick={() => removePatient(pat.id)}
                                      className="text-red-500 hover:bg-red-500/10 p-1 rounded"
                                      title="Remove from queue"
                                    >
                                      <AlertOctagon className="w-3.5 h-3.5" />
                                    </button>

                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* 2. DOCTOR WORKSPACE DIVISION */}
            {activeTab === "doctor" && (
              <div className="space-y-6">
                
                {/* Doctor profile selector mock login */}
                <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="font-display font-medium text-white text-sm">Doctor Cabin Login Console</h4>
                      <p className="text-[10px] text-slate-400">Simulate switching Doctor desks live</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {doctors.map(d => (
                      <button
                        key={d.id}
                        onClick={() => setSelectedDoctorId(d.id)}
                        className={`text-xs px-3 py-2 rounded-lg border font-semibold transition ${
                          selectedDoctorId === d.id
                            ? "bg-cyan-500 text-black border-cyan-400"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                        }`}
                      >
                        {d.name.split(" ")[1]} ({d.specialization.substring(0,3)})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Doctor consultation controls panel */}
                {(() => {
                  const activeDoc = doctors.find(d => d.id === selectedDoctorId);
                  if (!activeDoc) return null;

                  const docPatients = patients.filter(p => p.doctorId === activeDoc.id);
                  const currentConsultingPatient = docPatients.find(p => p.status === "CONSULTING");
                  const activeWaitingPatients = docPatients
                    .filter(p => p.status === "WAITING" || p.status === "CALLING")
                    .sort((a,b) => {
                      if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
                      return a.tokenNumber - b.tokenNumber;
                    });

                  return (
                    <div className="space-y-6">
                      
                      {/* Busiest current consultation card */}
                      <div className="bg-gradient-to-br from-indigo-950 to-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -z-10"></div>
                        
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 text-xs font-mono px-3 py-1 rounded-full uppercase tracking-wider font-bold">
                              📍 ACTIVE CLINIC CABIN: {activeDoc.cabin}
                            </span>
                            <h2 className="text-2xl font-display font-black text-white mt-3 underline decoration-cyan-500 decoration-wavy decoration-2">
                              {activeDoc.name}
                            </h2>
                            <p className="text-sm text-cyan-400">{activeDoc.specialization}</p>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-xs text-slate-400">Total Cabin Wait-Time Burden</span>
                            <p className="text-2xl font-black text-rose-400">{activeDoc.currentDelayMinutes}m delay</p>
                          </div>
                        </div>

                        {/* Consulting Patient information panel */}
                        <div className="mt-8 pt-8 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                          <div className="space-y-4">
                            <span className="text-xs text-slate-400 font-mono tracking-widest">CURRENT CONSULTATION PATIENT</span>
                            
                            {currentConsultingPatient ? (
                              <div className="space-y-2">
                                <span className="bg-cyan-500 text-black font-mono font-black text-2xl px-4 py-1.5 rounded-lg inline-block shadow-lg shadow-cyan-500/20">
                                  TOKEN #{currentConsultingPatient.tokenNumber}
                                </span>
                                <h3 className="text-3xl font-black text-white tracking-tight">{currentConsultingPatient.name}</h3>
                                <p className="text-sm text-slate-300">
                                  {currentConsultingPatient.age} years old • {currentConsultingPatient.gender}
                                </p>
                                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg text-xs">
                                  <strong className="text-cyan-400 text-[10px] uppercase font-mono block mb-1">Diagnosed complaint</strong>
                                  <p className="text-slate-300 italic">"{currentConsultingPatient.complaint}"</p>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <h1 className="text-3xl font-black text-slate-500 italic">Cabin Empty</h1>
                                <p className="text-sm text-slate-400">Call the next patient from queue tracking</p>
                              </div>
                            )}
                          </div>

                          {/* Quick trigger consultation actions */}
                          <div className="flex flex-col gap-3">
                            <button
                              onClick={() => callNextPatient(activeDoc.id)}
                              className="bg-cyan-600 hover:bg-cyan-500 text-black font-display font-black text-sm tracking-wide py-5 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg glow-emerald"
                            >
                              <Volume2 className="w-5 h-5 animate-pulse" />
                              Call Next Patient Token &rarr;
                            </button>

                            {currentConsultingPatient && (
                              <button
                                onClick={() => skipPatient(currentConsultingPatient.id)}
                                className="bg-[#121c32] hover:bg-slate-800 text-slate-300 border border-slate-700 py-3 rounded-xl text-xs font-semibold"
                              >
                                Skip / Patient Is Absent (Move to Holding)
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Consultation Delay speed controllers */}
                      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                        <h3 className="font-display font-semibold text-white text-base max-w-sm mb-4">
                          Proactive Delay Alerts (Predictive wait-time sync)
                        </h3>
                        <p className="text-xs text-slate-400 mb-4">
                          If an ongoing emergency or severe surgery introduces queue delays, set a buffer time. It will immediately recompute estimations for all subsequent patients.
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <button
                            onClick={() => updateDoctorDelay(activeDoc.id, 0)}
                            className={`py-3 text-xs font-bold rounded-xl border ${activeDoc.currentDelayMinutes === 0 ? "bg-emerald-500/15 border-emerald-400 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}
                          >
                            No Delay (0 mins)
                          </button>
                          <button
                            onClick={() => updateDoctorDelay(activeDoc.id, 10)}
                            className={`py-3 text-xs font-bold rounded-xl border ${activeDoc.currentDelayMinutes === 10 ? "bg-amber-500/15 border-amber-400 text-amber-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}
                          >
                            +10 Mins (Minor Overload)
                          </button>
                          <button
                            onClick={() => updateDoctorDelay(activeDoc.id, 20)}
                            className={`py-3 text-xs font-bold rounded-xl border ${activeDoc.currentDelayMinutes === 20 ? "bg-rose-500/15 border-rose-400 text-rose-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}
                          >
                            +20 Mins (Major Procedure)
                          </button>
                          <button
                            onClick={() => updateDoctorDelay(activeDoc.id, 30)}
                            className={`py-3 text-xs font-bold rounded-xl border ${activeDoc.currentDelayMinutes === 30 ? "bg-red-500/15 border-red-500 text-red-300 animate-pulse" : "bg-slate-900 border-slate-800 text-slate-400"}`}
                          >
                            +30 Mins (Emergency Procedure)
                          </button>
                        </div>
                      </div>

                      {/* Doctor upcoming patients lists */}
                      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-display font-semibold text-white">Upcoming Queue for {activeDoc.name}</h3>
                          <span className="bg-[#121c32] text-cyan-400 text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-cyan-500/10">
                            {activeWaitingPatients.length} Waiting patients
                          </span>
                        </div>

                        {activeWaitingPatients.length === 0 ? (
                          <div className="py-8 text-center text-slate-500 bg-[#0d1322]/40 rounded-xl border border-slate-850">
                            No upcoming patients in queue.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {activeWaitingPatients.map((p, idx) => (
                              <div key={p.id} className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-[#121c32] flex items-center justify-center font-mono font-black text-cyan-300">
                                    #{p.tokenNumber}
                                  </div>
                                  <div>
                                    <div className="font-bold text-white flex items-center gap-2">
                                      {p.name}
                                      {p.isEmergency && <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-bold px-1.5 py-0.2 rounded-full animate-pulse">EMERGENCY</span>}
                                    </div>
                                    <p className="text-[10px] text-slate-400">Complaint: {p.complaint}</p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="text-[10px] text-slate-500 block uppercase font-mono">predicted wait</span>
                                  <span className="text-sm font-bold text-cyan-300">~{p.estimatedWaitMinutes} mins</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })()}

              </div>
            )}

            {/* 3. PHYSICAL ANDROID PATIENT HUB APP SIMULATOR */}
            {activeTab === "patient" && (
              <div className="space-y-6">
                
                <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                  <h3 className="font-display font-semibold text-white text-lg flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-indigo-400" />
                    Double Deployment: Native PWA / Android Mobile Simulator
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Below is our customized modular Android patient client. Patients check in by scanning the QR code, track their live queue slips, compute estimated clinic wait intervals using WMA forecasts, and chat with Shreya - their AI Hospital Assistant!
                  </p>
                </div>

                {/* Android Phone Frame Simulator */}
                <div className="flex justify-center py-4">
                  <div className="w-full max-w-[370px] bg-[#0c0c0d] rounded-[48px] p-4 p-b-5 border-[8px] border-[#1e293b] shadow-[0_0_50px_rgba(6,182,212,0.1)] relative">
                    
                    {/* Speaker and Camera notch */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-5 w-28 bg-[#1e293b] rounded-b-2xl flex items-center justify-center z-20">
                      <div className="w-12 h-1 bg-[#090d16] rounded-full"></div>
                    </div>

                    {/* Phone Screen Internal container */}
                    <div className="bg-[#0b0e17] rounded-[36px] overflow-hidden min-h-[550px] flex flex-col justify-between border border-slate-800">
                      
                      {/* Simulated PWA mobile header */}
                      <div className="bg-[#0e1628] pt-6 pb-3 px-4 flex items-center justify-between border-b border-slate-850">
                        <div className="flex items-center gap-1.5">
                          <Stethoscope className="w-4 h-4 text-cyan-400 animate-spin-pulse" />
                          <span className="text-xs font-display font-extrabold tracking-tight text-white">QueueCure Patient Portal</span>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400">
                          <span>5G</span>
                          <span className="text-emerald-400">94%</span>
                        </div>
                      </div>

                      {/* Main Mobile App Screen Dynamic Routing */}
                      <div className="p-4 flex-1 flex flex-col justify-between overflow-y-auto max-h-[460px]">
                        
                        {/* Step A: Scan QR/Select profile */}
                        {mobileCheckinStep === "scan" && (
                          <div className="space-y-5 text-center py-4">
                            <QrCode className="w-16 h-16 text-cyan-400 mx-auto animate-pulse" />
                            <div>
                              <h4 className="font-bold text-white text-sm">Scan Clinic QR Code to Check In</h4>
                              <p className="text-[10px] text-slate-400 mt-1">
                                Instant hospital arrival checkin without download
                              </p>
                            </div>

                            <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800 space-y-3">
                              <span className="text-[10px] text-slate-500 font-mono block">OR TEST SIMULATE AN ARRIVAL</span>
                              
                              <button
                                onClick={() => {
                                  setMobileCheckinStep("form");
                                }}
                                className="w-full bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-bold py-2.5 rounded-lg transition"
                              >
                                Live QR Check-In Simulation
                              </button>
                            </div>

                            {/* View Status Option */}
                            <div className="text-left space-y-2 pt-2 border-t border-slate-850">
                              <span className="text-[10px] text-slate-500 font-mono">TRACK EXISTING CHECKED IN SLIP</span>
                              {patients.length === 0 ? (
                                <p className="text-[10px] text-slate-500">No active checked-in patients in clinic register currently.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {patients.map(p => (
                                    <button
                                      key={p.id}
                                      onClick={() => {
                                        setMobileCurrentPatientId(p.id);
                                        setMobileCheckinStep("tracking");
                                      }}
                                      className="w-full bg-[#121c32] hover:bg-slate-800 text-slate-300 py-1.5 px-3 rounded text-left text-[11px] truncate flex justify-between"
                                    >
                                      <span>Token #{p.tokenNumber} - {p.name}</span>
                                      <span className="text-cyan-400 text-[10px] font-bold font-mono">Track &rarr;</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Step B: On-boarding client details */}
                        {mobileCheckinStep === "form" && (
                          <form onSubmit={handleMobileCheckinSubmit} className="space-y-3 pt-2 text-left">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                              <button
                                type="button"
                                onClick={() => setMobileCheckinStep("scan")}
                                className="text-xs text-slate-400 hover:text-white"
                              >
                                &larr; Back
                              </button>
                              <h4 className="font-bold text-white text-xs">Simulated QR Check-in Form</h4>
                            </div>

                            <div>
                              <label className="text-[10px] font-semibold text-slate-400 mb-0.5">Doctor assignment</label>
                              <select
                                value={mobileDoctorId}
                                onChange={(e) => setMobileDoctorId(e.target.value)}
                                className="w-full bg-[#0d1322] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                              >
                                {doctors.map(d => (
                                  <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-semibold text-slate-400 mb-0.5">Your Name</label>
                              <input
                                type="text"
                                placeholder="Patient full name"
                                value={mobilePatientName}
                                onChange={(e) => setMobilePatientName(e.target.value)}
                                required
                                className="w-full bg-[#0d1322] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-semibold text-slate-400 mb-0.5">Age</label>
                                <input
                                  type="number"
                                  placeholder="Age"
                                  value={mobilePatientAge}
                                  onChange={(e) => setMobilePatientAge(e.target.value)}
                                  className="w-full bg-[#0d1322] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-slate-400 mb-0.5">Gender</label>
                                <select
                                  value={mobilePatientGender}
                                  onChange={(e) => setMobilePatientGender(e.target.value)}
                                  className="w-full bg-[#0d1322] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                >
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-semibold text-slate-400 mb-0.5">Accompanying Complaint</label>
                              <input
                                type="text"
                                placeholder="Chest pains / Cough ..."
                                value={mobilePatientComplaint}
                                onChange={(e) => setMobilePatientComplaint(e.target.value)}
                                className="w-full bg-[#0d1322] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                              />
                            </div>

                            <button
                              type="submit"
                              className="w-full bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-bold py-2 rounded-lg mt-2"
                            >
                              Register Arrival Slip
                            </button>
                          </form>
                        )}

                        {/* Step C: Real-time slip tracker and AI Hospital Nurse Agent */}
                        {mobileCheckinStep === "tracking" && (() => {
                          const trackedPat = patients.find(p => p.id === mobileCurrentPatientId);
                          if (!trackedPat) {
                            return (
                              <div className="text-center py-8">
                                <p className="text-xs text-slate-400">Token check-in not loaded or finished.</p>
                                <button
                                  onClick={() => setMobileCheckinStep("scan")}
                                  className="text-xs text-cyan-400 underline mt-2 inline-block"
                                >
                                  Back to Scan Checkin
                                </button>
                              </div>
                            );
                          }

                          const assignedDoc = doctors.find(d => d.id === trackedPat.doctorId);
                          
                          // Determine actual position inside waiting list
                          const sameDocWaiting = patients
                            .filter(p => p.doctorId === trackedPat.doctorId && (p.status === "WAITING" || p.status === "CALLING"))
                            .sort((a,b) => {
                              if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
                              return a.tokenNumber - b.tokenNumber;
                            });

                          const activePos = sameDocWaiting.findIndex(p => p.id === trackedPat.id) + 1;
                          const countAhead = activePos > 0 ? activePos - 1 : 0;

                          return (
                            <div className="space-y-4">
                              
                              <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                                <button
                                  onClick={() => setMobileCheckinStep("scan")}
                                  className="text-[10px] text-slate-400 hover:text-white"
                                >
                                  &larr; Exit Slip
                                </button>
                                <span className="text-[10px] text-emerald-400 font-bold tracking-widest font-mono">
                                  ● UPDATING REALTIME
                                </span>
                              </div>

                              {/* Live telemetry slip panel */}
                              <div className="bg-[#121c32]/80 border border-cyan-800/30 p-4 rounded-2xl text-center shadow-lg">
                                <span className="text-[9px] text-slate-400 uppercase font-mono tracking-widest">
                                  YOUR ACTIVE QUEUE SLIP CARD
                                </span>
                                
                                <div className="text-slate-400 text-xs font-semibold mt-2">{trackedPat.name}</div>
                                
                                <span className="bg-cyan-500 text-black font-mono font-black text-2xl px-5 py-1 rounded-lg inline-block my-2">
                                  TOKEN #{trackedPat.tokenNumber}
                                </span>

                                <div className="text-[10px] text-slate-400">{assignedDoc?.name} ({assignedDoc?.specialization})</div>
                                <div className="text-[10px] text-cyan-300 font-semibold mb-2">{assignedDoc?.cabin}</div>

                                {/* Main visual state tracker */}
                                <div className="bg-[#0b0e17]/80 rounded-xl p-3 border border-slate-850 mt-3 space-y-2">
                                  {trackedPat.status === "CONSULTING" ? (
                                    <div className="text-emerald-400 font-bold text-xs animate-pulse">
                                      🟢 DOCTOR IS COMPLETED TESTING WITH YOU NOW
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 gap-2 text-left">
                                      <div className="border-r border-slate-800 pr-1">
                                        <span className="text-[9px] text-slate-500 uppercase block font-mono">PEOPLE AHEAD</span>
                                        <span className="text-sm font-black text-white">{countAhead} Patients</span>
                                      </div>
                                      <div className="pl-1">
                                        <span className="text-[9px] text-slate-500 uppercase block font-mono">WAIT FORECAST</span>
                                        <span className="text-sm font-black text-emerald-400">~{trackedPat.estimatedWaitMinutes} mins</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Virtual Patient AI Nurse chatbot panel */}
                              <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 space-y-2 text-left mt-2">
                                <div className="flex items-center gap-1.5 pb-1 border-b border-slate-850">
                                  <Sparkles className="w-3 h-3 text-indigo-400" />
                                  <span className="text-[10px] font-bold text-indigo-300">Shreya: AI Virtual Nurse Assistant</span>
                                </div>

                                <div className="space-y-1.5 h-24 overflow-y-auto text-[10px] pr-1">
                                  {patientAiMessages.map((msg, i) => (
                                    <div key={i} className={`p-1.5 rounded-lg max-w-[90%] leading-relaxed ${
                                      msg.sender === "ai" 
                                        ? "bg-indigo-950/40 text-slate-300 border border-indigo-950" 
                                        : "bg-cyan-950/40 text-cyan-200 border border-cyan-900/40 ml-auto"
                                    }`}>
                                      {msg.text}
                                    </div>
                                  ))}
                                  {isPatientAiTyping && (
                                    <span className="text-[9px] text-slate-500 italic">Shreya is typing suggestions...</span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    placeholder="Can I step outside for tea?"
                                    value={patientAiInput}
                                    onChange={(e) => setPatientAiInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && askPatientNurse()}
                                    className="flex-1 bg-[#0b0e17] border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none"
                                  />
                                  <button
                                    onClick={askPatientNurse}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white p-1 rounded-lg"
                                  >
                                    <Send className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                            </div>
                          );
                        })()}

                      </div>

                      {/* Android navigation footer */}
                      <div className="h-10 bg-[#0c1221] border-t border-slate-850 flex items-center justify-around text-slate-500 text-sm">
                        <span className="cursor-pointer hover:text-white" onClick={() => setMobileCheckinStep("scan")}>&larr;</span>
                        <span className="cursor-pointer hover:text-white" onClick={() => setMobileCheckinStep("scan")}>⬡</span>
                        <span className="cursor-pointer hover:text-white" onClick={() => setMobileCheckinStep("scan")}>📋</span>
                      </div>

                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* 4. ANALYTICS & IN-DEPTH SAAS CLINIC INSIGHTS GRAPH */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Patients Daily register count */}
                  <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                    <h4 className="font-display font-semibold text-white text-sm mb-4">Daily Patient Throughput & Wait Time Rate</h4>
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={getDailyThroughputData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                          <YAxis stroke="#94a3b8" fontSize={11} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }} />
                          <Area type="monotone" dataKey="Patients" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorPatients)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Peak Hours Volume / Delay Heatmap bar chart */}
                  <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                    <h4 className="font-display font-semibold text-white text-sm mb-4">Clinic Congestion Over Peak Operational Hours</h4>
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getPeakHoursData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                          <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                          <YAxis stroke="#94a3b8" fontSize={11} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }} />
                          <Bar dataKey="Volume" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Delay" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                {/* Doctor Cabin load analysis comparative bars */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                  <h4 className="font-display font-semibold text-white text-sm mb-4">Doctor Performance & Delay Breakdown Telemetry</h4>
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getDoctorPerformanceData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }} />
                        <Legend />
                        <Bar dataKey="Active Queue" fill="#06b6d4" />
                        <Bar dataKey="Consult Time (m)" fill="#10b981" />
                        <Bar dataKey="Active Delay" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Automatically calculated AI Insights Generator summary */}
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <h4 className="font-display font-bold text-white text-base">Clinically Computed Insights Summary</h4>
                  </div>
                  <div className="text-xs text-slate-350 space-y-3 leading-relaxed">
                    <p>
                      <strong>1. Critical Peak Load Congestion:</strong> Daily clinic traffic suggests patient volume surges heavily on Saturdays, peaking between <strong>10:00 AM - 12:00 PM</strong> and <strong>5:00 PM - 7:00 PM</strong> with an average backlog of 32 minutes per card ticket.
                    </p>
                    <p>
                      <strong>2. Pediatric Shift Balance:</strong> Dr. Ananya Patel (Pediatrics) maintains high speed and throughput velocity today. Walkin patients can have checkins processed safely under 10 minutes average wait.
                    </p>
                    <p>
                      <strong>3. Dynamic Buffer Warning:</strong> Dr. Vikram Iyer is currently treating chest complication cases causing a +15 minutes procedural delay. Backlog wait-time calculations updated on all active patient slips automatically to secure trust.
                    </p>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* RIGHT 4-COLS SECTION CONTAINER (AI ASSISTANT PANELS & LIVE FEED) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Quick QR generation checkin generator panel */}
            <div className="glass-panel p-5 text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-white font-bold text-sm">
                <QrCode className="w-4 h-4 text-[#0ea5e9]" />
                Clinic Print Desk QR Code Generator
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Provide these unique QR codes at reception tables. Patients scan them with their devices to auto-trigger the checkin screen!
              </p>

              <div className="grid grid-cols-2 gap-2 font-sans">
                {doctors.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => setShowQRModal(doc.id)}
                    className="p-2 border border-white/6 bg-white/3 hover:bg-white/10 hover:border-white/10 text-left rounded-xl transition cursor-pointer"
                  >
                    <span className="text-[9px] text-slate-500 font-mono block">SCAN KEY CABINET</span>
                    <strong className="text-[10px] text-white block truncate">{doc.name.replace("Dr. ", "")}</strong>
                    <span className="text-[9px] text-[#0ea5e9] font-medium">Render Code &rarr;</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI SYSTEM AUDITOR CHAT PANEL */}
            <div className="glass-panel overflow-hidden shadow-2xl">
              <div className="bg-white/4 border-b border-white/8 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0ea5e9] animate-spin-pulse" />
                  <div>
                    <h3 className="font-display font-black text-xs text-white uppercase tracking-wider">QueueCure Operations AI</h3>
                    <p className="text-[9px] text-slate-400">Gemini Clinical Auditor Core</p>
                  </div>
                </div>
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                  Online
                </span>
              </div>

              {/* Chat Log Screen */}
              <div className="p-4 h-64 overflow-y-auto space-y-3 bg-white/1 text-xs text-left">
                {assistantMessages.map((msg, idx) => (
                  <div key={idx} className={`p-2.5 rounded-xl leading-relaxed ${
                    msg.role === "user" 
                      ? "bg-white/10 border border-white/8 text-white ml-8 shadow-sm" 
                      : msg.role === "system"
                      ? "bg-amber-950/20 border border-amber-900/30 text-amber-300 mx-2 text-center"
                      : "bg-[#0ea5e9]/10 border border-white/4 text-slate-200 mr-8"
                  }`}>
                    {msg.text}
                  </div>
                ))}
                {isAssistantTyping && (
                  <p className="text-slate-500 text-[10px] uppercase font-mono animate-pulse">
                    ⚡ Gemini Analyzer compiling real-time telemetry...
                  </p>
                )}
              </div>

              {/* Chat quick suggestion prompts */}
              <div className="bg-white/2 p-2.5 border-t border-white/8 flex flex-wrap gap-1.5 justify-start">
                <button
                  onClick={() => setAssistantInput("Who is the busiest doctor right now and what is the bottleneck analysis today?")}
                  className="bg-white/3 hover:bg-white/10 text-slate-300 text-[9px] px-2 py-1 rounded-md border border-white/5 transition cursor-pointer"
                >
                  "Busiest Doctor Bottleneck"
                </button>
                <button
                  onClick={() => setAssistantInput("Recommend quick operational advice to reduce average patient wait duration")}
                  className="bg-white/3 hover:bg-white/10 text-slate-300 text-[9px] px-2 py-1 rounded-md border border-white/5 transition cursor-pointer"
                >
                  "Operational Advice"
                </button>
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-white/4 border-t border-white/8 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ask Gemini system audit queries..."
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askAIAssistant()}
                  className="flex-1 bg-white/4 border border-white/6 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#0ea5e9] transition"
                />
                <button
                  onClick={askAIAssistant}
                  className="bg-[#0ea5e9] hover:bg-sky-500 text-white p-2 rounded-lg transition"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* REALTIME SYSTEM EVENT LOGGER */}
            <div className="glass-panel p-4 text-left">
              <div className="flex items-center justify-between pb-2 border-b border-white/8 mb-3">
                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                  Clinic Real-Time Broadcast Log Network
                </span>
                <button onClick={fetchState} className="p-1 hover:bg-white/10 rounded cursor-pointer transition">
                  <RefreshCw className="w-3 h-3 text-slate-400" />
                </button>
              </div>
              
              <div className="h-44 overflow-y-auto space-y-1.5 font-mono text-[10px]">
                {serverLogs.map((log, i) => (
                  <div key={i} className="text-slate-400 border-l border-sky-500/30 pl-2 py-0.5 leading-snug">
                    <span className="text-sky-550 block text-[8px]">{new Date().toLocaleTimeString()}</span>
                    {log}
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* -------------------------------------------------------------
          MODAL OVERLAY GENERATOR FOR PRINT DESK QR CODES
         ------------------------------------------------------------- */}
      {showQRModal && (() => {
        const docObj = doctors.find(d => d.id === showQRModal);
        if (!docObj) return null;

        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#0b0f19] border border-slate-700 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
              <QrCode className="w-32 h-32 text-cyan-400 mx-auto" />
              <div>
                <h4 className="font-display font-medium text-lg text-white">QR Code Desk Sticker</h4>
                <p className="text-xs text-cyan-400">{docObj.name} ({docObj.specialization})</p>
                <p className="text-[10px] text-slate-500 mt-1">{docObj.cabin}</p>
              </div>
              <div className="p-3 bg-[#0d1322] rounded-xl text-left border border-slate-800">
                <span className="text-[9px] text-[#888] font-mono block">SCAN LINK EMBEDDED</span>
                <span className="text-[10px] text-slate-300 block truncate select-all font-mono">
                  https://ais-pre-457uufyhuz...clinicId=india-general&doctorId={docObj.id}
                </span>
              </div>
              <p className="text-[10px] text-[#666]">
                Place this QR Code mockup on your desk. Scanning redirects your patient to checkin dynamically.
              </p>
              <button
                onClick={() => setShowQRModal(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 font-bold text-xs py-2 rounded-xl"
              >
                Close Desk Sticker
              </button>
            </div>
          </div>
        );
      })()}

      {/* -------------------------------------------------------------
          SaaS FOOTER CREDITS CONTROL
         ------------------------------------------------------------- */}
      <footer className="border-t border-[#1e293b]/60 py-6 text-center text-xs text-slate-500 bg-[#070b13]/80 mt-16">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 QueueCure AI Technologies Pvt Ltd. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-350 cursor-pointer">Security Certifications</span>
            <span>•</span>
            <span className="hover:text-slate-350 cursor-pointer">HIPAA & GDPR Secure Encryption</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer text-indigo-400">Winning Hack Series Entry</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
