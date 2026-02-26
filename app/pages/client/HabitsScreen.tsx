import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Modal,
  Alert,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pedometer } from "expo-sensors";
import { useHabitStore, Habit } from "../../../store/useHabitStore";
import api from "../../../utils/api";

/* ─── constants ──────────────────────────────────────────────── */
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const buildWeekDays = (): Date[] => {
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
};

const MONTH_NAMES     = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES       = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const WEEK_DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const BAR_MAX_H = 100;
const STEP_GOAL = 10000;

interface StepEntry { date: string; steps: number; }

/* ════════════════════════════════════════════════════════════ */
export default function HabitsScreen() {
  const router = useRouter();

  /* ── Reactive dimensions ── */
  const { width } = useWindowDimensions();
  const isWide  = width >= 640;
  const maxW    = Math.min(width, 700);
  /* Date strip: on narrow screens shrink the pill padding */
  const datePadH = width < 360 ? 6 : 10;
  const dateNumSz = width < 360 ? 14 : 17;

  /* ── store ── */
  const habits      = useHabitStore(s => s.habits);
  const logs        = useHabitStore(s => s.logs);
  const steps       = useHabitStore(s => s.steps);
  const fetchToday  = useHabitStore(s => s.fetchToday);
  const updateHabit = useHabitStore(s => s.updateHabit);
  const updateSteps = useHabitStore(s => s.updateSteps);

  /* ── UI state ── */
  const [weekDays]                      = useState(buildWeekDays());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading]           = useState(false);

  /* ── 7-day steps state ── */
  const [weekSteps, setWeekSteps]         = useState<StepEntry[]>([]);
  const [stepsLoading, setStepsLoading]   = useState(false);

  /* ── number habit modal ── */
  const [showNumberInput, setShowNumberInput]     = useState(false);
  const [activeNumberHabit, setActiveNumberHabit] = useState<Habit | null>(null);
  const [numberValue, setNumberValue]             = useState("");

  /* ── pedometer ── */
  const [pedometerAvailable, setPedometerAvailable] = useState(false);
  const [showStepsInput, setShowStepsInput]         = useState(false);
  const [manualSteps, setManualSteps]               = useState("");

  const selectedISO = toISO(selectedDate);
  const isToday     = selectedISO === toISO(new Date());
  const todayIdx    = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  /* ── derived chart values ── */
  const maxSteps           = Math.max(...weekSteps.map(e => e.steps), STEP_GOAL, 1);
  const todayStepsFromWeek = weekSteps.find(e => e.date === toISO(new Date()))?.steps ?? steps;

  /* ════ boot: fetch today habits + week steps ════ */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try { await fetchToday(); } catch (e) { console.warn("fetchToday failed", e); }
      finally { setLoading(false); }
    })();
    fetchWeekSteps();
  }, []);

  /* ════ fetch 7-day steps for current user ════ */
  const fetchWeekSteps = useCallback(async () => {
    setStepsLoading(true);
    try {
      const results = await Promise.all(
        weekDays.map(d =>
          api.get(`/habits/steps/me/${toISO(d)}`)
            .then(r => ({ date: toISO(d), steps: r.data?.steps ?? 0 }))
            .catch(() => ({ date: toISO(d), steps: 0 }))
        )
      );
      setWeekSteps(results);
    } catch (e) {
      console.warn("fetchWeekSteps error", e);
    } finally {
      setStepsLoading(false);
    }
  }, [weekDays]);

  /* ════ pedometer ════ */
  useEffect(() => {
    let sub: any = null;
    const start = async () => {
      try {
        const { status } = await Pedometer.requestPermissionsAsync();
        if (status !== "granted") { setPedometerAvailable(false); return; }
        const avail = await Pedometer.isAvailableAsync();
        setPedometerAvailable(avail);
        if (avail && isToday) {
          sub = Pedometer.watchStepCount(result => {
            updateSteps(result.steps).catch(() => {});
            // also update local weekSteps array for today
            setWeekSteps(prev =>
              prev.map(e => e.date === toISO(new Date()) ? { ...e, steps: result.steps } : e)
            );
          });
        }
      } catch { setPedometerAvailable(false); }
    };
    start();
    return () => sub?.remove?.();
  }, [isToday]);

  /* ════ habit actions ════ */
  const toggleBooleanHabit = useCallback(async (habit: Habit) => {
    if (!isToday) return Alert.alert("Past dates", "You can only log habits for today.");
    try { await updateHabit(habit._id, !logs[habit._id]); }
    catch { Alert.alert("Error", "Failed to log habit."); }
  }, [logs, isToday, updateHabit]);

  const openNumberHabit = (habit: Habit) => {
    if (!isToday) return Alert.alert("Past dates", "You can only log habits for today.");
    setActiveNumberHabit(habit);
    setNumberValue(String(logs[habit._id] ?? ""));
    setShowNumberInput(true);
  };

  const submitNumberHabit = async () => {
    if (!activeNumberHabit) return;
    const val = parseFloat(numberValue);
    if (isNaN(val)) return Alert.alert("Invalid", "Please enter a valid number.");
    try {
      await updateHabit(activeNumberHabit._id, val);
      setShowNumberInput(false); setActiveNumberHabit(null); setNumberValue("");
    } catch { Alert.alert("Error", "Failed to log habit."); }
  };

  const submitManualSteps = async () => {
    const val = parseInt(manualSteps);
    if (isNaN(val) || val < 0) return Alert.alert("Invalid", "Please enter a valid step count.");
    try {
      await updateSteps(val);
      setWeekSteps(prev =>
        prev.map(e => e.date === toISO(new Date()) ? { ...e, steps: val } : e)
      );
      setShowStepsInput(false); setManualSteps("");
    } catch { Alert.alert("Error", "Failed to update steps."); }
  };

  const isDone         = (habit: Habit) => isToday ? !!logs[habit._id] : false;
  const completedCount = habits.filter(h => isDone(h)).length;
  const progress       = habits.length > 0 ? completedCount / habits.length : 0;

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <LinearGradient
      colors={["#d6d6d6","#f0f0f0","#ffffff","#f0f0f0","#d6d6d6"]}
      locations={[0,0.2,0.5,0.8,1]}
      start={{x:0.5,y:0}} end={{x:0.5,y:1}}
      style={s.container}
    >
      <SafeAreaView style={s.safe}>

        {/* TOP BAR */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={s.pageTitle}>Habit History</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* DATE STRIP */}
        <View style={s.dateStrip}>
          {weekDays.map((d, i) => {
            const isSel = toISO(d) === toISO(selectedDate);
            return (
              <TouchableOpacity
                key={i}
                style={[
                  s.dateItem,
                  isSel && s.dateItemActive,
                  { paddingHorizontal: datePadH },
                ]}
                onPress={() => setSelectedDate(d)}
                activeOpacity={0.8}
              >
                <Text style={[s.dateMonth, isSel && s.dateTextActive]}>
                  {MONTH_NAMES[d.getMonth()]}
                </Text>
                <Text style={[s.dateNum, isSel && s.dateTextActive, { fontSize: dateNumSz }]}>
                  {String(d.getDate()).padStart(2,"0")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={s.scrollOuter} showsVerticalScrollIndicator={false}>

          {/* Constrained inner wrapper */}
          <View style={[s.inner, { maxWidth: maxW }]}>

            {/* ══════════════════════════════════════════════════════
                REAL 7-DAY STEPS BAR CHART CARD
            ══════════════════════════════════════════════════════ */}
            <View style={s.chartCard}>
              {/* Header row */}
              <View style={s.chartHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={s.chartTitle}>Weekly Steps</Text>
                  <Text style={s.chartSub}>Goal: {STEP_GOAL.toLocaleString()} steps / day</Text>
                </View>
                <View style={s.todayBadge}>
                  <Text style={s.todayBadgeSteps}>
                    {todayStepsFromWeek.toLocaleString()}
                  </Text>
                  <Text style={s.todayBadgeLabel}>today</Text>
                  <Text style={s.todayBadgePct}>
                    {Math.min(Math.round(todayStepsFromWeek / STEP_GOAL * 100), 100)}%
                  </Text>
                </View>
              </View>

              {/* Chart body */}
              <View style={s.chartBody}>
                {/* Y-axis */}
                <View style={s.yAxis}>
                  {["10k","5k","0"].map((v, i) => (
                    <Text key={i} style={s.yLabel}>{v}</Text>
                  ))}
                </View>

                {/* Bars + grid */}
                <View style={s.chartGrid}>
                  {/* Grid lines */}
                  <View style={[s.gridLine, { bottom: BAR_MAX_H }]} />
                  <View style={[s.gridLine, { bottom: BAR_MAX_H / 2 }]} />
                  <View style={[s.gridLine, { bottom: 0 }]} />

                  {/* Dashed goal line */}
                  <View style={[s.goalLine, { bottom: (STEP_GOAL / maxSteps) * BAR_MAX_H }]} />

                  {/* Bars */}
                  {weekDays.map((d, i) => {
                    const entry    = weekSteps.find(e => e.date === toISO(d));
                    const val      = entry?.steps ?? 0;
                    const barH     = val > 0 ? Math.max(4, (val / maxSteps) * BAR_MAX_H) : 3;
                    const hitGoal  = val >= STEP_GOAL;
                    const isTodayB = toISO(d) === toISO(new Date());
                    const isSelB   = toISO(d) === toISO(selectedDate);
                    return (
                      <View key={i} style={s.barCol}>
                        <Text style={s.barTopLabel}>
                          {val > 0
                            ? val >= 1000 ? `${(val/1000).toFixed(1)}k` : `${val}`
                            : ""}
                        </Text>
                        <View style={[
                          s.bar, { height: barH },
                          hitGoal   && s.barHit,
                          isTodayB  && s.barToday,
                          isSelB && !isTodayB && s.barSel,
                        ]} />
                        <Text style={[s.barLabel, isTodayB && s.barLabelBold]}>
                          {WEEK_DAY_LABELS[i]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Legend */}
              <View style={s.legend}>
                {[
                  { color:"#d4d4d4", label:"No data" },
                  { color:"#111",    label:"Below goal" },
                  { color:"#4ade80", label:"Goal reached" },
                  { color:"#f9a8d4", label:"10k line" },
                ].map((item, i) => (
                  <View key={i} style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: item.color }]} />
                    <Text style={s.legendLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>

              {/* Goal progress bar */}
              <View style={s.goalBarWrap}>
                {!pedometerAvailable && (
                  <TouchableOpacity onPress={() => setShowStepsInput(true)} style={s.manualBtn}>
                    <Text style={s.manualBtnText}>Enter steps manually</Text>
                  </TouchableOpacity>
                )}
                <View style={s.goalBar}>
                  <View style={[s.goalBarFill, {
                    width: `${Math.min(todayStepsFromWeek / STEP_GOAL * 100, 100)}%` as any,
                    backgroundColor: todayStepsFromWeek >= STEP_GOAL ? "#4ade80" : "#111",
                  }]} />
                </View>
              </View>
            </View>

            {/* PROGRESS SUMMARY */}
            <View style={s.progressCard}>
              <View style={s.progressHeader}>
                <Text style={s.progressTitle}>
                  {isToday ? "Today" : DAY_NAMES[selectedDate.getDay()]}
                </Text>
                <Text style={s.progressCount}>
                  {loading ? "Loading…" : `${completedCount}/${habits.length} done`}
                </Text>
              </View>
              <View style={s.progressBar}>
                <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
              </View>
              <Text style={s.progressPct}>{Math.round(progress * 100)}% completion rate</Text>
            </View>

            {/* HABITS LIST */}
            {habits.length === 0 && !loading ? (
              <View style={s.emptyCard}>
                <Text style={s.emptyEmoji}>🌱</Text>
                <Text style={s.emptyTitle}>No habits assigned yet</Text>
                <Text style={s.emptySub}>Your coach will assign habits for you to track</Text>
              </View>
            ) : (
              habits.map(habit => {
                const done   = isDone(habit);
                const logVal = logs[habit._id];
                return (
                  <TouchableOpacity
                    key={habit._id}
                    style={s.habitRow}
                    onPress={() => {
                      if (habit.type === "boolean") toggleBooleanHabit(habit);
                      else openNumberHabit(habit);
                    }}
                    activeOpacity={0.88}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.habitTitle, done && s.habitTitleDone]}>
                        {habit.title}
                      </Text>
                      <Text style={[s.habitTime, done && s.habitTimeDone]}>
                        {habit.type === "number"
                          ? `Target: ${habit.target ?? "—"} · Logged: ${logVal ?? "—"}`
                          : isToday ? "Tap to mark complete" : "Past date"
                        }
                      </Text>
                    </View>

                    {habit.type === "boolean" ? (
                      <View style={[s.habitCheck, done && s.habitCheckDone]}>
                        {done && <Text style={s.habitCheckMark}>✓</Text>}
                      </View>
                    ) : (
                      <View style={[s.habitCheck, done && s.habitCheckDone]}>
                        <Text style={[s.habitCheckMark, !done && { color:"#aaa", fontSize:12 }]}>
                          {logVal != null ? logVal : "—"}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}

            {habits.length > 0 && (
              <Text style={s.hint}>
                {isToday
                  ? "Tap a habit to log it · Checkbox habits toggle, numeric ones prompt for a value"
                  : "Viewing past date — tap today's date to log habits"}
              </Text>
            )}

            <View style={{ height: 80 }} />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* NUMBER HABIT MODAL */}
      <Modal visible={showNumberInput} animationType="slide" transparent>
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.sheetHeader}>
              <Text style={m.sheetTitle}>{activeNumberHabit?.title}</Text>
              <TouchableOpacity onPress={() => setShowNumberInput(false)} style={m.closeBtn}>
                <Text style={m.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            {activeNumberHabit?.target && (
              <Text style={m.targetHint}>Target: {activeNumberHabit.target}</Text>
            )}
            <Text style={m.label}>Enter your value</Text>
            <TextInput
              style={m.input}
              value={numberValue}
              onChangeText={setNumberValue}
              keyboardType="numeric"
              placeholder={`e.g. ${activeNumberHabit?.target ?? "3"}`}
              placeholderTextColor="#bbb"
              autoFocus
            />
            <TouchableOpacity style={m.saveBtn} onPress={submitNumberHabit} activeOpacity={0.88}>
              <Text style={m.saveBtnText}>Log Value</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowNumberInput(false)} style={m.cancelRow}>
              <Text style={m.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MANUAL STEPS MODAL */}
      <Modal visible={showStepsInput} animationType="slide" transparent>
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.sheetHeader}>
              <Text style={m.sheetTitle}>Enter Steps</Text>
              <TouchableOpacity onPress={() => setShowStepsInput(false)} style={m.closeBtn}>
                <Text style={m.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={m.targetHint}>Pedometer not available on this device</Text>
            <Text style={m.label}>Step count for today</Text>
            <TextInput
              style={m.input}
              value={manualSteps}
              onChangeText={setManualSteps}
              keyboardType="numeric"
              placeholder="e.g. 8000"
              placeholderTextColor="#bbb"
              autoFocus
            />
            <TouchableOpacity style={m.saveBtn} onPress={submitManualSteps} activeOpacity={0.88}>
              <Text style={m.saveBtnText}>Save Steps</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowStepsInput(false)} style={m.cancelRow}>
              <Text style={m.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </LinearGradient>
  );
}

/* ─── palette ────────────────────────────────────────────────── */
const WHITE   = "#ffffff";
const BLACK   = "#111111";
const GRAY100 = "#f5f5f5";
const GRAY200 = "#e8e8e8";
const GRAY300 = "#d4d4d4";
const GRAY500 = "#737373";
const PINK    = "#f9a8d4";
const GREEN   = "#4ade80";

/* ─── styles ─────────────────────────────────────────────────── */
const s = StyleSheet.create({
  container: { flex: 1 },
  safe:      { flex: 1 },

  /* TOP BAR */
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6,
  },
  backBtn:     { width: 36, height: 36, justifyContent: "center" },
  backBtnText: { fontSize: 28, color: BLACK, fontWeight: "300", lineHeight: 34 },
  pageTitle:   { fontSize: 20, fontWeight: "800", color: BLACK, fontFamily: "System", letterSpacing: -0.3 },

  /* DATE STRIP */
  dateStrip: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 8,     /* reduced so pills breathe on small screens */
    paddingBottom: 12,
    paddingTop: 4,
  },
  dateItem: {
    alignItems: "center",
    paddingVertical: 8,
    /* paddingHorizontal set inline via datePadH */
    borderRadius: 14,
    flex: 1,                  /* each pill takes equal width share */
    marginHorizontal: 2,
  },
  dateItemActive:{ backgroundColor: "rgba(255,255,255,0.85)" },
  dateMonth:     { fontSize: 11, color: GRAY500, fontFamily: "System", marginBottom: 2 },
  dateNum:       { fontWeight: "700", color: GRAY500, fontFamily: "System" },
  /* fontSize of dateNum set inline via dateNumSz */
  dateTextActive:{ color: BLACK },

  /* Scroll outer centres the inner block */
  scrollOuter: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 100,
  },
  inner: {
    width: "100%",
  },

  /* ══ CHART CARD ══ */
  chartCard: {
    backgroundColor: "rgba(255,255,255,0.93)",
    borderRadius: 20, padding: 18, marginBottom: 14,
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 14, elevation: 3,
  },
  chartHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 16,
  },
  chartTitle: { fontSize: 17, fontWeight: "800", color: BLACK, fontFamily: "System" },
  chartSub:   { fontSize: 12, color: GRAY500, marginTop: 3, fontFamily: "System" },

  todayBadge:      { alignItems: "flex-end" },
  todayBadgeSteps: { fontSize: 22, fontWeight: "800", color: BLACK, fontFamily: "System", lineHeight: 26 },
  todayBadgeLabel: { fontSize: 11, color: GRAY500, fontFamily: "System" },
  todayBadgePct:   { fontSize: 13, fontWeight: "700", color: BLACK, fontFamily: "System" },

  /* chart body */
  chartBody: {
    flexDirection: "row",
    height: BAR_MAX_H + 24,
    marginBottom: 4,
  },
  yAxis: {
    width: 34, justifyContent: "space-between",
    alignItems: "flex-end", paddingBottom: 20, paddingRight: 6,
  },
  yLabel: { fontSize: 10, color: GRAY500, fontFamily: "System" },

  chartGrid: {
    flex: 1, flexDirection: "row",
    alignItems: "flex-end", position: "relative",
    paddingBottom: 20,
  },
  gridLine: {
    position: "absolute", left: 0, right: 0,
    height: StyleSheet.hairlineWidth, backgroundColor: GRAY200,
  },
  goalLine: {
    position: "absolute", left: 0, right: 0,
    height: 1.5, backgroundColor: PINK,
  },

  barCol:      { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 3 },
  barTopLabel: { fontSize: 8, color: GRAY500, fontFamily: "System", height: 12 },
  bar:         { width: "60%", borderRadius: 6, backgroundColor: GRAY300 },
  barHit:      { backgroundColor: GREEN },
  barToday:    { backgroundColor: BLACK },
  barSel:      { backgroundColor: GRAY500 },
  barLabel:    { fontSize: 9, color: GRAY500, fontFamily: "System" },
  barLabelBold:{ color: BLACK, fontWeight: "700" },

  legend:     { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot:  { width: 9, height: 9, borderRadius: 5 },
  legendLabel:{ fontSize: 10, color: GRAY500, fontFamily: "System" },

  /* goal bar below chart */
  goalBarWrap:   { marginTop: 14 },
  manualBtn:     { marginBottom: 8, alignSelf: "flex-start" },
  manualBtnText: {
    fontSize: 12, color: BLACK, fontWeight: "700",
    textDecorationLine: "underline", fontFamily: "System",
  },
  goalBar:    { height: 6, backgroundColor: GRAY200, borderRadius: 3, overflow: "hidden" },
  goalBarFill:{ height: 6, borderRadius: 3 },
  goalBarLabel:{ fontSize: 11, color: GRAY500, marginTop: 5, fontFamily: "System" },

  /* PROGRESS CARD */
  progressCard: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  progressTitle:  { fontSize: 17, fontWeight: "700", color: BLACK, fontFamily: "System" },
  progressCount:  { fontSize: 13, color: GRAY500, fontFamily: "System" },
  progressBar:    { height: 6, backgroundColor: GRAY200, borderRadius: 3, overflow: "hidden" },
  progressFill:   { height: 6, backgroundColor: BLACK, borderRadius: 3 },
  progressPct:    { fontSize: 12, color: GRAY500, marginTop: 8, fontFamily: "System" },

  /* HABIT ROWS */
  habitRow: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 14, padding: 16, marginBottom: 10,
    flexDirection: "row", alignItems: "center", gap: 12,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  habitTitle:     { fontSize: 15, fontWeight: "700", color: BLACK, fontFamily: "System", marginBottom: 3 },
  habitTitleDone: { textDecorationLine: "line-through", color: GRAY500 },
  habitTime:      { fontSize: 12, color: GRAY500, fontFamily: "System" },
  habitTimeDone:  { textDecorationLine: "line-through" },
  habitCheck: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 2, borderColor: GRAY300,
    backgroundColor: WHITE, justifyContent: "center", alignItems: "center",
  },
  habitCheckDone: { backgroundColor: BLACK, borderColor: BLACK },
  habitCheckMark: { color: WHITE, fontWeight: "800", fontSize: 15 },

  hint: { textAlign: "center", color: GRAY300, fontSize: 11, marginTop: 8, fontFamily: "System", lineHeight: 17 },

  /* EMPTY */
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 18,
    padding: 36, alignItems: "center", gap: 8, marginTop: 12,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: BLACK, fontFamily: "System" },
  emptySub:   { fontSize: 13, color: GRAY500, fontFamily: "System", textAlign: "center" },
});

/* ─── Modal styles ───────────────────────────────────────────── */
const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: WHITE, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 20, maxHeight: "75%",
  },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 8,
  },
  sheetTitle:   { fontSize: 18, fontWeight: "800", color: "#111", fontFamily: "System", flex: 1, marginRight: 10 },
  closeBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center" },
  closeBtnText: { fontSize: 14, fontWeight: "700", color: "#111" },
  targetHint:   { fontSize: 13, color: GRAY500, marginBottom: 16, fontFamily: "System" },
  label: {
    fontSize: 11, fontWeight: "700", color: "#737373",
    textTransform: "uppercase", letterSpacing: 0.6,
    marginBottom: 8, fontFamily: "System",
  },
  input: {
    backgroundColor: "#f5f5f5", color: "#111", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 18,
    fontFamily: "System", borderWidth: 1, borderColor: "#e8e8e8",
    marginBottom: 4, fontWeight: "700", textAlign: "center",
  },
  saveBtn:     { backgroundColor: "#111", paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 20 },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 16, fontFamily: "System" },
  cancelRow:   { marginTop: 12, marginBottom: 20 },
  cancelText:  { color: "#aaa", textAlign: "center", fontSize: 14 },
});