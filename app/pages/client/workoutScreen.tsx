import useProgramStore, { Program } from "@/store/useProgramStore";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

const BASE_URL = "http://sculptbyashton.com:5000";

/* ─── types (unchanged) ──────────────────────────────────────── */
type LocalSet = {
  setIndex: number;
  plannedReps: number;
  weight: number;
  completed: boolean;
  note_client: string;
  note_coach: string;
};
type LocalExerciseProgress = {
  exerciseId: string;
  sets: LocalSet[];
};

/* ─── mini bar chart data (static week display) ─────────────── */
const WEEK_DAYS = ["M","T","W","T","F","S","S"];
const todayIdx  = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

/* ════════════════════════════════════════════════════════════ */
export default function ClientProgramsScreen() {
  const router = useRouter();

  /* ── Reactive dimensions ── */
  const { width } = useWindowDimensions();
  const isWide        = width >= 640;
  const maxW          = Math.min(width, 720);
  /* Program card: fixed 200 on wide, 60% screen on small */
  const programCardW  = isWide ? 220 : width * 0.60;

  /* ── Store selectors (ALL UNCHANGED) ── */
  const getClientPrograms    = useProgramStore(s => s.getClientPrograms);
  const getClientProgress    = useProgramStore(s => s.getClientProgress);
  const updateClientProgress = useProgramStore(s => s.updateClientProgress);
  const getClientDashboard   = useProgramStore(s => s.getClientDashboard);
  const storePrograms        = useProgramStore(s => s.programs);
  const progressList         = useProgramStore(s => s.progress);
  const loading              = useProgramStore(s => s.loading);

  const [localPrograms, setLocalPrograms]           = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId]   = useState<string | null>(null);
  const selectedProgram = useMemo(
    () => localPrograms.find(p => p._id === selectedProgramId) || null,
    [localPrograms, selectedProgramId]
  );

  const today      = new Date();
  const toYYYYMMDD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const date = toYYYYMMDD(today);

  const [localExercises, setLocalExercises] = useState<LocalExerciseProgress[]>([]);
  const [saving, setSaving] = useState(false);

  /* ── Load dashboard (UNCHANGED) ── */
  useEffect(() => {
    (async () => {
      try {
        const dash = await getClientDashboard();
        if (dash && Array.isArray((dash as any).programs) && (dash as any).programs.length > 0) {
          setLocalPrograms((dash as any).programs);
          return;
        }
        await getClientPrograms((storePrograms as any));
        if (storePrograms?.length > 0) setLocalPrograms(storePrograms);
      } catch {
        try {
          await getClientPrograms();
          if (storePrograms?.length > 0) setLocalPrograms(storePrograms);
        } catch (e) { console.error("Fallback failed", e); }
      }
    })();
  }, [getClientDashboard, getClientPrograms]);

  useEffect(() => {
    if (localPrograms?.length > 0 && !selectedProgramId)
      setSelectedProgramId(localPrograms[0]._id);
  }, [localPrograms, selectedProgramId]);

  useEffect(() => {
    if (!selectedProgramId) { setLocalExercises([]); return; }
    getClientProgress(selectedProgramId).catch(e => console.warn("Progress fetch failed", e));
  }, [selectedProgramId, getClientProgress]);

  useEffect(() => {
    if (!selectedProgramId) return;
    const existing = progressList.find(
      p => p.program === selectedProgramId || p.program?._id === selectedProgramId
    );
    if (existing) {
      setLocalExercises((existing.exercises || []).map((ex: any) => ({
        exerciseId: String(ex.exerciseId),
        sets: (ex.sets || []).map((s: any) => ({
          setIndex: s.setIndex, plannedReps: s.plannedReps,
          weight: s.weight ?? 0, completed: !!s.completed,
          note_client: s.note_client ?? "", note_coach: s.note_coach ?? "",
        })),
      })));
      return;
    }
    if (!selectedProgram) { setLocalExercises([]); return; }
    setLocalExercises((selectedProgram.exercises || []).map((ex: any) => ({
      exerciseId: String(ex._id),
      sets: (ex.sets || []).map((s: any, idx: number) => ({
        setIndex: idx, plannedReps: s.reps ?? 0, weight: 0,
        completed: false, note_client: "", note_coach: "",
      })),
    })));
  }, [progressList, selectedProgramId, date, selectedProgram]);

  /* ── Helpers (UNCHANGED) ── */
  const updateSet = (exerciseId: string, setIndex: number, patch: Partial<LocalSet>) =>
    setLocalExercises(prev =>
      prev.map(ex => ex.exerciseId !== exerciseId ? ex : {
        ...ex, sets: ex.sets.map(s => s.setIndex === setIndex ? { ...s, ...patch } : s)
      })
    );

  const toggleCompleted = (exerciseId: string, setIndex: number) => {
    const ex = localExercises.find(e => e.exerciseId === exerciseId);
    const s  = ex?.sets.find(x => x.setIndex === setIndex);
    if (s) updateSet(exerciseId, setIndex, { completed: !s.completed });
  };

  const handleSaveProgress = async () => {
    if (!selectedProgramId) return Alert.alert("Error","No program selected");
    const payloadExercises = localExercises.map(ex => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets.map(s => ({
        setIndex: s.setIndex, plannedReps: s.plannedReps,
        weight: s.weight, completed: s.completed,
        note_client: s.note_client, note_coach: s.note_coach,
      })),
    }));
    setSaving(true);
    try {
      const progressDoc = progressList.find(
        p => p.program === selectedProgramId || p.program?._id === selectedProgramId
      );
      if (!progressDoc?._id) return Alert.alert("Error","Progress document not found");
      await updateClientProgress(progressDoc._id, payloadExercises);
      Alert.alert("Saved ✓","Progress saved successfully");
      await getClientProgress(selectedProgramId);
    } catch { Alert.alert("Error","Failed to save progress"); }
    finally { setSaving(false); }
  };

  /* ── Renderers ── */
  const renderSet = (exerciseId: string, s: LocalSet) => (
    <View key={s.setIndex} style={[st.setRow, isWide && st.setRowWide]}>
      {/* Set label */}
      <View style={st.setMeta}>
        <Text style={st.setLabel}>Set {s.setIndex + 1}</Text>
        <Text style={st.setPlanned}>{s.plannedReps} reps</Text>
      </View>

      {/* Weight input */}
      <View style={st.inputWrap}>
        <TextInput
          style={st.setInput}
          keyboardType="numeric"
          value={String(s.weight ?? 0)}
          onChangeText={v => {
            const n = parseFloat(v || "0");
            updateSet(exerciseId, s.setIndex, { weight: isNaN(n) ? 0 : n });
          }}
          placeholder="lbs"
          placeholderTextColor="#bbb"
        />
        <Text>lbs Weight</Text>
      </View>

      {/* Note input */}
      <TextInput
        style={[st.setInput, st.noteInput]}
        value={s.note_client}
        onChangeText={v => updateSet(exerciseId, s.setIndex, { note_client: v })}
        placeholder="note"
        placeholderTextColor="#bbb"
      />

      {/* Coach note */}
      {s.note_coach ? (
        <Text style={st.coachNote} numberOfLines={1}>🏋️ {s.note_coach}</Text>
      ) : null}

      {/* Checkbox */}
      <TouchableOpacity
        style={[st.checkbox, s.completed && st.checkboxDone]}
        onPress={() => toggleCompleted(exerciseId, s.setIndex)}
      >
        <Text style={st.checkboxText}>{s.completed ? "✓" : ""}</Text>
      </TouchableOpacity>
    </View>
  );

const renderExercise = ({ item }: { item: any }) => {
    const localEx = localExercises.find(le => le.exerciseId === String(item._id));
    const sets = localEx?.sets || (item.sets || []).map((s: any, idx: number) => ({
      setIndex: idx, plannedReps: s.reps ?? 0, weight: 0,
      completed: false, note_client: "", note_coach: "",
    }));
    const allDone = sets.length > 0 && sets.every((s: LocalSet) => s.completed);
    return (
    <View key={item._id} style={st.exerciseCard}>
        <View style={st.exerciseHeader}>
          <View style={st.exerciseDot} />
          <Text style={st.exerciseTitle}>{item.name}</Text>
          {allDone && <View style={st.doneBadge}><Text style={st.doneBadgeText}>Done ✓</Text></View>}
        </View>
        {sets.map((s: LocalSet) => renderSet(String(item._id), s))}
      </View>
    );
  };

  /* ════════════ RENDER ════════════ */
  return (
    <LinearGradient
     colors={["#000000", "#555555", "#ffffff"]}
locations={[0, 0.5, 1]}
start={{x:0.5, y:0}}
end={{x:0.5, y:1}}
      style={st.container}
    >
      <SafeAreaView style={st.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[st.scrollContent, { alignItems: isWide ? "center" : undefined }]}
        >
          {/* Constrained inner wrapper */}
          <View style={{ width: "100%", maxWidth: maxW }}>

            {/* ── PAGE TITLE ── */}
            <Text style={st.pageTitle}>Activities</Text>

            {/* ── MINI STEPS CARD ── */}
            <View style={st.stepsCard}>
              <View style={st.stepsLeft}>
                <Text style={st.stepsCount}>0</Text>
                <Text style={st.stepsLabel}>Steps today</Text>
              </View>
              <View style={st.miniChart}>
                {WEEK_DAYS.map((day, i) => {
                  const isToday  = i === todayIdx;
                  const isPast   = i < todayIdx;
                  const barH     = isPast ? (Math.random() * 28 + 12) : isToday ? 20 : 6;
                  return (
                    <View key={i} style={st.miniBarWrap}>
                      <View style={[
                        st.miniBar,
                        { height: barH },
                        isPast && st.miniBarPast,
                        isToday && st.miniBarToday,
                      ]} />
                      <Text style={[st.miniBarLabel, isToday && st.miniBarLabelToday]}>{day}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ── HABITS SECTION ── */}
            <View style={st.sectionHeader}>
              <Text style={st.sectionTitle}>Habits</Text>
              <TouchableOpacity
                onPress={() => router.push("/pages/client/HabitsScreen")}
                style={st.viewAllBtn}
              >
                <Text style={st.viewAllText}>View all →</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={st.habitsCard}
              onPress={() => router.push("/pages/client/HabitsScreen")}
              activeOpacity={0.88}
            >
              <View style={st.habitsCardLeft}>
                <Text style={st.habitsEmoji}>✅</Text>
                <View>
                  <Text style={st.habitsCardTitle}>Daily Habits</Text>
                  <Text style={st.habitsCardSub}>Track & build your routines</Text>
                </View>
              </View>
              <Text style={st.habitsChevron}>›</Text>
            </TouchableOpacity>

            {/* ── PERSONALIZED PLANS ── */}
            <View style={[st.sectionHeader, { marginTop: 24 }]}>
              <Text style={st.sectionTitle}>Personalized plans</Text>
            </View>

            {loading && localPrograms.length === 0 ? (
              <View style={st.loadingWrap}>
                <ActivityIndicator color="#111" />
              </View>
            ) : localPrograms.length === 0 ? (
              <View style={st.emptyCard}>
                <Text style={st.emptyEmoji}>🏋️</Text>
                <Text style={st.emptyTitle}>No programs assigned</Text>
                <Text style={st.emptySub}>Your coach hasn't assigned any programs yet</Text>
              </View>
            ) : (
              <>
                {/* Program cards — horizontal scroll picker */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={st.programScrollContent}
                  style={st.programScroll}
                >
                  {localPrograms.map(item => {
                    const active = selectedProgramId === item._id;
                    const coverUri = item.coverImage
                      ? item.coverImage.startsWith("http") ? item.coverImage : `${BASE_URL}${item.coverImage}`
                      : null;
                    return (
                      <TouchableOpacity
                        key={item._id}
                        style={[st.programCard, active && st.programCardActive, { width: programCardW }]}
                        onPress={() => setSelectedProgramId(item._id)}
                        activeOpacity={0.88}
                      >
                        {coverUri ? (
                          <Image source={{ uri: coverUri }} style={st.programCardImg} />
                        ) : (
                          <View style={[st.programCardImg, st.programCardImgFallback]}>
                            <Text style={{ fontSize: 32 }}>🏋️</Text>
                          </View>
                        )}
                        <View style={st.programCardBody}>
                          <Text style={st.programCardTitle} numberOfLines={2}>{item.title}</Text>
                          <Text style={st.programCardMeta}>
                            {item.durationWeeks ? `${item.durationWeeks} wks · ` : ""}
                            {item.difficulty}
                          </Text>
                          {active && <View style={st.activePill}><Text style={st.activePillText}>Active</Text></View>}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* ── SELECTED PROGRAM EXERCISES ── */}
                {selectedProgram && (
                  <View style={st.exercisesSection}>
                    <Text style={st.programName}>{selectedProgram.title}</Text>
                    {selectedProgram.description ? (
                      <Text style={st.programDesc}>{selectedProgram.description}</Text>
                    ) : null}

                    <Text style={[st.sectionTitle, { marginTop: 16, marginBottom: 10 }]}>
                      Exercises · {selectedProgram.exercises?.length || 0}
                    </Text>

                   {(selectedProgram.exercises || []).map((ex: any) => (
  <View key={ex._id || ex.name}>
    {renderExercise({ item: ex })}
  </View>
))}
                    <TouchableOpacity
                      style={[st.saveBtn, saving && st.saveBtnDisabled]}
                      onPress={handleSaveProgress}
                      disabled={saving}
                      activeOpacity={0.88}
                    >
                      {saving
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={st.saveBtnText}>Save Progress</Text>
                      }
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            <View style={{ height: 60 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ─── styles ─────────────────────────────────────────────────── */
const WHITE   = "#ffffff";
const BLACK   = "#111111";
const GRAY100 = "#f5f5f5";
const GRAY200 = "#ebebeb";
const GRAY300 = "#d4d4d4";
const GRAY500 = "#737373";
const PINK    = "#f9a8d4";

const st = StyleSheet.create({
  container:     { flex: 1 },
  safe:          { flex: 1 },
  scrollContent: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 20 },

  pageTitle: {
    fontSize: 28, fontWeight: "800", color: BLACK,
    letterSpacing: -0.5, fontFamily: "Lato-Regular", marginBottom: 18,
  },

  /* ── STEPS CARD ── */
  stepsCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18, padding: 16, marginBottom: 20,
    flexDirection: "row", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  stepsLeft:  { flex: 1 },
  stepsCount: { fontSize: 26, fontWeight: "800", color: BLACK, fontFamily: "System" },
  stepsLabel: { fontSize: 13, color: GRAY500, marginTop: 2, fontFamily: "System" },
  miniChart:  { flexDirection: "row", alignItems: "flex-end", gap: 6, paddingBottom: 18 },
  miniBarWrap:{ alignItems: "center", gap: 4 },
  miniBar:    { width: 8, borderRadius: 4, backgroundColor: GRAY300 },
  miniBarPast:{ backgroundColor: PINK },
  miniBarToday:{ backgroundColor: PINK },
  miniBarLabel:{ fontSize: 10, color: GRAY500, fontFamily: "System" },
  miniBarLabelToday:{ color: BLACK, fontWeight: "700" },

  /* ── SECTION HEADERS ── */
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 12,
  },
  sectionTitle: { fontSize: 19, fontWeight: "800", color: BLACK, fontFamily: "System" },
  viewAllBtn:   { padding: 4 },
  viewAllText:  { fontSize: 13, fontWeight: "600", color: GRAY500, fontFamily: "System" },

  /* ── HABITS CARD ── */
  habitsCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16, padding: 16, marginBottom: 4,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  habitsCardLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  habitsEmoji:    { fontSize: 30 },
  habitsCardTitle:{ fontSize: 16, fontWeight: "700", color: BLACK, fontFamily: "System" },
  habitsCardSub:  { fontSize: 12, color: GRAY500, marginTop: 2, fontFamily: "System" },
  habitsChevron:  { fontSize: 24, color: GRAY300, fontWeight: "300" },

  /* ── PROGRAM CARDS ── */
  programScroll:        { marginHorizontal: -16 },
  programScrollContent: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  programCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    /* width set inline via programCardW */
    overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, elevation: 2,
    borderWidth: 2, borderColor: "transparent",
  },
  programCardActive: { borderColor: BLACK },
  programCardImg: { width: "100%", height: 140, resizeMode: "cover" },
  programCardImgFallback: {
    backgroundColor: GRAY100, justifyContent: "center", alignItems: "center",
  },
  programCardBody:  { padding: 14 },
  programCardTitle: { fontSize: 15, fontWeight: "700", color: BLACK, fontFamily: "Lato-Regular", marginBottom: 4 },
  programCardMeta:  { fontSize: 12, color: GRAY500, textTransform: "capitalize", fontFamily: "System" },
  activePill: {
    alignSelf: "flex-start", marginTop: 8,
    backgroundColor: BLACK, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
  },
  activePillText: { color: WHITE, fontSize: 11, fontWeight: "700" },

  /* ── EXERCISE SECTION ── */
  exercisesSection: { marginTop: 20 },
  programName: { fontSize: 20, fontWeight: "800", color: BLACK, fontFamily: "System" },
  programDesc: { fontSize: 13, color: GRAY500, marginTop: 4, fontFamily: "Lato-Regular", lineHeight: 20 },

  exerciseCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  exerciseHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  exerciseDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: BLACK },
  exerciseTitle:  { fontSize: 15, fontWeight: "700", color: BLACK, fontFamily: "Lato-Regular", flex: 1 },
  doneBadge: {
    backgroundColor: "#d1fae5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12,
  },
  doneBadgeText: { fontSize: 11, fontWeight: "700", color: "#065f46" },

  /* ── SET ROW ── */
  setRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: GRAY200,
    flexWrap: "wrap",           /* allows wrapping on very small screens */
  },
  setRowWide: {
    flexWrap: "nowrap",         /* on wide screens keep everything on one line */
  },
  setMeta:    { width: 56 },
  setLabel:   { fontSize: 12, fontWeight: "700", color: BLACK, fontFamily: "System" },
  setPlanned: { fontSize: 11, color: GRAY500, fontFamily: "Lato-Regular", marginTop: 1 },
  inputWrap:  { width: 56 },
  setInput: {
    backgroundColor: GRAY100, borderRadius: 8, paddingHorizontal: 8,
    paddingVertical: 7, fontSize: 13, color: BLACK, fontFamily: "Lato-Regular",
    borderWidth: 1, borderColor: GRAY200, textAlign: "center",
  },
  noteInput:  { flex: 1, textAlign: "left", width: undefined, minWidth: 80 },
  coachNote:  { fontSize: 10, color: GRAY500, flex: 1, fontFamily: "System" },
  checkbox: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: GRAY300,
    alignItems: "center", justifyContent: "center",
    backgroundColor: WHITE,
  },
  checkboxDone:  { backgroundColor: BLACK, borderColor: BLACK },
  checkboxText:  { color: WHITE, fontWeight: "800", fontSize: 14 },

  /* ── SAVE BUTTON ── */
  saveBtn: {
    backgroundColor: BLACK, paddingVertical: 15, borderRadius: 14,
    alignItems: "center", marginTop: 20,
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 8, elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: { color: WHITE, fontWeight: "800", fontSize: 16, fontFamily: "System" },

  /* ── EMPTY / LOADING ── */
  loadingWrap: { paddingVertical: 40, alignItems: "center" },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.88)", borderRadius: 18,
    padding: 32, alignItems: "center", gap: 8,
  },
  emptyEmoji: { fontSize: 44, marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: BLACK, fontFamily: "System" },
  emptySub:   { fontSize: 13, color: GRAY500, fontFamily: "Lato-Regular", textAlign: "center" },
});