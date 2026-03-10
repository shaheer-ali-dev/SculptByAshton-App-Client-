import useProgramStore, { Program } from "@/store/useProgramStore";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

/* ─── Types ──────────────────────────────────────────────── */
type Client = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  name?: string;
  avatar?: string;
};
type SetTemplate  = { reps: number; weight?: number; note_client?: string; note_coach?: string };
type RepGroup     = { sets: SetTemplate[] };
type ExerciseNested = { name: string; repGroups: RepGroup[]; _id?: string };

/* ─── Palette (matches CRM / habits) ─────────────────────── */
const WHITE   = "#ffffff";
const BLACK   = "#111111";
const GRAY100 = "#f5f5f5";
const GRAY200 = "#ebebeb";
const GRAY300 = "#d4d4d4";
const GRAY500 = "#737373";
const BASE_URL = "http://sculptbyashton.com:5000";

/* ─── Helpers ────────────────────────────────────────────── */
const clientName = (c: Client) =>
  (c.firstName && c.lastName ? `${c.firstName} ${c.lastName}` : c.name || c.email || "Unknown");

const avatarUri = (c: Client) => {
  if (!c?.avatar) return null; // no avatar → return null

  // if avatar is full URL, use it; otherwise prepend BASE_URL
  return c.avatar.startsWith("http") ? c.avatar : `${BASE_URL}${c.avatar}`;
};
function InitialsAvatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0] || "").slice(0, 2).join("").toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: BLACK, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: WHITE, fontSize: size * 0.36, fontWeight: "700" }}>{initials || "?"}</Text>
    </View>
  );
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     "#d1fae5",
  intermediate: "#fef9c3",
  advanced:     "#fee2e2",
};
const DIFFICULTY_TEXT: Record<string, string> = {
  beginner:     "#065f46",
  intermediate: "#92400e",
  advanced:     "#991b1b",
};

/* ════════════════════════════════════════════════════════════
   MAIN SCREEN
════════════════════════════════════════════════════════════ */
export default function CoachProgramsScreen() {
  const clients          = useProgramStore(s => s.clients);
  const getClients       = useProgramStore(s => s.getClients);
  const getCoachPrograms = useProgramStore(s => s.getCoachPrograms);
  const programs         = useProgramStore(s => s.programs);
  const loading          = useProgramStore(s => s.loading);
  const createProgram    = useProgramStore(s => s.createProgram);
  const updateProgram    = useProgramStore(s => s.updateProgram);
  const deleteProgram    = useProgramStore(s => s.deleteProgram);
  const getCoachProgress = useProgramStore(s => s.getCoachProgress);
  const progress         = useProgramStore(s => s.progress);

  /* ── view state ── */
  const [view, setView]                 = useState<"clients" | "programs" | "detail">("clients");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);

  /* ── search ── */
  const [clientSearch, setClientSearch] = useState("");

  /* ── modals ── */
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [pickerSearch, setPickerSearch]         = useState("");

  /* ── form state ── */
  const [editingProgramId, setEditingProgramId]         = useState<string | null>(null);
  const [title, setTitle]                               = useState("");
  const [description, setDescription]                   = useState("");
  const [difficulty, setDifficulty]                     = useState<"beginner"|"intermediate"|"advanced">("beginner");
  const [durationWeeks, setDurationWeeks]               = useState("4");
  const [exercises, setExercises]                       = useState<ExerciseNested[]>([]);
  const [selectedClientsForProgram, setSelectedClientsForProgram] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      await getClients();
      await getCoachPrograms();
      await getCoachProgress();
    })();
  }, []);

  /* ── derived ── */
  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    return q
      ? (clients as Client[]).filter(c => clientName(c).toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q))
      : clients as Client[];
  }, [clients, clientSearch]);

  const pickerClients = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return q
      ? (clients as Client[]).filter(c => clientName(c).toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q))
      : clients as Client[];
  }, [clients, pickerSearch]);

  const programsForClient = useMemo(() => {
    if (!selectedClient) return [];
    return programs.filter((p: any) =>
      (p.enrolledClients || []).some((id: any) => String(id) === String(selectedClient._id))
    );
  }, [programs, selectedClient]);

  const selectedProgress = useMemo(() => {
    if (!selectedClient || !selectedProgram) return null;
    return progress.find((p: any) =>
      (p.program === selectedProgram._id || p.program?._id === selectedProgram._id) &&
      (p.user === selectedClient._id || p.user?._id === selectedClient._id)
    );
  }, [progress, selectedClient, selectedProgram]);

  /* ── form helpers ── */
  const resetForm = () => {
    setEditingProgramId(null); setTitle(""); setDescription("");
    setDifficulty("beginner"); setDurationWeeks("4");
    setExercises([]); setSelectedClientsForProgram([]);
  };

  const openCreate = () => {
    resetForm();
    if (selectedClient) setSelectedClientsForProgram([selectedClient._id]);
    setShowProgramForm(true);
  };

  const openEdit = (p: Program) => {
    setEditingProgramId(p._id);
    setTitle(p.title || "");
    setDescription(p.description || "");
    setDifficulty(p.difficulty || "beginner");
    setDurationWeeks(String(p.durationWeeks || 4));
    setExercises((p.exercises || []).map((e: any) => ({
      name: e.name || "",
      repGroups: [{ sets: (e.sets || []).map((s: any) => ({ reps: Number(s.reps)||0, weight: Number(s.weight)||0, note_client: s.note_client||"", note_coach: s.note_coach||"" })) }],
      _id: e._id,
    })));
    setSelectedClientsForProgram((p as any).enrolledClients ? [...(p as any).enrolledClients] : []);
    setShowProgramForm(true);
  };

  /* ── exercise helpers ── */
  const addExercise = () =>
    setExercises(p => [...p, { name: "", repGroups: [{ sets: [{ reps: 10, weight: 0, note_client: "", note_coach: "" }] }] }]);

  const removeExercise = (i: number) => setExercises(p => p.filter((_, idx) => idx !== i));

  const updateExerciseName = (i: number, name: string) =>
    setExercises(p => p.map((ex, idx) => idx === i ? { ...ex, name } : ex));

  const addSet = (ei: number, rgi: number) =>
    setExercises(p => p.map((ex, i) => i !== ei ? ex : {
      ...ex,
      repGroups: ex.repGroups.map((rg, ri) => ri !== rgi ? rg : {
        sets: [...rg.sets, { reps: 10, weight: 0, note_client: "", note_coach: "" }],
      }),
    }));

  const updateSetField = (ei: number, rgi: number, si: number, field: keyof SetTemplate, val: string) =>
    setExercises(p => p.map((ex, i) => i !== ei ? ex : {
      ...ex,
      repGroups: ex.repGroups.map((rg, ri) => ri !== rgi ? rg : {
        sets: rg.sets.map((s, idx) => idx !== si ? s : {
          ...s,
          ...(field === "reps"   ? { reps:   isNaN(parseInt(val))   ? 0 : parseInt(val)   } :
              field === "weight" ? { weight: isNaN(parseFloat(val)) ? 0 : parseFloat(val) } :
              { [field]: val }),
        }),
      }),
    }));

  const transformExercises = (nested: ExerciseNested[]) =>
    nested.map(ex => ({
      name: ex.name, _id: ex._id,
      sets: ex.repGroups.flatMap(rg => rg.sets.map(s => ({
        reps: Number.isFinite(Number(s.reps)) ? Number(s.reps) : 0,
        weight: Number.isFinite(Number(s.weight)) ? Number(s.weight) : 0,
        note_client: s.note_client ?? "",
        note_coach:  s.note_coach  ?? "",
      }))),
    }));

  const handleSave = async () => {
    if (!title.trim())                         return Alert.alert("Missing title", "Enter a program title.");
    if (exercises.length === 0)                return Alert.alert("No exercises", "Add at least one exercise.");
    if (selectedClientsForProgram.length === 0) return Alert.alert("No clients", "Assign at least one client.");
    const form = new FormData();
    form.append("title", title);
    form.append("description", description);
    form.append("difficulty", difficulty);
    form.append("durationWeeks", durationWeeks);
    form.append("exercises", JSON.stringify(transformExercises(exercises)));
    form.append("enrolledClients", JSON.stringify(selectedClientsForProgram));
    try {
      if (editingProgramId) { await updateProgram(editingProgramId, form); Alert.alert("Saved", "Program updated."); }
      else                  { await createProgram(form);                    Alert.alert("Created", "Program created."); }
      setShowProgramForm(false); resetForm();
      await getCoachPrograms();
    } catch { Alert.alert("Error", "Failed to save program."); }
  };

  const handleDelete = (programId: string) =>
    Alert.alert("Delete Program", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await deleteProgram(programId);
          await getCoachPrograms();
          if (selectedProgram?._id === programId) { setSelectedProgram(null); setView("programs"); }
        } catch { Alert.alert("Error", "Failed to delete."); }
      }},
    ]);

  /* ── Navigation ── */
  const openClient = (c: Client) => { setSelectedClient(c); setSelectedProgram(null); setView("programs"); };
  const openProgram = (p: Program) => { setSelectedProgram(p); setView("detail"); };
  const goBack = () => {
    if (view === "detail")   { setSelectedProgram(null); setView("programs"); }
    else if (view === "programs") { setSelectedClient(null); setView("clients"); }
  };

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */
  return (
    <LinearGradient
      colors={["#000000", "#555555", "#ffffff"]}
locations={[0, 0.5, 1]}
start={{x:0.5, y:0}}
end={{x:0.5, y:1}}
      style={s.container}
    >
      <SafeAreaView style={s.safe}>

        {/* ══════════════════════ CLIENT LIST ══════════════════════ */}
        {view === "clients" && (
          <>
            <View style={s.topBar}>
              <Text style={s.pageTitle}>Programs</Text>
              <View style={s.topBadge}>
                <Text style={s.topBadgeText}>{(clients as Client[]).length} clients</Text>
              </View>
            </View>

            <View style={s.searchWrap}>
              <View style={s.searchBox}>
                <Text style={s.searchIcon}>🔍</Text>
                <TextInput
                  style={s.searchInput}
                  placeholder="Search clients…"
                  placeholderTextColor="#bbb"
                  value={clientSearch}
                  onChangeText={setClientSearch}
                  clearButtonMode="while-editing"
                />
              </View>
            </View>

            <Text style={s.listSectionLabel}>All Clients</Text>

            {loading && (clients as Client[]).length === 0 ? (
              <View style={s.loadingWrap}>
                <ActivityIndicator size="large" color={BLACK} />
                <Text style={s.loadingText}>Loading clients…</Text>
              </View>
            ) : (
              <FlatList
                data={filteredClients}
                keyExtractor={c => c._id}
                contentContainerStyle={s.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={s.emptyWrap}>
                    <Text style={s.emptyEmoji}>👤</Text>
                    <Text style={s.emptyHint}>No clients found</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const count = programs.filter((p: any) =>
                    (p.enrolledClients || []).some((id: any) => String(id) === String(item._id))
                  ).length;
                  return (
                    <TouchableOpacity style={s.clientCard} activeOpacity={0.85} onPress={() => openClient(item)}>
                      <Image source={{ uri: avatarUri(item) }} style={s.clientAvatar} />
                      <View style={s.clientCardInfo}>
                        <Text style={s.clientCardName}>{clientName(item)}</Text>
                        {item.email ? <Text style={s.clientCardEmail}>{item.email}</Text> : null}
                        <View style={s.clientCardMeta}>
                          <View style={s.countBadge}>
                            <Text style={s.countBadgeText}>{count} program{count !== 1 ? "s" : ""}</Text>
                          </View>
                        </View>
                      </View>
                      <ChevronRight size={18} color={GRAY300} />
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </>
        )}

        {/* ══════════════════════ PROGRAMS LIST ══════════════════════ */}
        {view === "programs" && selectedClient && (
          <>
            <View style={s.topBar}>
              <TouchableOpacity style={s.backBtn} onPress={goBack}>
                <ArrowLeft size={20} color={BLACK} />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.subPageTitle}>{clientName(selectedClient)}</Text>
                <Text style={s.subPageSub}>Programs</Text>
              </View>
              <TouchableOpacity style={s.addBtn} onPress={openCreate}>
                <Plus size={18} color={WHITE} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={s.scroll}
              contentContainerStyle={s.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {loading && (
                <View style={{ paddingVertical: 20, alignItems: "center" }}>
                  <ActivityIndicator color={BLACK} />
                </View>
              )}

              {programsForClient.length === 0 && !loading ? (
                <View style={s.emptyWrap}>
                  <Text style={s.emptyEmoji}>📋</Text>
                  <Text style={s.emptyHint}>No programs assigned yet</Text>
                  <TouchableOpacity
                    style={[s.addBtn, { marginTop: 16, width: "auto", paddingHorizontal: 24, borderRadius: 14, height: 46 }]}
                    onPress={openCreate}
                  >
                    <Text style={{ color: WHITE, fontWeight: "700", fontSize: 14 }}>+ Create First Program</Text>
                  </TouchableOpacity>
                </View>
              ) : programsForClient.map((p: any) => (
                <TouchableOpacity key={p._id} style={s.programCard} activeOpacity={0.88} onPress={() => openProgram(p)}>
                  <View style={s.programCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.programCardTitle}>{p.title}</Text>
                      {p.description ? <Text style={s.programCardDesc} numberOfLines={2}>{p.description}</Text> : null}
                    </View>
                    <ChevronRight size={18} color={GRAY300} />
                  </View>
                  <View style={s.programCardMeta}>
                    <View style={[s.diffBadge, { backgroundColor: DIFFICULTY_COLORS[p.difficulty] || GRAY100 }]}>
                      <Text style={[s.diffBadgeText, { color: DIFFICULTY_TEXT[p.difficulty] || GRAY500 }]}>
                        {p.difficulty}
                      </Text>
                    </View>
                    {p.durationWeeks ? (
                      <View style={s.metaChip}>
                        <Text style={s.metaChipText}>📅 {p.durationWeeks} weeks</Text>
                      </View>
                    ) : null}
                    <View style={s.metaChip}>
                      <Text style={s.metaChipText}>💪 {(p.exercises || []).length} exercises</Text>
                    </View>
                  </View>
                  <View style={s.programCardActions}>
                    <TouchableOpacity style={s.editBtn} onPress={() => openEdit(p)}>
                      <Pencil size={13} color={BLACK} />
                      <Text style={s.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(p._id)}>
                      <Trash2 size={13} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}

              <View style={{ height: 60 }} />
            </ScrollView>
          </>
        )}

        {/* ══════════════════════ PROGRAM DETAIL ══════════════════════ */}
        {view === "detail" && selectedProgram && (
          <>
            <View style={s.topBar}>
              <TouchableOpacity style={s.backBtn} onPress={goBack}>
                <ArrowLeft size={20} color={BLACK} />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.subPageTitle}>{selectedProgram.title}</Text>
                <Text style={s.subPageSub}>{selectedClient ? clientName(selectedClient) : ""}</Text>
              </View>
              <TouchableOpacity style={s.editBtnSm} onPress={() => openEdit(selectedProgram)}>
                <Pencil size={14} color={BLACK} />
                <Text style={s.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={s.scroll}
              contentContainerStyle={s.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Info card */}
              <View style={s.detailInfoCard}>
                <View style={s.detailInfoRow}>
                  <View style={[s.diffBadge, { backgroundColor: DIFFICULTY_COLORS[selectedProgram.difficulty] || GRAY100 }]}>
                    <Text style={[s.diffBadgeText, { color: DIFFICULTY_TEXT[selectedProgram.difficulty] || GRAY500 }]}>
                      {selectedProgram.difficulty}
                    </Text>
                  </View>
                  {selectedProgram.durationWeeks ? (
                    <View style={s.metaChip}><Text style={s.metaChipText}>📅 {selectedProgram.durationWeeks} weeks</Text></View>
                  ) : null}
                  <View style={s.metaChip}><Text style={s.metaChipText}>💪 {(selectedProgram.exercises||[]).length} exercises</Text></View>
                </View>
                {selectedProgram.description ? (
                  <Text style={s.detailDesc}>{selectedProgram.description}</Text>
                ) : null}
              </View>

              {/* Progress card */}
              {selectedProgress && (
                <View style={s.progressCard}>
                  <Text style={s.progressTitle}>Client Progress</Text>
                  {(selectedProgress as any).exercises?.map((ex: any, ei: number) => {
                    const exName = ex.exerciseId?.name || ex.name || "Exercise";
                    const sets   = ex.sets || [];
                    const done   = sets.filter((s: any) => s.completed).length;
                    return (
                      <View key={ei} style={s.progressExRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.progressExName}>{exName}</Text>
                          <Text style={s.progressExSub}>{done}/{sets.length} sets completed</Text>
                        </View>
                        <View style={[s.progressPill, { backgroundColor: done === sets.length && sets.length > 0 ? "#d1fae5" : GRAY100 }]}>
                          <Text style={[s.progressPillText, { color: done === sets.length && sets.length > 0 ? "#065f46" : GRAY500 }]}>
                            {sets.length > 0 ? `${Math.round(done/sets.length*100)}%` : "—"}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                  {!(selectedProgress as any).exercises?.length && (
                    <Text style={s.progressEmpty}>No progress logged yet.</Text>
                  )}
                </View>
              )}

              {/* Exercises */}
              <Text style={[s.listSectionLabel, { paddingHorizontal: 0, marginBottom: 10 }]}>Exercises</Text>
              {(selectedProgram.exercises || []).map((ex: any, i: number) => (
                <View key={i} style={s.exerciseCard}>
                  <View style={s.exerciseCardHeader}>
                    <View style={s.exerciseNumBadge}><Text style={s.exerciseNum}>{i + 1}</Text></View>
                    <Text style={s.exerciseName}>{ex.name}</Text>
                  </View>
                  <View style={s.setsTable}>
                    <View style={s.setsTableHeader}>
                      {["Set", "Reps", "Weight", "Client note", "Coach note"].map(h => (
                        <Text key={h} style={s.setsTableHeaderText}>{h}</Text>
                      ))}
                    </View>
                    {(ex.sets || []).map((s_: any, si: number) => (
                      <View key={si} style={[s.setsTableRow, si % 2 === 1 && { backgroundColor: "#fafafa" }]}>
                        <Text style={s.setsTableCell}>{si + 1}</Text>
                        <Text style={s.setsTableCell}>{s_.reps}</Text>
                        <Text style={s.setsTableCell}>{s_.weight ?? 0} lbs</Text>
                        <Text style={[s.setsTableCell, { flex: 2 }]}>{s_.note_client || "—"}</Text>
                        <Text style={[s.setsTableCell, { flex: 2 }]}>{s_.note_coach  || "—"}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              <View style={{ height: 60 }} />
            </ScrollView>
          </>
        )}

        {/* ══════════════════════ PROGRAM FORM MODAL ══════════════════════ */}
        <Modal visible={showProgramForm} animationType="slide">
          <LinearGradient
            colors={["#000000", "#555555", "#ffffff"]}
locations={[0, 0.5, 1]}
start={{x:0.5, y:0}}
end={{x:0.5, y:1}}
            style={s.container}
          >
            <SafeAreaView style={s.safe}>
              <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>

                <View style={s.modalHeader}>
                  <TouchableOpacity style={s.backBtn} onPress={() => { setShowProgramForm(false); resetForm(); }}>
                    <X size={20} color={BLACK} />
                  </TouchableOpacity>
                  <Text style={s.modalTitle}>{editingProgramId ? "Edit Program" : "Create Program"}</Text>
                  <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={s.modalContent} showsVerticalScrollIndicator={false}>

                  {/* Assign clients */}
                  <View style={s.formCard}>
                    <Text style={s.cardSectionLabel}>Assign Clients</Text>
                    <TouchableOpacity style={s.clientPickerBtn} onPress={() => setShowClientPicker(true)}>
                      <Text style={s.clientPickerBtnText}>
                        {selectedClientsForProgram.length === 0
                          ? "Tap to select clients…"
                          : `${selectedClientsForProgram.length} client${selectedClientsForProgram.length !== 1 ? "s" : ""} selected`}
                      </Text>
                      <ChevronRight size={16} color={GRAY500} />
                    </TouchableOpacity>
                  </View>

                  {/* Details */}
                  <View style={[s.formCard, { marginTop: 12 }]}>
                    <Text style={s.cardSectionLabel}>Program Details</Text>
                    <FLabel label="Title">
                      <TextInput style={f.input} value={title} onChangeText={setTitle} placeholder="e.g. 8-Week Strength Block" placeholderTextColor="#bbb" />
                    </FLabel>
                    <FLabel label="Description">
                      <TextInput style={[f.input, { height: 80, textAlignVertical: "top", paddingTop: 10 }]} value={description} onChangeText={setDescription} placeholder="Optional notes…" placeholderTextColor="#bbb" multiline />
                    </FLabel>
                    <FLabel label="Duration (weeks)">
                      <TextInput style={[f.input, { width: 120 }]} value={durationWeeks} onChangeText={setDurationWeeks} keyboardType="numeric" placeholder="4" placeholderTextColor="#bbb" />
                    </FLabel>
                    <FLabel label="Difficulty">
                      <View style={f.chipRow}>
                        {(["beginner", "intermediate", "advanced"] as const).map(d => (
                          <TouchableOpacity
                            key={d}
                            style={[f.diffChip, difficulty === d && f.diffChipOn]}
                            onPress={() => setDifficulty(d)}
                          >
                            <Text style={[f.diffChipText, difficulty === d && f.diffChipTextOn]}>{d}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </FLabel>
                  </View>

                  {/* Exercises */}
                  <Text style={[s.listSectionLabel, { paddingHorizontal: 0, marginTop: 20, marginBottom: 10 }]}>Exercises</Text>

                  {exercises.map((ex, ei) => (
                    <View key={ei} style={[s.formCard, { marginBottom: 10 }]}>
                      <View style={s.exFormHeader}>
                        <View style={s.exerciseNumBadge}><Text style={s.exerciseNum}>{ei + 1}</Text></View>
                        <TextInput
                          style={[f.input, { flex: 1, marginBottom: 0 }]}
                          value={ex.name}
                          onChangeText={t => updateExerciseName(ei, t)}
                          placeholder="Exercise name"
                          placeholderTextColor="#bbb"
                        />
                        <TouchableOpacity style={s.exDeleteBtn} onPress={() => removeExercise(ei)}>
                          <Trash2 size={15} color="#ef4444" />
                        </TouchableOpacity>
                      </View>

                      {ex.repGroups.map((rg, rgi) => (
                        <View key={rgi} style={s.repGroup}>
                          {rg.sets.map((set, si) => (
                            <View key={si} style={s.setRow}>
                              <Text style={s.setLabel}>Set {si + 1}</Text>
                              <View style={{ flex: 1 }}>
                                <View style={s.setInputRow}>
                                  <View style={s.setInputWrap}>
                                    <Text style={f.miniLabel}>Reps</Text>
                                    <TextInput style={f.miniInput} value={String(set.reps)} keyboardType="numeric" onChangeText={v => updateSetField(ei, rgi, si, "reps", v)} placeholderTextColor="#bbb" />
                                  </View>
                                  <View style={s.setInputWrap}>
                                    <Text style={f.miniLabel}>Weight (lbs)</Text>
                                    <TextInput style={f.miniInput} value={String(set.weight ?? 0)} keyboardType="numeric" onChangeText={v => updateSetField(ei, rgi, si, "weight", v)} placeholderTextColor="#bbb" />
                                  </View>
                                </View>
                                <View style={s.setInputRow}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={f.miniLabel}>Client note</Text>
                                    <TextInput style={f.miniInput} value={set.note_client} onChangeText={v => updateSetField(ei, rgi, si, "note_client", v)} placeholder="Optional" placeholderTextColor="#bbb" />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={f.miniLabel}>Coach note</Text>
                                    <TextInput style={f.miniInput} value={set.note_coach} onChangeText={v => updateSetField(ei, rgi, si, "note_coach", v)} placeholder="Optional" placeholderTextColor="#bbb" />
                                  </View>
                                </View>
                              </View>
                            </View>
                          ))}
                          <TouchableOpacity style={s.addSetBtn} onPress={() => addSet(ei, rgi)}>
                            <Plus size={13} color={GRAY500} />
                            <Text style={s.addSetBtnText}>Add set</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ))}

                  <TouchableOpacity style={s.addExerciseBtn} onPress={addExercise}>
                    <Plus size={16} color={BLACK} />
                    <Text style={s.addExerciseBtnText}>Add Exercise</Text>
                  </TouchableOpacity>

                  {/* Save */}
                  <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                    <Text style={s.saveBtnText}>{editingProgramId ? "Update Program" : "Create Program"}</Text>
                  </TouchableOpacity>

                  <View style={{ height: 60 }} />
                </ScrollView>
              </KeyboardAvoidingView>
            </SafeAreaView>
          </LinearGradient>
        </Modal>

        {/* ══════════════════════ CLIENT PICKER MODAL ══════════════════════ */}
        <Modal visible={showClientPicker} animationType="slide" transparent>
          <View style={m.overlay}>
            <View style={[m.sheet, { maxHeight: "85%" }]}>
              <View style={m.header}>
                <Text style={m.headerTitle}>Select Clients</Text>
                <TouchableOpacity style={m.closeBtn} onPress={() => { setShowClientPicker(false); setPickerSearch(""); }}>
                  <X size={16} color={BLACK} />
                </TouchableOpacity>
              </View>

              <View style={m.searchBox}>
                <Text style={m.searchIcon}>🔍</Text>
                <TextInput
                  style={m.searchInput}
                  placeholder="Search by name or email…"
                  placeholderTextColor="#bbb"
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                />
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {pickerClients.map((c: Client) => {
                  const sel = selectedClientsForProgram.includes(c._id);
                  return (
                    <TouchableOpacity
                      key={c._id}
                      style={[m.clientRow, sel && m.clientRowActive]}
                      onPress={() =>
                        setSelectedClientsForProgram(prev =>
                          prev.includes(c._id) ? prev.filter(x => x !== c._id) : [...prev, c._id]
                        )
                      }
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: avatarUri(c) }} style={m.clientAvatar} />
                      <View style={{ flex: 1 }}>
                        <Text style={m.clientName}>{clientName(c)}</Text>
                        <Text style={m.clientEmail}>{c.email}</Text>
                      </View>
                      <View style={[m.checkCircle, sel && m.checkCircleOn]}>
                        {sel && <Text style={{ color: WHITE, fontWeight: "800", fontSize: 12 }}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <View style={{ height: 30 }} />
              </ScrollView>

              <TouchableOpacity style={m.doneBtn} onPress={() => { setShowClientPicker(false); setPickerSearch(""); }}>
                <Text style={m.doneBtnText}>Done — {selectedClientsForProgram.length} selected</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </LinearGradient>
  );
}

/* ─── Small helpers ──────────────────────────────────────── */
function FLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={f.label}>{label}</Text>
      {children}
    </View>
  );
}

/* ════════════════════════════════════════════════════════════
   STYLES
════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
  container:   { flex: 1 },
  safe:        { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: GRAY500 },

  /* TOP BAR */
  topBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8,
  },
  pageTitle:    { flex: 1, fontSize: 28, fontWeight: "800", color: BLACK, letterSpacing: -0.5, fontFamily: "System" },
  topBadge:     { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: GRAY200 },
  topBadgeText: { fontSize: 12, fontWeight: "700", color: GRAY500 },
  backBtn:      { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: GRAY200 },
  subPageTitle: { fontSize: 18, fontWeight: "800", color: BLACK, fontFamily: "System" },
  subPageSub:   { fontSize: 12, color: GRAY500, marginTop: 1, fontFamily: "System" },
  addBtn:       { width: 40, height: 40, borderRadius: 12, backgroundColor: BLACK, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 8, elevation: 4 },

  /* SEARCH */
  searchWrap: { paddingHorizontal: 16, marginBottom: 8 },
  searchBox:  { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: GRAY200, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput:{ flex: 1, paddingVertical: 12, fontSize: 15, color: BLACK, fontFamily: "System" },

  listSectionLabel: { fontSize: 11, fontWeight: "700", color: GRAY500, textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: 16, marginBottom: 8, fontFamily: "System" },
  listContent:      { paddingHorizontal: 16, paddingBottom: 40 },

  /* CLIENT CARD */
  clientCard:      { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, elevation: 2, gap: 12 },
  clientAvatar:    { width: 48, height: 48, borderRadius: 24, backgroundColor: GRAY100 },
  clientCardInfo:  { flex: 1 },
  clientCardName:  { fontSize: 16, fontWeight: "700", color: BLACK, fontFamily: "System" },
  clientCardEmail: { fontSize: 13, color: GRAY500, marginTop: 2, fontFamily: "System" },
  clientCardMeta:  { flexDirection: "row", marginTop: 6 },
  countBadge:      { backgroundColor: GRAY100, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: GRAY200 },
  countBadgeText:  { fontSize: 11, fontWeight: "700", color: GRAY500 },

  /* EMPTY */
  emptyWrap:  { paddingTop: 80, alignItems: "center", gap: 6 },
  emptyEmoji: { fontSize: 44, marginBottom: 4 },
  emptyHint:  { fontSize: 15, color: GRAY500, fontFamily: "System" },

  /* SCROLL */
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  /* PROGRAM CARD */
  programCard:       { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  programCardTop:    { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 10 },
  programCardTitle:  { fontSize: 17, fontWeight: "800", color: BLACK, fontFamily: "Lato-Regular", flex: 1 },
  programCardDesc:   { fontSize: 13, color: GRAY500, marginTop: 4, fontFamily: "System" },
  programCardMeta:   { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  programCardActions:{ flexDirection: "row", gap: 8, alignItems: "center" },

  diffBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  diffBadgeText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  metaChip:      { backgroundColor: GRAY100, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: GRAY200 },
  metaChipText:  { fontSize: 12, color: GRAY500, fontWeight: "600" },

  editBtn:    { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: GRAY100, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: GRAY200 },
  editBtnSm:  { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.92)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: GRAY200 },
  editBtnText:{ fontSize: 13, fontWeight: "700", color: BLACK },
  deleteBtn:  { backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 8, padding: 7, borderWidth: 1, borderColor: "rgba(239,68,68,0.15)" },

  /* DETAIL */
  detailInfoCard: { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  detailInfoRow:  { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  detailDesc:     { fontSize: 14, color: GRAY500, lineHeight: 20, fontFamily: "System" },

  /* PROGRESS */
  progressCard:    { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  progressTitle:   { fontSize: 15, fontWeight: "800", color: BLACK, marginBottom: 12, fontFamily: "System" },
  progressExRow:   { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: GRAY200 },
  progressExName:  { fontSize: 14, fontWeight: "700", color: BLACK, fontFamily: "System" },
  progressExSub:   { fontSize: 12, color: GRAY500, marginTop: 2 },
  progressPill:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  progressPillText:{ fontSize: 12, fontWeight: "700" },
  progressEmpty:   { color: GRAY500, fontSize: 13, fontStyle: "italic", paddingVertical: 8 },

  /* EXERCISE CARD */
  exerciseCard:       { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 18, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  exerciseCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  exerciseNumBadge:   { width: 28, height: 28, borderRadius: 14, backgroundColor: BLACK, alignItems: "center", justifyContent: "center" },
  exerciseNum:        { color: WHITE, fontWeight: "800", fontSize: 13 },
  exerciseName:       { fontSize: 16, fontWeight: "700", color: BLACK, fontFamily: "System" },

  setsTable:           { borderWidth: 1, borderColor: GRAY200, borderRadius: 10, overflow: "hidden" },
  setsTableHeader:     { flexDirection: "row", backgroundColor: GRAY100, paddingVertical: 8, paddingHorizontal: 10 },
  setsTableHeaderText: { flex: 1, fontSize: 10, fontWeight: "800", color: GRAY500, textTransform: "uppercase", letterSpacing: 0.3 },
  setsTableRow:        { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: GRAY200, backgroundColor: WHITE },
  setsTableCell:       { flex: 1, fontSize: 13, color: BLACK, fontFamily: "System" },

  /* MODAL */
  modalHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: GRAY200 },
  modalTitle:   { fontSize: 17, fontWeight: "700", color: BLACK, fontFamily: "Lato-Regular", flex: 1, textAlign: "center" },
  modalContent: { paddingHorizontal: 16, paddingTop: 16 },

  /* FORM CARD */
  formCard:        { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 18, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  cardSectionLabel:{ fontSize: 11, fontWeight: "700", color: GRAY500, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 14, fontFamily: "System" },

  clientPickerBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: GRAY100, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderColor: GRAY200 },
  clientPickerBtnText: { fontSize: 14, color: GRAY500, fontFamily: "System" },

  /* EXERCISE FORM */
  exFormHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  exDeleteBtn:  { backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 8, padding: 7, borderWidth: 1, borderColor: "rgba(239,68,68,0.15)" },

  repGroup: { backgroundColor: GRAY100, borderRadius: 12, padding: 12, marginTop: 4, borderWidth: 1, borderColor: GRAY200 },
  setRow:   { flexDirection: "row", gap: 10, marginBottom: 10, alignItems: "flex-start" },
  setLabel: { fontSize: 11, fontWeight: "700", color: GRAY500, marginTop: 22, width: 36, textAlign: "center" },
  setInputRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  setInputWrap:{ flex: 1 },

  addSetBtn:     { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, backgroundColor: WHITE, borderRadius: 8, borderWidth: 1, borderColor: GRAY200, marginTop: 4 },
  addSetBtnText: { fontSize: 12, color: GRAY500, fontWeight: "600" },

  addExerciseBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: GRAY200, marginTop: 4, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  addExerciseBtnText: { fontSize: 15, fontWeight: "700", color: BLACK, fontFamily: "System" },

  saveBtn:     { backgroundColor: BLACK, paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 16, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 8, elevation: 4 },
  saveBtnText: { color: WHITE, fontWeight: "800", fontSize: 16, fontFamily: "System" },
});

/* ─── Modal styles ───────────────────────────────────────── */
const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:   { backgroundColor: WHITE, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, maxHeight: "85%" },
  header:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: BLACK, fontFamily: "System" },
  closeBtn:    { width: 34, height: 34, borderRadius: 17, backgroundColor: GRAY100, justifyContent: "center", alignItems: "center" },

  searchBox:   { flexDirection: "row", alignItems: "center", backgroundColor: GRAY100, borderRadius: 12, paddingHorizontal: 12, marginBottom: 14, borderWidth: 1, borderColor: GRAY200 },
  searchIcon:  { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 15, color: BLACK, fontFamily: "System" },

  clientRow:       { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  clientRowActive: { backgroundColor: "#fafafa" },
  clientAvatar:    { width: 46, height: 46, borderRadius: 23, backgroundColor: GRAY100 },
  clientName:      { fontSize: 15, fontWeight: "700", color: BLACK, fontFamily: "System" },
  clientEmail:     { fontSize: 12, color: GRAY500, marginTop: 2 },
  checkCircle:     { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: GRAY200, alignItems: "center", justifyContent: "center" },
  checkCircleOn:   { backgroundColor: BLACK, borderColor: BLACK },

  doneBtn:     { backgroundColor: BLACK, paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 16 },
  doneBtnText: { color: WHITE, fontWeight: "800", fontSize: 15, fontFamily: "System" },
});

/* ─── Form field styles ──────────────────────────────────── */
const f = StyleSheet.create({
  label:     { fontSize: 11, fontWeight: "700", color: GRAY500, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, fontFamily: "System" },
  input:     { backgroundColor: GRAY100, color: BLACK, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: "Lato-Regular", borderWidth: 1, borderColor: GRAY200, marginBottom: 0 },
  miniLabel: { fontSize: 10, fontWeight: "700", color: GRAY500, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4, fontFamily: "System" },
  miniInput: { backgroundColor: WHITE, color: BLACK, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, fontFamily: "Lato-Regular", borderWidth: 1, borderColor: GRAY200 },
  chipRow:   { flexDirection: "row", gap: 8 },
  diffChip:  { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: GRAY100, borderWidth: 1, borderColor: GRAY200 },
  diffChipOn:     { backgroundColor: BLACK, borderColor: BLACK },
  diffChipText:   { fontSize: 12, fontWeight: "600", color: GRAY500, textTransform: "capitalize" },
  diffChipTextOn: { color: WHITE },
});
