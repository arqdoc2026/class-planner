// Ruta: src/app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, ChevronRight, ChevronLeft, Printer, Pencil, Save, X,
  LayoutDashboard, BookOpen, Calendar, User, Settings,
  Database, Layers, FileCheck, LogOut, Plus, Trash2, Upload, ExternalLink,
  ChevronDown, ChevronUp, Folder, FileText, CheckCircle, GripHorizontal, Clock, PlayCircle
} from "lucide-react";
import { getDashboardPlans, updateClassPlan } from "../../lib/actions/dashboard-actions";
import { getInstitutionalTemplate } from "../../lib/actions/template-actions";
import { getTeacherSchedule, saveTeacherSchedule } from "../../lib/actions/schedule-actions"; // NUEVO
import AiEditableTextarea from "../../components/ui/AiEditableTextarea";
import { getRubricDownloadUrl, uploadPlanRubric } from "../../lib/actions/rubric-actions";
import { groupSessionsIntoDocuments } from "../../lib/plan-documents";
import { getCurrentProfileAction } from "../../lib/actions/team-actions";
import { logoutAction } from "../../lib/actions/auth-actions";

export default function DashboardPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [template, setTemplate] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<{
    id: string;
    fullName: string;
    email: string;
    role: "INSTITUTION_ADMIN" | "COORDINATOR" | "TEACHER" | "VIEWER";
    isSuperAdmin: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editableData, setEditableData] = useState<any>(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("¡Cambios guardados!");
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingRubricPlanId, setUploadingRubricPlanId] = useState<string | null>(null);

  // ESTADO DE HORARIO Y TIEMPO (NUEVO)
  const [weekOffset, setWeekOffset] = useState(0); // 0 = Esta semana, -1 = Pasada, 1 = Próxima
  const [isScheduleSaved, setIsScheduleSaved] = useState(true); // Asumimos que empieza interactivo
  const [schedule, setSchedule] = useState<{ day: string; slots: string[] }[]>([
    { day: "Lunes", slots: ["", "", "", ""] },
    { day: "Martes", slots: ["", "", "", ""] },
    { day: "Miércoles", slots: ["", "", "", ""] },
    { day: "Jueves", slots: ["", "", "", ""] },
    { day: "Viernes", slots: ["", "", "", ""] },
  ]);

  const teacherNameUI = currentProfile?.fullName || "DOCENTE";
  const currentTrimester = "III Trimestre";

  // LÓGICA DE TIEMPO INTELIGENTE (Ahora soporta cambio de semanas)
  const getIntelligentTimeContext = (offset: number) => {
    const today = new Date();
    today.setDate(today.getDate() + (offset * 7)); // Suma o resta semanas completas

    // Cálculo base de semana de trimestre (Asumiendo inicio en Marzo 2026)
    const startOfTrimester = new Date(today.getFullYear(), 2, 1);
    const diffTime = today.getTime() - startOfTrimester.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const currentWeek = Math.max(1, Math.ceil(diffDays / 7));

    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + 1);
    const friday = new Date(today);
    friday.setDate(today.getDate() - dayOfWeek + 5);

    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    const dateStr = `Del ${monday.toLocaleDateString('es-CO', { day: 'numeric' })} al ${friday.toLocaleDateString('es-CO', options)} de ${today.getFullYear()}`;

    return { week: currentWeek, dateStr };
  };

  const timeContext = getIntelligentTimeContext(weekOffset);

  // CARGA DE DATOS (Incluyendo el Horario desde Supabase)
  useEffect(() => {
    async function loadData() {
      const [plansRes, templateRes, scheduleRes, profileRes] = await Promise.all([
        getDashboardPlans(),
        getInstitutionalTemplate(),
        getTeacherSchedule(),
        getCurrentProfileAction(),
      ]);

      if (plansRes.success && plansRes.data) setPlans(plansRes.data);
      if (templateRes.success && templateRes.data) setTemplate(templateRes.data);
      setCurrentProfile(profileRes);

      // Si hay horario guardado, lo cargamos
      if (scheduleRes.success && scheduleRes.data) {
        setSchedule(scheduleRes.data as any);
        setIsScheduleSaved(true);
      } else {
        setIsScheduleSaved(false); // Si no hay horario, abrimos en modo edición
      }

      setIsLoading(false);
    }
    loadData();
  }, []);

  const uniqueGrades = Array.from(new Set(plans.map(p => p.grade))).sort();
  const stats = {
    totalPlans: plans.length,
    totalGrades: uniqueGrades.length,
    activeTrimester: currentTrimester,
    completedSessions: plans.reduce((acc, p) => acc + (p.sessions?.length || 0), 0)
  };
  // DRAG AND DROP
  const handleDragStart = (e: React.DragEvent, grade: string) => {
    if (isScheduleSaved) return;
    e.dataTransfer.setData("grade", grade);
  };
  const handleDragOver = (e: React.DragEvent) => {
    if (isScheduleSaved) return;
    e.preventDefault();
  };
  const handleDrop = (e: React.DragEvent, dayIdx: number, slotIdx: number) => {
    if (isScheduleSaved) return;
    e.preventDefault();
    const draggedGrade = e.dataTransfer.getData("grade");
    if (!draggedGrade) return;
    setSchedule((prev) => {
      const newSchedule = [...prev];
      newSchedule[dayIdx] = { ...newSchedule[dayIdx] };
      newSchedule[dayIdx].slots = [...newSchedule[dayIdx].slots];
      newSchedule[dayIdx].slots[slotIdx] = draggedGrade;
      return newSchedule;
    });
  };
  const removeClassFromSchedule = (e: React.MouseEvent, dayIdx: number, slotIdx: number) => {
    e.stopPropagation();
    setSchedule((prev) => {
      const newSchedule = [...prev];
      newSchedule[dayIdx] = { ...newSchedule[dayIdx] };
      newSchedule[dayIdx].slots = [...newSchedule[dayIdx].slots];
      newSchedule[dayIdx].slots[slotIdx] = "";
      return newSchedule;
    });
  };

  // GUARDAR EN SUPABASE
  const handleSaveSchedule = async () => {
    if (!isScheduleSaved) {
      setSuccessMsg("Guardando horario en la base de datos...");
      setShowSuccess(true);
      const res = await saveTeacherSchedule(teacherNameUI, schedule);
      if(res.success) {
        setSuccessMsg("¡Horario activado y guardado!");
        setIsScheduleSaved(true);
      }
    } else {
      setIsScheduleSaved(false); // Pasar a modo edición
    }
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // NAVEGACIÓN INTELIGENTE (Abrir archivo exacto de la semana)
  const handleSlotClick = (grade: string) => {
    if (isScheduleSaved && grade) {
      setSelectedGrade(grade);

      // Magia: Adivinar qué archivo abrir basado en la semana actual
      const plansForGrade = plans.filter(p => p.grade === grade);
      if (plansForGrade.length > 0) {
        const plan = plansForGrade[0];
        const sessionIndex = Math.max(0, timeContext.week - 1);
        const documentStart = Math.floor(sessionIndex / 2) * 2;
        setExpandedFileId(`${plan.id}-document-${documentStart}`);
      }
    }
  };

  // LÓGICA DE RENDERING DE ARCHIVOS
  const calculateInstitutionalDates = (chunkSessions: any[], planBase: any) => {
    if (!chunkSessions || chunkSessions.length === 0) return { desde: '', hasta: '', elaboracion: '', aprobacion: '' };
    const baseDate = new Date(planBase.classDate || planBase.createdAt);
    const firstSessionNum = chunkSessions[0].sessionNumber || 1;
    const lastSessionNum = chunkSessions[chunkSessions.length - 1].sessionNumber || 1;
    const firstDate = new Date(baseDate);
    firstDate.setDate(firstDate.getDate() + (firstSessionNum - 1) * 7);
    const lastDate = new Date(baseDate);
    lastDate.setDate(lastDate.getDate() + (lastSessionNum - 1) * 7);
    const dayOfWeek = firstDate.getDay();
    const diffToMonday = firstDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const mondayDate = new Date(firstDate);
    mondayDate.setDate(diffToMonday);
    const elaboracionDate = new Date(mondayDate);
    elaboracionDate.setDate(mondayDate.getDate() - 6);
    const aprobacionDate = new Date(mondayDate);
    aprobacionDate.setDate(mondayDate.getDate() - 4);

    return { desde: firstDate.toLocaleDateString('es-CO'), hasta: lastDate.toLocaleDateString('es-CO'), elaboracion: elaboracionDate.toLocaleDateString('es-CO'), aprobacion: aprobacionDate.toLocaleDateString('es-CO') };
  };

  const getFilesForSelectedGrade = () => {
    if (!selectedGrade) return [];
    const plansForGrade = plans.filter(p => p.grade === selectedGrade);
    const documents: any[] = [];
    plansForGrade.forEach((plan) => {
      const sessions = plan.sessions || [];
      groupSessionsIntoDocuments(sessions).forEach((documentSessions, documentIndex) => {
        const index = documentIndex * 2;
        documents.push({
          id: `${plan.id}-document-${index}`,
          parentPlan: plan,
          sessions: documentSessions,
          documentNumber: Math.floor(index / 2) + 1,
          totalDocuments: Math.ceil(sessions.length / 2),
          dates: calculateInstitutionalDates(documentSessions, plan),
        });
      });
    });
    return documents;
  };

  const filesToRender = getFilesForSelectedGrade();
  const toggleFile = (id: string) => { if (editingFileId) return; setExpandedFileId(expandedFileId === id ? null : id); };
  const startEditing = (file: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const copy = JSON.parse(JSON.stringify(file));
    copy.parentPlan.teacherName ||= template?.defaultTeacher || "";
    copy.parentPlan.coordinatorName ||= template?.defaultCoordinator || "";
    copy.parentPlan.area ||= template?.defaultArea || "";
    copy.parentPlan.subject ||= template?.defaultSubject || "";
    copy.parentPlan.completedSessions ??= 0;
    copy.parentPlan.status ||= "DRAFT";
    setEditingFileId(file.id);
    setEditableData(copy);
  };
  const cancelEditing = (e: React.MouseEvent) => { e.stopPropagation(); setEditingFileId(null); setEditableData(null); };

  const saveChanges = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editableData || isSaving) return;
    setIsSaving(true);
    const plan = editableData.parentPlan;
    const result = await updateClassPlan({
      id: plan.id,
      versionNumber: Number(plan.versionNumber) || 1,
      area: plan.area || "",
      subject: plan.subject || "",
      grade: plan.grade || "",
      unitTitle: plan.unitTitle || "",
      learningObjective: plan.learningObjective || "",
      essentialQuestions: plan.essentialQuestions || "",
      pblCompetence: plan.pblCompetence || "",
      knowledge: plan.knowledge || "",
      skills: plan.skills || "",
      performanceTask: plan.performanceTask || "",
      otherEvidences: plan.otherEvidences || "",
      alignmentReflection: plan.alignmentReflection || "",
      curricularAdjustments: plan.curricularAdjustments || "",
      classEvaluation: plan.classEvaluation || "",
      otherObservations: plan.otherObservations || "",
      teacherName: plan.teacherName || "",
      coordinatorName: plan.coordinatorName || "",
      completedSessions: Number(plan.completedSessions) || 0,
      status: plan.status || "DRAFT",
      sessions: editableData.parentPlan.sessions.map((session: any, index: number) => ({
        id: session.id,
        sessionNumber: index + 1,
        learningResults: session.learningResults || "",
        resources: session.resources || "",
        startActivity: session.startActivity || "",
        developmentActivity: session.developmentActivity || "",
        closingActivity: session.closingActivity || "",
      })),
    });

    if (result.success && result.data) {
      setPlans((current) => current.map((item) => item.id === result.data?.id ? result.data : item));
      setEditingFileId(null);
      setEditableData(null);
      setNoticeType("success");
      setSuccessMsg("¡Planeación guardada en Supabase!");
    } else {
      setNoticeType("error");
      setSuccessMsg(result.error || "No se pudieron guardar los cambios.");
    }
    setShowSuccess(true);
    setIsSaving(false);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  const handlePlanChange = (field: string, value: string | number) => setEditableData({ ...editableData, parentPlan: { ...editableData.parentPlan, [field]: value } });
  const handleUnitTitleChange = (value: string) => {
    const currentTitle = editableData.parentPlan.unitTitle || "";
    const prefix = currentTitle.split("-")[0]?.trim();
    handlePlanChange("unitTitle", prefix?.startsWith("Trimestre") ? `${prefix} - ${value}` : value);
  };
  const handleSessionChange = (sessionId: string, field: string, value: string) => {
    const updatedSessions = editableData.sessions.map((s: any) => s.id === sessionId ? { ...s, [field]: value } : s);
    const allSessions = editableData.parentPlan.sessions.map((s: any) => s.id === sessionId ? { ...s, [field]: value } : s);
    setEditableData({
      ...editableData,
      sessions: updatedSessions,
      parentPlan: { ...editableData.parentPlan, sessions: allSessions },
    });
  };

  const addSession = (e: React.MouseEvent) => {
    e.stopPropagation();
    const sessionNumber = editableData.parentPlan.sessions.length + 1;
    const newSession = {
      id: `new-${crypto.randomUUID()}`,
      sessionNumber,
      learningResults: "",
      resources: "",
      startActivity: "",
      developmentActivity: "",
      closingActivity: "",
    };
    setEditableData({
      ...editableData,
      parentPlan: {
        ...editableData.parentPlan,
        sessions: [...editableData.parentPlan.sessions, newSession],
      },
    });
  };

  const removeSession = (sessionId: string) => {
    if (editableData.parentPlan.sessions.length === 1) return;
    const allSessions = editableData.parentPlan.sessions
      .filter((session: any) => session.id !== sessionId)
      .map((session: any, index: number) => ({ ...session, sessionNumber: index + 1 }));
    const visibleIds = new Set(editableData.sessions.map((session: any) => session.id));
    const sessions = allSessions.filter((session: any) => visibleIds.has(session.id));
    setEditableData({
      ...editableData,
      parentPlan: {
        ...editableData.parentPlan,
        completedSessions: Math.min(editableData.parentPlan.completedSessions || 0, allSessions.length),
        sessions: allSessions,
      },
      sessions,
    });
  };

  const exportDocumentToPdf = (planId: string) => {
    window.open(`/plans/${planId}/print`, "_blank", "noopener,noreferrer");
  };

  const uploadRubric = async (planId: string, file?: File) => {
    if (!file || uploadingRubricPlanId) return;
    setUploadingRubricPlanId(planId);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadPlanRubric(planId, formData);
    if (result.success && result.path) {
      setPlans((current) => current.map((plan) => plan.id === planId ? { ...plan, rubricFileUrl: result.path } : plan));
      if (editableData?.parentPlan.id === planId) {
        setEditableData({
          ...editableData,
          parentPlan: { ...editableData.parentPlan, rubricFileUrl: result.path },
        });
      }
      setNoticeType("success");
      setSuccessMsg("¡Rúbrica guardada en Supabase Storage!");
    } else {
      setNoticeType("error");
      setSuccessMsg(result.error || "No se pudo subir la rúbrica.");
    }
    setShowSuccess(true);
    setUploadingRubricPlanId(null);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  const openRubric = async (path: string) => {
    const result = await getRubricDownloadUrl(path);
    if (result.success && result.url) window.open(result.url, "_blank", "noopener,noreferrer");
    else {
      setNoticeType("error");
      setSuccessMsg(result.error || "No se pudo abrir la rúbrica.");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    }
  };

  // ==========================================
  // VISTA 1: DASHBOARD PREMIUM Y HORARIO INTELIGENTE
  // ==========================================
  if (!selectedGrade) {
    if (isLoading) return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-400 border-t-slate-100 rounded-full animate-spin"></div>
          <span className="text-slate-400 font-medium tracking-widest text-xs uppercase">Sincronizando Sistema...</span>
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-[#f8fafc] flex">
        <aside className="w-64 bg-[#020617] text-slate-300 hidden lg:flex flex-col border-r border-slate-800 shrink-0">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-slate-600 rounded-lg flex items-center justify-center shadow-lg">
                <Database className="w-4 h-4 text-[#020617]" />
              </div>
              <span className="font-black text-xl tracking-tighter text-white">GYM<span className="text-slate-500 font-light">PLAN</span></span>
            </div>
            <nav className="space-y-1">
              <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 text-white rounded-xl transition-all font-medium border border-slate-700/50">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <Link href="/config/template" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30 hover:text-white rounded-xl transition-all font-medium text-slate-400">
                <Settings className="w-4 h-4" /> Configuración
              </Link>
              {currentProfile?.role === "INSTITUTION_ADMIN" && (
                <>
                  <Link href="/admin/team" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30 hover:text-white rounded-xl transition-all font-medium text-slate-400">
                    <User className="w-4 h-4" /> Equipo docente
                  </Link>
                  <Link href="/admin/institution" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30 hover:text-white rounded-xl transition-all font-medium text-slate-400">
                    <Settings className="w-4 h-4" /> Institución
                  </Link>
                </>
              )}
              {currentProfile?.isSuperAdmin && (
                <Link href="/superadmin" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30 hover:text-white rounded-xl transition-all font-medium text-amber-400">
                  <Database className="w-4 h-4" /> Superadministración
                </Link>
              )}
            </nav>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <header className="h-20 bg-white border-b border-slate-200 px-10 flex items-center justify-between sticky top-0 z-50 shadow-sm">
            <div className="flex items-center gap-2">
               <span className="text-slate-400 font-medium tracking-tight">Sistema</span>
               <ChevronRight className="w-4 h-4 text-slate-300" />
               <span className="text-slate-900 font-bold tracking-tight">Panel de Control Diario</span>
            </div>
            <div className="flex items-center gap-6">
               <form action={logoutAction}><button aria-label="Cerrar sesión" className="text-slate-400 hover:text-red-500 transition-colors"><LogOut className="w-5 h-5" /></button></form>
            </div>
          </header>

          <div className="p-8 md:p-10 space-y-10 max-w-7xl mx-auto relative">
            {showSuccess && (
              <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 font-bold">
                <CheckCircle className="w-5 h-5" /> {successMsg}
              </div>
            )}

            <div className="bg-[#020617] rounded-3xl p-8 md:p-10 relative overflow-hidden shadow-xl border border-slate-800">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
              <Link href="/plans/new" className="absolute right-8 top-8 z-10 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg">
                + Nueva planeación
              </Link>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-600/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

              <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start gap-8">
                <div className="w-28 h-28 bg-gradient-to-br from-slate-200 to-slate-400 rounded-2xl border-4 border-[#0f172a] shadow-2xl flex items-center justify-center overflow-hidden shrink-0">
                  <User className="w-12 h-12 text-slate-800" />
                </div>

                <div className="flex-1 text-center lg:text-left w-full">
                  <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-1">{teacherNameUI}</h2>
                  <p className="text-slate-400 font-medium tracking-widest text-xs uppercase mb-6 flex items-center justify-center lg:justify-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Director Académico
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-center lg:justify-start gap-1"><BookOpen className="w-3 h-3"/> Planeaciones</p>
                      <h4 className="text-2xl font-black text-white">{stats.totalPlans}</h4>
                    </div>
                    <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-center lg:justify-start gap-1"><Layers className="w-3 h-3"/> Cursos Asignados</p>
                      <h4 className="text-2xl font-black text-white">{stats.totalGrades}</h4>
                    </div>
                    <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-center lg:justify-start gap-1"><Calendar className="w-3 h-3"/> Trimestre Actual</p>
                      <h4 className="text-xl font-black text-white pt-1">{stats.activeTrimester}</h4>
                    </div>
                    <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-center lg:justify-start gap-1"><FileCheck className="w-3 h-3"/> Sesiones Totales</p>
                      <h4 className="text-2xl font-black text-white">{stats.completedSessions}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN DRAGGABLE (Solo visible si NO está guardado el horario) */}
            {!isScheduleSaved && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   Mis Grados <span className="text-xs font-normal text-slate-400">| Arrástralos al horario inferior para programarlos</span>
                </h2>

                {uniqueGrades.length === 0 ? (
                  <div className="text-center p-16 bg-white rounded-xl border-2 border-dashed border-slate-300">
                    <p className="text-slate-500">No hay planes generados aún.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {uniqueGrades.map((grade) => (
                      <div
                        key={grade}
                        draggable
                        onDragStart={(e) => handleDragStart(e, grade)}
                        className="bg-white group p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-[#020617] hover:shadow-lg transition-all cursor-grab active:cursor-grabbing relative overflow-hidden"
                      >
                        <div className="absolute top-3 right-3 text-slate-300 group-hover:text-slate-900 transition-colors">
                          <GripHorizontal className="w-5 h-5"/>
                        </div>
                        <Folder className="w-8 h-8 text-slate-300 group-hover:text-slate-900 transition-colors mb-3" />
                        <h3 className="text-xl font-black text-slate-800 group-hover:text-slate-900 relative z-10">Grado {grade}</h3>
                        <button onClick={() => setSelectedGrade(grade)} className="text-[10px] font-bold text-blue-600 mt-2 hover:underline uppercase relative z-10">Ver Todos →</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* HORARIO INTELIGENTE */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    Horario de Clases
                    {isScheduleSaved && <span className="bg-green-100 text-green-700 text-[10px] uppercase px-2 py-1 rounded border border-green-300 flex items-center gap-1"><PlayCircle className="w-3 h-3"/> En Vivo</span>}
                  </h2>

                  {/* Navegador de Semanas */}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                      <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-1 hover:bg-white rounded hover:shadow-sm transition-all text-slate-600"><ChevronLeft className="w-4 h-4"/></button>
                      <span className="px-3 text-xs font-bold text-slate-700 whitespace-nowrap">Semana {timeContext.week}</span>
                      <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-1 hover:bg-white rounded hover:shadow-sm transition-all text-slate-600"><ChevronRight className="w-4 h-4"/></button>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-xs uppercase tracking-widest hidden sm:inline-block font-semibold">{timeContext.dateStr}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveSchedule}
                  className={`text-sm font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-md transition-all ${isScheduleSaved ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg hover:-translate-y-0.5'}`}
                >
                  {isScheduleSaved ? <><Pencil className="w-4 h-4"/> Editar Bloques</> : <><Save className="w-4 h-4"/> Guardar Horario</>}
                </button>
              </div>

              <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden overflow-x-auto transition-all duration-500 ${isScheduleSaved ? 'border-blue-400 ring-4 ring-blue-50' : 'border-slate-200'}`}>
                 <table className="w-full text-sm text-left table-fixed min-w-[700px]">
                   <thead>
                     <tr>
                       <th className="p-4 bg-slate-50 border-b border-r border-slate-200 text-slate-500 font-black text-xs uppercase tracking-widest w-24 text-center">Hora</th>
                       {schedule.map(d => <th key={d.day} className="p-4 bg-slate-50 border-b border-slate-200 text-slate-800 font-black text-center">{d.day}</th>)}
                     </tr>
                   </thead>
                   <tbody>
                     {[0,1,2,3].map(slotIdx => (
                       <tr key={slotIdx} className="border-b border-slate-100 last:border-0">
                         <td className="p-3 border-r border-slate-100 text-slate-400 font-bold text-xs text-center bg-slate-50/50">
                            Bloque {slotIdx + 1}
                         </td>
                         {schedule.map((day, dayIdx) => (
                           <td
                             key={dayIdx}
                             className={`p-2 border-r border-slate-100 last:border-0 relative h-20 ${!isScheduleSaved ? 'group' : ''}`}
                             onDragOver={handleDragOver}
                             onDrop={(e) => handleDrop(e, dayIdx, slotIdx)}
                           >
                             {day.slots[slotIdx] ? (
                                <div
                                  onClick={() => handleSlotClick(day.slots[slotIdx])}
                                  className={`
                                    h-full rounded-xl flex justify-between items-center px-4 shadow-sm transition-all
                                    ${isScheduleSaved
                                      ? 'bg-blue-50 border-2 border-blue-200 text-blue-900 cursor-pointer hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:scale-[1.02] hover:shadow-md group'
                                      : 'bg-[#020617] border border-slate-700 text-white group-hover:bg-slate-800 cursor-default'}
                                  `}
                                >
                                   <div className="flex flex-col">
                                      <span className="flex items-center gap-2 font-black text-sm">
                                        <Folder className={`w-4 h-4 ${isScheduleSaved ? 'text-blue-500 group-hover:text-blue-200' : 'text-slate-400'}`}/>
                                        Grado {day.slots[slotIdx]}
                                      </span>
                                      {isScheduleSaved && <span className="text-[9px] uppercase tracking-widest opacity-70 mt-0.5">Abrir Semana {timeContext.week}</span>}
                                   </div>

                                   {!isScheduleSaved && (
                                     <button onClick={(e) => removeClassFromSchedule(e, dayIdx, slotIdx)} className="text-slate-400 hover:text-red-400 transition-colors p-1">
                                       <X className="w-4 h-4"/>
                                     </button>
                                   )}
                                </div>
                             ) : (
                                <div className={`h-full border-2 border-dashed rounded-xl flex items-center justify-center text-[10px] font-bold uppercase transition-colors ${isScheduleSaved ? 'border-transparent text-transparent bg-slate-50/30' : 'border-slate-200 text-slate-300 hover:border-slate-400 hover:bg-slate-50'}`}>
                                   {!isScheduleSaved && "Soltar Aquí"}
                                </div>
                             )}
                           </td>
                         ))}
                       </tr>
                     ))}
                   </tbody>
                 </table>
              </div>
            </div>

          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // VISTA 2: ARCHIVOS DE CLASE (Intacta)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 print:bg-white print:p-0">
      <div className="max-w-7xl mx-auto space-y-10 print:space-y-0 print:m-0">

        {showSuccess && (
          <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-50 ${noticeType === "error" ? "bg-red-600" : "bg-green-600"} text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-10 font-bold`}>
            <CheckCircle className="w-5 h-5" /> {successMsg}
          </div>
        )}

        <div className="flex justify-between items-center print:hidden">
          <button onClick={() => { setSelectedGrade(null); setExpandedFileId(null); }} className="inline-flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-5 rounded-full transition-all text-sm shadow-sm">
            <ArrowLeft className="w-4 h-4" /> Volver al Horario
          </button>
          <div className="flex items-center gap-4">
            <div className="bg-white px-4 py-2 rounded-full border border-slate-200 text-slate-600 font-bold text-xs shadow-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500"/> Semana {timeContext.week}
            </div>
            <div className="bg-slate-900 px-4 py-2 rounded-full text-white font-black text-sm shadow-inner flex items-center gap-2">
              <Folder className="w-4 h-4 text-slate-400"/> Archivos de Grado {selectedGrade}
            </div>
          </div>
        </div>

        <div className="space-y-6 print:space-y-0">
          {filesToRender.map((file) => {
            const isExpanded = expandedFileId === file.id;
            const isEditing = editingFileId === file.id;
            const dataToDisplay = isEditing ? editableData : file;
            const planBase = dataToDisplay.parentPlan;
            const dates = calculateInstitutionalDates(dataToDisplay.sessions, planBase);

            const cleanUnitTitle = planBase.unitTitle.split('-')[1]?.trim() || planBase.unitTitle;
            const trimestreNum = planBase.unitTitle.split('-')[0]?.replace('Trimestre', '')?.trim() || 'III';
            const area = planBase.area || template?.defaultArea || "";
            const subject = planBase.subject || template?.defaultSubject || "";
            const teacherName = planBase.teacherName || template?.defaultTeacher || "SIN ASIGNAR";
            const coordinatorName = planBase.coordinatorName || template?.defaultCoordinator || "SIN ASIGNAR";
            const aiContext = {
              grade: planBase.grade || "", area, subject, unitTitle: cleanUnitTitle,
              period: trimestreNum, sessionCount: planBase.sessions?.length || 0,
              objectives: planBase.learningObjective || "", expectedResults: planBase.learningObjective || "",
              knowledge: planBase.knowledge || "", skills: planBase.skills || "",
              availableResources: dataToDisplay.sessions.map((session: any) => session.resources || "").filter(Boolean).join("\n"),
              differentiation: planBase.curricularAdjustments || "",
              institutionalApproach: "Paradigma Pedagógico Ignaciano y educación personalizada",
            };
            const documentStart = ((file.documentNumber || 1) - 1) * 2;
            const completedInDocument = Math.max(0, Math.min(dataToDisplay.sessions.length, (planBase.completedSessions || 0) - documentStart));

            return (
              <div key={file.id} className={`bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden transition-all duration-300 print:shadow-none print:border-none print:rounded-none ${isExpanded ? 'print:block' : 'print:hidden'}`}>

                <div onClick={() => toggleFile(file.id)} className="p-6 cursor-pointer hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                  <div className="flex items-center gap-4">
                    <div className={`${isExpanded ? 'bg-blue-600' : 'bg-slate-900'} transition-colors text-white p-3 rounded-lg`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-mono text-slate-500 font-bold bg-slate-200 px-2 py-0.5 rounded">
                          Documento {file.documentNumber} de {file.totalDocuments}
                        </span>
                        {isExpanded && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold uppercase tracking-widest">Abierto desde Horario</span>}
                        {isEditing && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded border border-yellow-300">Modo Edición</span>}
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{planBase.status || "DRAFT"}</span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-800">
                        {cleanUnitTitle}
                        <span className="text-slate-500 ml-2">(Sesiones {file.sessions.map((s:any) => s.sessionNumber).join(" y ")})</span>
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center justify-end text-slate-400 gap-2">
                    {isExpanded && !isEditing && (
                      <>
                        {!["APPROVED", "ARCHIVED", "READY_FOR_REVIEW", "IN_REVIEW"].includes(planBase.status) && (
                          <button className="flex items-center gap-2 text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-200" onClick={(e) => startEditing(file, e)}>
                            <Pencil className="w-4 h-4"/> Editar Archivo
                          </button>
                        )}
                        <Link href={`/plans/${planBase.id}/review`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 hover:bg-blue-100">
                          <FileCheck className="h-4 w-4" /> Revisión
                        </Link>
                        <button className="flex items-center gap-2 text-slate-900 bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-200" onClick={(e) => { e.stopPropagation(); exportDocumentToPdf(planBase.id); }}>
                          <Printer className="w-4 h-4"/> Exportar formato oficial
                        </button>
                      </>
                    )}
                    {isExpanded && isEditing && (
                      <>
                        <button className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-100 border border-blue-200" onClick={addSession}>
                          <Plus className="w-4 h-4"/> Agregar sesión a la planeación
                        </button>
                        <button className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-100" onClick={cancelEditing}>
                          <X className="w-4 h-4"/> Cancelar
                        </button>
                        <button disabled={isSaving} className="flex items-center gap-2 text-green-700 bg-green-100 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-green-200 border border-green-300 disabled:opacity-50" onClick={saveChanges}>
                          <Save className="w-4 h-4"/> {isSaving ? "Guardando…" : "Guardar"}
                        </button>
                      </>
                    )}
                    {!isEditing && (isExpanded ? <ChevronUp className="w-6 h-6 ml-2" /> : <ChevronDown className="w-6 h-6 ml-2" />)}
                  </div>
                </div>

                {/* --- EL RESTO DEL CÓDIGO ICONTEC ES EXACTAMENTE IGUAL AL ANTERIOR --- */}
                {isExpanded && (
                  <div className="border-t-2 border-slate-200 bg-slate-300 p-4 md:p-8 print:p-0 print:border-none print:bg-white">
                    <div id={`pdf-${file.id}`} className="institutional-document bg-white p-8 md:p-10 shadow-2xl max-w-[816px] mx-auto print:shadow-none print:max-w-none print:p-0 text-black font-sans">

                      <table className="w-full border-collapse border border-black text-xs mb-0 table-fixed">
                        <tbody>
                          <tr>
                            <td rowSpan={4} className="border border-black p-2 text-center w-[20%] align-middle">
                              {template?.logoUrl ? (
                                <img src={template.logoUrl} alt="Logo" className="max-h-16 mx-auto object-contain" />
                              ) : (
                                <div className="h-20 flex flex-col items-center justify-center text-slate-400 font-bold text-[10px]">
                                  [ESCUDO COLEGIO]
                                </div>
                              )}
                            </td>
                            <td colSpan={3} className="border border-black p-2 text-center align-middle font-bold text-lg w-[55%] tracking-wide">
                              {template?.formatName || "PLANEACIÓN"}
                            </td>
                            <td colSpan={2} className="border border-black p-2 text-center align-middle bg-gray-100 w-[25%]">
                              <div>Código:</div>
                              <div>{template?.formatCode || "MGF-03-R05"}</div>
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={3} className="border border-black p-1 pl-2">
                              <strong>Área:</strong> {isEditing ? <input value={area} onChange={e => handlePlanChange('area', e.target.value)} className="w-3/4 bg-yellow-50 outline-none" /> : area}
                            </td>
                            <td colSpan={2} className="border border-black p-1 pl-2">
                              <strong>Asignatura:</strong> {isEditing ? <input value={subject} onChange={e => handlePlanChange('subject', e.target.value)} className="w-2/3 bg-yellow-50 outline-none" /> : subject}
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-black p-1 pl-2 font-bold w-[10%]">Fecha</td>
                            <td className="border border-black p-1 pl-2 w-[22.5%]">
                              <strong>Desde:</strong> {dates.desde}
                            </td>
                            <td className="border border-black p-1 pl-2 w-[22.5%]">
                              <strong>Hasta:</strong> {dates.hasta}
                            </td>
                            <td colSpan={2} className="border border-black p-1 text-center font-bold">
                              Número de sesiones
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-black p-1 pl-2"><strong>Grado:</strong> {isEditing ? <input value={planBase.grade || ""} onChange={e => handlePlanChange('grade', e.target.value)} className="w-16 bg-yellow-50 outline-none" /> : planBase.grade}</td>
                            <td className="border border-black p-1 pl-2">
                              <strong>Trimestre / Semestre:</strong> {trimestreNum}
                            </td>
                            <td className="border border-black p-1 pl-2">
                              <strong>Fecha de elaboración:</strong> {dates.elaboracion}
                            </td>
                            <td className="border border-black p-1 pl-2 w-[12.5%]">
                              <strong>Planeadas:</strong> {dataToDisplay.sessions.length}
                            </td>
                            <td className="border border-black p-1 pl-2 w-[12.5%]">
                              <strong>Completadas:</strong> {isEditing ? <input type="number" min={0} max={dataToDisplay.sessions.length} value={completedInDocument} onChange={e => handlePlanChange('completedSessions', documentStart + Number(e.target.value))} className="w-10 bg-yellow-50 outline-none border-b border-yellow-300" /> : completedInDocument}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <table className="w-full border-collapse border border-t-0 border-black text-xs mb-6">
                        <tbody>
                          <tr>
                            <td colSpan={2} className="border border-black bg-gray-200 p-1 text-center font-bold text-sm">
                              Etapa 1 - Resultados esperados
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-black bg-gray-200 p-1 pl-2 font-bold w-[30%]">Título de la unidad</td>
                            <td className="border border-black p-1 pl-2">
                              {isEditing ? <AiEditableTextarea value={cleanUnitTitle} onChange={handleUnitTitleChange} field="Título de la unidad" context={aiContext} className="w-full h-12 bg-yellow-50 outline-none resize-none" /> : cleanUnitTitle}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={2} className="border border-black bg-gray-200 p-1 pl-2 font-bold">Objetivo de aprendizaje</td>
                          </tr>
                          <tr>
                            <td colSpan={2} className="border border-black p-2 min-h-[60px] text-justify">
                              {isEditing ? <AiEditableTextarea value={planBase.learningObjective || ""} onChange={value => handlePlanChange('learningObjective', value)} field="Objetivo de aprendizaje" context={aiContext} className="w-full h-16 bg-yellow-50 outline-none resize-none" /> : planBase.learningObjective}
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-black bg-gray-200 p-2 text-center w-1/2 align-top">
                              <div className="font-bold text-sm">Preguntas esenciales</div>
                              <div className="text-[10px] mt-1 text-gray-800">¿Qué preguntas provocativas fomentarán la investigación sobre el contenido?</div>
                            </td>
                            <td className="border border-black bg-gray-200 p-2 text-center w-1/2 align-top">
                              <div className="font-bold text-sm">PBL</div>
                              <div className="italic text-sm mt-1">Competencia PBL</div>
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-black p-2 min-h-[60px] align-top text-justify whitespace-pre-wrap">
                              {isEditing ? <AiEditableTextarea value={planBase.essentialQuestions || ""} onChange={value => handlePlanChange('essentialQuestions', value)} field="Preguntas esenciales" context={aiContext} className="w-full h-20 bg-yellow-50 outline-none resize-none" /> : planBase.essentialQuestions}
                            </td>
                            <td className="border border-black p-2 min-h-[60px] align-top text-justify whitespace-pre-wrap">
                              {isEditing ? <AiEditableTextarea value={planBase.pblCompetence || ""} onChange={value => handlePlanChange('pblCompetence', value)} field="Competencia PBL" context={aiContext} className="w-full h-20 bg-yellow-50 outline-none resize-none" /> : planBase.pblCompetence}
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-black bg-gray-200 p-2 text-center w-1/2 align-top">
                              <div className="font-bold text-sm mb-1">Conocimiento</div>
                              <div className="text-[10px] text-gray-800 text-justify">¿Qué conocimientos adquirirá el estudiante como resultado de esta unidad?</div>
                            </td>
                            <td className="border border-black bg-gray-200 p-2 text-center w-1/2 align-top">
                              <div className="font-bold text-sm mb-1">Habilidades</div>
                              <div className="text-[10px] text-gray-800 text-justify">Enumerar las habilidades y/o comportamientos relacionados con las competencias que los estudiantes podrán exhibir.</div>
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-black p-2 min-h-[60px] align-top text-justify whitespace-pre-wrap">
                              {isEditing ? <AiEditableTextarea value={planBase.knowledge || ""} onChange={value => handlePlanChange('knowledge', value)} field="Conocimientos" context={aiContext} className="w-full h-20 bg-yellow-50 outline-none resize-none" /> : planBase.knowledge}
                            </td>
                            <td className="border border-black p-2 min-h-[60px] align-top text-justify whitespace-pre-wrap">
                              {isEditing ? <AiEditableTextarea value={planBase.skills || ""} onChange={value => handlePlanChange('skills', value)} field="Habilidades" context={aiContext} className="w-full h-20 bg-yellow-50 outline-none resize-none" /> : planBase.skills}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <table className="w-full border-collapse border border-black text-xs mb-6">
                        <tbody>
                          <tr>
                            <td colSpan={2} className="border border-black bg-gray-200 p-1 text-center font-bold text-sm">
                              Etapa 2 - Evidencias de evaluación
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-black p-2 w-1/2 align-top">
                              <div className="font-bold text-center border-b border-black pb-1 mb-2">Tarea de desempeño</div>
                              <div className="text-[10px] text-gray-800 leading-tight mb-2 text-justify">¿A través de qué tarea auténtica de desempeño los estudiantes demostrarán los entendimientos, conocimientos y habilidades deseados?</div>
                              {isEditing ? <AiEditableTextarea value={planBase.performanceTask || ""} onChange={value => handlePlanChange('performanceTask', value)} field="Tarea de desempeño" context={aiContext} className="w-full h-24 bg-yellow-50 outline-none resize-none" /> : <div className="min-h-[60px] whitespace-pre-wrap text-justify">{planBase.performanceTask}</div>}
                            </td>
                            <td className="border border-black p-2 w-1/2 align-top">
                              <div className="font-bold text-center border-b border-black pb-1 mb-2">Otras evidencias</div>
                              <div className="text-[10px] text-gray-800 leading-tight mb-2 text-justify">¿A través de qué otra evidencia los estudiantes demostrarán el logro de los resultados deseados?</div>
                              {isEditing ? <AiEditableTextarea value={planBase.otherEvidences || ""} onChange={value => handlePlanChange('otherEvidences', value)} field="Otras evidencias" context={aiContext} className="w-full h-24 bg-yellow-50 outline-none resize-none" /> : <div className="min-h-[60px] whitespace-pre-wrap text-justify">{planBase.otherEvidences}</div>}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={2} className="border border-black p-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-bold">Adjunte la rúbrica aquí</span>
                                <div className="flex items-center gap-2 print:hidden">
                                  {planBase.rubricFileUrl && (
                                    <button type="button" onClick={() => openRubric(planBase.rubricFileUrl)} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 font-bold text-slate-700 hover:bg-slate-200">
                                      <ExternalLink className="h-3 w-3" /> Abrir rúbrica
                                    </button>
                                  )}
                                  {isEditing && (
                                    <label className="inline-flex cursor-pointer items-center gap-1 rounded bg-blue-50 px-2 py-1 font-bold text-blue-700 hover:bg-blue-100">
                                      <Upload className="h-3 w-3" />
                                      {uploadingRubricPlanId === planBase.id ? "Subiendo…" : "Subir archivo"}
                                      <input disabled={uploadingRubricPlanId === planBase.id} type="file" accept=".pdf,.docx,.xlsx" className="hidden" onChange={event => uploadRubric(planBase.id, event.target.files?.[0])} />
                                    </label>
                                  )}
                                </div>
                              </div>
                              {!planBase.rubricFileUrl && <div className="mt-2 min-h-6 text-center text-[10px] text-slate-500">PDF, DOCX o XLSX · máximo 10 MB</div>}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="print:break-before-page">
                        <table className="w-full border-collapse border border-black text-xs mb-6">
                          <thead>
                            <tr>
                              <td colSpan={4} className="border border-black bg-gray-200 p-1 text-center font-bold text-sm">
                                Etapa 3 - Plan de aprendizaje
                              </td>
                            </tr>
                            <tr className="bg-slate-100">
                              <th className="border border-black p-1 w-[8%] text-center">Sesión</th>
                              <th className="border border-black p-1 w-[16%] text-center">Resultados de aprendizaje</th>
                              <th className="border border-black p-1 text-center">Actividades de instrucción</th>
                              <th className="border border-black p-1 w-[27%] text-center">Recursos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dataToDisplay.sessions.map((session: any) => (
                              <tr key={session.id} className="print:break-inside-avoid">
                                <td className="border border-black p-1 text-center align-top font-bold text-sm bg-slate-50">
                                  <div>{session.sessionNumber}</div>
                                  {isEditing && dataToDisplay.parentPlan.sessions.length > 1 && (
                                    <button type="button" aria-label={`Eliminar sesión ${session.sessionNumber}`} onClick={() => removeSession(session.id)} className="mt-2 print:hidden text-red-600 hover:text-red-800">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </td>
                                <td className="border border-black p-2 align-top text-[10px] text-justify">
                                  {isEditing ? <AiEditableTextarea value={session.learningResults || ""} onChange={value => handleSessionChange(session.id, 'learningResults', value)} field="Resultados de aprendizaje de la sesión" context={{ ...aiContext, sessionNumber: session.sessionNumber }} className="w-full h-full min-h-[60px] bg-yellow-50 outline-none resize-none" /> : session.learningResults}
                                </td>
                                <td className="border border-black p-0 align-top">
                                  <div className="border-b border-black p-2">
                                    <strong className="text-[10px] font-black uppercase block mb-1">Inicio:</strong>
                                    {isEditing ? <AiEditableTextarea value={session.startActivity || ""} onChange={value => handleSessionChange(session.id, 'startActivity', value)} field="Actividad de inicio" context={{ ...aiContext, sessionNumber: session.sessionNumber }} className="w-full min-h-[40px] bg-yellow-50 outline-none resize-none text-[10px]" /> : <div className="text-[10px] text-justify">{session.startActivity}</div>}
                                  </div>
                                  <div className="border-b border-black p-2">
                                    <strong className="text-[10px] font-black uppercase block mb-1">Actividades de la clase:</strong>
                                    {isEditing ? <AiEditableTextarea value={session.developmentActivity || ""} onChange={value => handleSessionChange(session.id, 'developmentActivity', value)} field="Actividades de la clase" context={{ ...aiContext, sessionNumber: session.sessionNumber }} className="w-full min-h-[50px] bg-yellow-50 outline-none resize-none text-[10px]" /> : <div className="text-[10px] text-justify">{session.developmentActivity}</div>}
                                  </div>
                                  <div className="p-2">
                                    <strong className="text-[10px] font-black uppercase block mb-1">Cierre:</strong>
                                    {isEditing ? <AiEditableTextarea value={session.closingActivity || ""} onChange={value => handleSessionChange(session.id, 'closingActivity', value)} field="Actividad de cierre" context={{ ...aiContext, sessionNumber: session.sessionNumber }} className="w-full min-h-[40px] bg-yellow-50 outline-none resize-none text-[10px]" /> : <div className="text-[10px] text-justify">{session.closingActivity}</div>}
                                  </div>
                                </td>
                                <td className="border border-black p-2 align-top text-[10px] text-justify">
                                  {isEditing ? <AiEditableTextarea value={session.resources || ""} onChange={value => handleSessionChange(session.id, 'resources', value)} field="Recursos de la sesión" context={{ ...aiContext, sessionNumber: session.sessionNumber }} className="w-full h-full min-h-[60px] bg-yellow-50 outline-none resize-none" /> : session.resources}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="print:break-inside-avoid">
                        <table className="w-full border-collapse border border-black text-xs mb-0">
                          <tbody>
                            <tr>
                              <td colSpan={4} className="border border-black bg-gray-200 p-2 text-center font-bold text-sm">
                                Etapa 4 – Evaluar y reflexionar
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-black p-2 text-center w-1/4 align-top text-[10px]">¿Alineación de objetivos y desempeño?</td>
                              <td className="border border-black p-2 text-center w-1/4 align-top text-[10px]">¿Qué ajustes intencionados se hicieron al currículo?</td>
                              <td className="border border-black p-2 text-center w-1/4 align-middle text-[10px]">¿Qué funcionó y qué no funcionó?</td>
                              <td className="border border-black p-2 text-center w-1/4 align-middle text-[10px]">Otras observaciones</td>
                            </tr>
                            <tr>
                              <td className="border border-black p-2 align-top min-h-[60px] text-justify">
                                {isEditing ? <AiEditableTextarea value={planBase.alignmentReflection || ""} onChange={value => handlePlanChange('alignmentReflection', value)} field="Alineación del proceso" context={aiContext} className="w-full h-20 bg-yellow-50 outline-none resize-none" /> : <div className="whitespace-pre-wrap">{planBase.alignmentReflection}</div>}
                              </td>
                              <td className="border border-black p-2 align-top min-h-[60px] text-justify">
                                {isEditing ? <AiEditableTextarea value={planBase.curricularAdjustments || ""} onChange={value => handlePlanChange('curricularAdjustments', value)} field="Ajustes curriculares" context={aiContext} className="w-full h-20 bg-yellow-50 outline-none resize-none" /> : <div className="whitespace-pre-wrap">{planBase.curricularAdjustments}</div>}
                              </td>
                              <td className="border border-black p-2 align-top min-h-[60px] text-justify">
                                {isEditing ? <AiEditableTextarea value={planBase.classEvaluation || ""} onChange={value => handlePlanChange('classEvaluation', value)} field="Evaluación de la clase" context={aiContext} className="w-full h-20 bg-yellow-50 outline-none resize-none" /> : <div className="whitespace-pre-wrap">{planBase.classEvaluation}</div>}
                              </td>
                              <td className="border border-black p-2 align-top min-h-[60px] text-justify">
                                {isEditing ? <AiEditableTextarea value={planBase.otherObservations || ""} onChange={value => handlePlanChange('otherObservations', value)} field="Otras observaciones" context={aiContext} className="w-full h-20 bg-yellow-50 outline-none resize-none" /> : <div className="whitespace-pre-wrap">{planBase.otherObservations}</div>}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <table className="w-full border-collapse border border-t-0 border-black text-xs mb-2">
                          <tbody>
                            <tr>
                              <td rowSpan={2} className="border border-black p-2 w-1/2 text-center align-middle h-24">
                                <span className="font-bold text-sm">Elaborado por:</span>
                                {isEditing ? <input value={teacherName} onChange={e => handlePlanChange('teacherName', e.target.value)} className="ml-2 bg-yellow-50 outline-none border-b border-yellow-300 w-1/2 text-center uppercase" /> : <span className="uppercase ml-2 text-sm">{teacherName}</span>}
                              </td>
                              <td className="border border-black p-2 w-1/2 align-top h-20">
                                <div className="font-bold text-sm">Aprobado:</div>
                                <div className="text-center mt-2">
                                  <div className="uppercase text-sm mb-1">{isEditing ? <input value={coordinatorName} onChange={e => handlePlanChange('coordinatorName', e.target.value)} className="w-3/4 bg-yellow-50 outline-none text-center border-b border-yellow-300" /> : coordinatorName}</div>
                                  <div className="w-3/4 mx-auto border-t border-black text-center pt-1 text-[12px]">Coordinador/a de área</div>
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-black p-2 pl-2">
                                <span className="font-bold text-sm">Fecha de aprobación:</span> <span className="text-sm ml-1">{dates.aprobacion}</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <div className="text-center text-[11px] mt-1 font-bold">V-{template?.version || "21"}-11/2025</div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
