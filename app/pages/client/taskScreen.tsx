import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTaskStore, Task } from "../../../store/useTaskStore";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const H_PAD  = Math.round(SCREEN_W * 0.045);
const isSmall = SCREEN_W < 375;

/* ─── helpers ─────────────────────────────────────────────── */
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const TODAY = toISO(new Date());

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_SHORT   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAY_FULL    = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

/** Build a date range: 7 past days + today + 14 future days */
const buildDateRange = (): Date[] => {
  const days: Date[] = [];
  for (let i = -7; i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
};

const formatFullDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return `${DAY_FULL[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
};

/* ════════════════════════════════════════════════════════════ */
export default function ClientTasksScreen() {
  const router = useRouter();
  const {
    clientTasks,
    loading,
    fetchClientTasks,
    completeTask,
    editClientTask,
  } = useTaskStore();

  const [dateRange]     = useState(buildDateRange());
  const [selectedDate, setSelectedDate] = useState<string>(TODAY);

  /* ── edit modal ── */
  const [showEditModal, setShowEditModal]   = useState(false);
  const [editingTask, setEditingTask]       = useState<Task | null>(null);
  const [editTitle, setEditTitle]           = useState("");
  const [editDesc, setEditDesc]             = useState("");
  const [saving, setSaving]                 = useState(false);

  /* ── complete modal ── */
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingTask, setCompletingTask]       = useState<Task | null>(null);
  const [completionNote, setCompletionNote]       = useState("");
  const [completing, setCompleting]               = useState(false);

  /* ── fetch on mount ── */
  useEffect(() => {
    fetchClientTasks().catch(() => {});
  }, []);

  /* ── tasks for selected date ── */
  const tasksForDate: Task[] = clientTasks[selectedDate] ?? [];

  /* ── summary stats ── */
  const totalToday   = tasksForDate.length;
  const doneToday    = tasksForDate.filter(t => t.completed).length;
  const progressPct  = totalToday > 0 ? doneToday / totalToday : 0;

  /* ── task count per date for badges ── */
  const countForDate = (iso: string) => (clientTasks[iso] ?? []).length;
  const doneForDate  = (iso: string) => (clientTasks[iso] ?? []).filter(t => t.completed).length;

  /* ── open complete modal ── */
  const openCompleteModal = (task: Task) => {
    if (task.completed) return;
    setCompletingTask(task);
    setCompletionNote("");
    setShowCompleteModal(true);
  };

  /* ── submit completion ── */
  const handleComplete = async () => {
    if (!completingTask) return;
    setCompleting(true);
    try {
      await completeTask(completingTask._id, completionNote.trim() || undefined);
      setShowCompleteModal(false);
    } catch {
      Alert.alert("Error", "Failed to mark task as complete.");
    } finally {
      setCompleting(false);
    }
  };

  /* ── open edit modal ── */
  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description ?? "");
    setShowEditModal(true);
  };

  /* ── submit edit ── */
  const handleEdit = async () => {
    if (!editingTask) return;
    if (!editTitle.trim()) return Alert.alert("Missing title", "Please enter a task title.");
    setSaving(true);
    try {
      await editClientTask(editingTask._id, {
        title:       editTitle.trim(),
        description: editDesc.trim(),
      });
      setShowEditModal(false);
    } catch {
      Alert.alert("Error", "Failed to update task.");
    } finally {
      setSaving(false);
    }
  };

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
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
          contentContainerStyle={[st.scroll, { paddingHorizontal: H_PAD }]}
        >

          {/* ── TOP BAR ── */}
          <View style={st.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
              <Text style={st.backText}>‹</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={st.pageTitle}>My Tasks</Text>
              <Text style={st.pageSub}>From your coach</Text>
            </View>
            {/* Refresh */}
            <TouchableOpacity
              onPress={() => fetchClientTasks()}
              style={st.refreshBtn}
              activeOpacity={0.8}
            >
              <Text style={st.refreshText}>↻</Text>
            </TouchableOpacity>
          </View>

          {/* ── TODAY SUMMARY CARD ── */}
          <View style={st.summaryCard}>
            <View style={st.summaryLeft}>
              <Text style={st.summaryLabel}>
                {selectedDate === TODAY ? "Today's Progress" : formatFullDate(selectedDate)}
              </Text>
              <Text style={st.summaryFraction}>
                {doneToday}
                <Text style={st.summaryTotal}>/{totalToday}</Text>
              </Text>
              <Text style={st.summaryHint}>
                {totalToday === 0
                  ? "No tasks assigned"
                  : doneToday === totalToday
                  ? "All done! 🎉"
                  : `${totalToday - doneToday} remaining`}
              </Text>
            </View>

            {/* Circular-ish progress */}
            <View style={st.summaryRight}>
              <View style={st.progressRing}>
                {/* Background track */}
                <View style={st.progressRingTrack} />
                {/* We use a simple pie-like fill with opacity trick */}
                <View style={[st.progressRingFill, {
                  opacity: progressPct > 0 ? 1 : 0,
                }]}>
                  <Text style={st.progressRingPct}>
                    {Math.round(progressPct * 100)}%
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── DATE STRIP ── */}
          <Text style={st.sectionTitle}>Select Date</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={st.dateScroll}
            contentContainerStyle={st.dateScrollContent}
          >
            {dateRange.map((d, i) => {
              const iso       = toISO(d);
              const isSel     = iso === selectedDate;
              const isToday   = iso === TODAY;
              const isPast    = iso < TODAY;
              const count     = countForDate(iso);
              const done      = doneForDate(iso);
              const allDone   = count > 0 && done === count;

              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    st.dateCard,
                    isSel      && st.dateCardActive,
                    isToday && !isSel && st.dateCardToday,
                    isPast && !isSel && st.dateCardPast,
                  ]}
                  onPress={() => setSelectedDate(iso)}
                  activeOpacity={0.8}
                >
                  <Text style={[st.dateDayLabel, isSel && st.dateLabelActive, isPast && !isSel && st.dateLabelPast]}>
                    {isToday ? "Today" : DAY_SHORT[d.getDay()]}
                  </Text>
                  <Text style={[st.dateNum, isSel && st.dateLabelActive, isPast && !isSel && st.dateLabelPast]}>
                    {String(d.getDate()).padStart(2, "0")}
                  </Text>
                  <Text style={[st.dateMonth, isSel && st.dateLabelActive, isPast && !isSel && st.dateLabelPast]}>
                    {MONTH_SHORT[d.getMonth()]}
                  </Text>

                  {/* Task badge */}
                  {count > 0 && (
                    <View style={[
                      st.dateBadge,
                      isSel     && st.dateBadgeOnWhite,
                      allDone   && st.dateBadgeDone,
                    ]}>
                      <Text style={[
                        st.dateBadgeText,
                        isSel   && st.dateBadgeTextOnWhite,
                        allDone && st.dateBadgeDoneText,
                      ]}>
                        {allDone ? "✓" : `${done}/${count}`}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── TASKS LIST ── */}
          <View style={st.tasksSection}>
            <View style={st.tasksSectionHeader}>
              <Text style={st.sectionTitle}>
                Tasks
                <Text style={st.sectionDateLabel}>
                  {" "}— {selectedDate === TODAY ? "Today" : formatFullDate(selectedDate)}
                </Text>
              </Text>
            </View>

            {/* Progress bar */}
            {totalToday > 0 && (
              <View style={st.miniProgressWrap}>
                <View style={st.miniProgressTrack}>
                  <View style={[st.miniProgressFill, {
                    width: `${progressPct * 100}%` as any,
                    backgroundColor: progressPct === 1 ? "#4ade80" : "#fff",
                  }]} />
                </View>
                <Text style={st.miniProgressLabel}>
                  {doneToday}/{totalToday} done
                </Text>
              </View>
            )}

            {/* Loading */}
            {loading ? (
              <View style={st.centerPad}>
                <ActivityIndicator color="#fff" size="large" />
              </View>
            ) : tasksForDate.length === 0 ? (
              <View style={st.emptyBox}>
                <Text style={st.emptyEmoji}>📋</Text>
                <Text style={st.emptyTitle}>No tasks assigned</Text>
                <Text style={st.emptyHint}>
                  {selectedDate < TODAY
                    ? "No tasks were assigned for this date"
                    : "Your coach hasn't assigned tasks yet"}
                </Text>
              </View>
            ) : (
              tasksForDate.map(task => (
                <View
                  key={task._id}
                  style={[st.taskCard, task.completed && st.taskCardDone]}
                >
                  {/* Left accent stripe */}
                  <View style={[st.taskStripe, task.completed && st.taskStripeDone]} />

                  <View style={st.taskContent}>
                    {/* Top row */}
                    <View style={st.taskTopRow}>
                      {task.completed ? (
                        <View style={st.doneBadge}>
                          <Text style={st.doneBadgeText}>✓ Completed</Text>
                        </View>
                      ) : (
                        <View style={st.pendingBadge}>
                          <Text style={st.pendingBadgeText}>● Pending</Text>
                        </View>
                      )}

                      {/* Actions */}
                      <View style={st.taskActions}>
                        {/* Edit — always allowed */}
                        <TouchableOpacity
                          style={st.actionBtn}
                          onPress={() => openEditModal(task)}
                          activeOpacity={0.8}
                        >
                          <Text style={st.actionBtnText}>✏️</Text>
                        </TouchableOpacity>

                        {/* Complete — only if not already done */}
                        {!task.completed && (
                          <TouchableOpacity
                            style={[st.actionBtn, st.completeBtn]}
                            onPress={() => openCompleteModal(task)}
                            activeOpacity={0.8}
                          >
                            <Text style={st.completeBtnText}>Mark Done</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {/* Title */}
                    <Text style={[st.taskTitle, task.completed && st.taskTitleDone]}>
                      {task.title}
                    </Text>

                    {/* Description */}
                    {task.description ? (
                      <Text style={st.taskDesc}>{task.description}</Text>
                    ) : null}

                    {/* Coach info */}
                    {task.coach && (
                      <Text style={st.coachLabel}>
                        👤 From: {typeof task.coach === "object" ? task.coach.name : "Coach"}
                      </Text>
                    )}

                    {/* Completion note */}
                    {task.completed && task.completionNote ? (
                      <View style={st.completionNoteBox}>
                        <Text style={st.completionNoteLabel}>Your note</Text>
                        <Text style={st.completionNoteText}>{task.completionNote}</Text>
                      </View>
                    ) : null}

                    {/* Completed at */}
                    {task.completed && task.completedAt && (
                      <Text style={st.completedAt}>
                        ✓ Completed at{" "}
                        {new Date(task.completedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>

      {/* ══════════════════════════════════════════════════════
          MARK COMPLETE MODAL
      ══════════════════════════════════════════════════════ */}
      <Modal visible={showCompleteModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={m.overlay}>
            <View style={m.sheet}>
              <View style={m.handle} />

              <View style={m.header}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={m.title}>Mark as Done ✓</Text>
                  <Text style={m.subtitle} numberOfLines={2}>
                    {completingTask?.title}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowCompleteModal(false)}
                  style={m.closeBtn}
                >
                  <Text style={m.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={m.label}>ADD A NOTE (optional)</Text>
              <TextInput
                style={[m.input, m.textarea]}
                placeholder="How did it go? Any feedback…"
                placeholderTextColor="#bbb"
                value={completionNote}
                onChangeText={setCompletionNote}
                multiline
                textAlignVertical="top"
                maxLength={300}
              />

              <TouchableOpacity
                style={[m.saveBtn, m.saveBtnGreen, completing && m.saveBtnDisabled]}
                onPress={handleComplete}
                disabled={completing}
                activeOpacity={0.88}
              >
                {completing
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={m.saveBtnText}>Mark as Completed</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowCompleteModal(false)}
                style={m.cancelBtn}
              >
                <Text style={m.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          EDIT TASK MODAL
      ══════════════════════════════════════════════════════ */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={m.overlay}>
            <View style={m.sheet}>
              <View style={m.handle} />

              <View style={m.header}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={m.title}>Edit Task</Text>
                  <Text style={m.subtitle}>Update your task details</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowEditModal(false)}
                  style={m.closeBtn}
                >
                  <Text style={m.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={m.label}>TITLE *</Text>
              <TextInput
                style={m.input}
                placeholder="Task title"
                placeholderTextColor="#bbb"
                value={editTitle}
                onChangeText={setEditTitle}
                autoFocus
                maxLength={100}
              />

              <Text style={m.label}>DESCRIPTION (optional)</Text>
              <TextInput
                style={[m.input, m.textarea]}
                placeholder="Add more details…"
                placeholderTextColor="#bbb"
                value={editDesc}
                onChangeText={setEditDesc}
                multiline
                textAlignVertical="top"
                maxLength={300}
              />

              <TouchableOpacity
                style={[m.saveBtn, saving && m.saveBtnDisabled]}
                onPress={handleEdit}
                disabled={saving}
                activeOpacity={0.88}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={m.saveBtnText}>Save Changes</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={m.cancelBtn}
              >
                <Text style={m.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </LinearGradient>
  );
}

/* ─── palette ─────────────────────────────────────────────── */
const WHITE   = "#ffffff";
const BLACK   = "#111111";
const GRAY100 = "#f5f5f5";
const GRAY200 = "#e8e8e8";
const GRAY300 = "#d4d4d4";
const GRAY500 = "#888888";
const WHITE15 = "rgba(255,255,255,0.15)";
const WHITE25 = "rgba(255,255,255,0.25)";
const WHITE60 = "rgba(255,255,255,0.60)";
const WHITE90 = "rgba(255,255,255,0.92)";

/* ─── styles ──────────────────────────────────────────────── */
const st = StyleSheet.create({
  container: { flex: 1 },
  safe:      { flex: 1 },
  scroll:    { paddingTop: 12, paddingBottom: 40 },

  /* TOP BAR */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 18,
    gap: 10,
  },
  backBtn:     { width: 36, height: 36, justifyContent: "center" },
  backText:    { fontSize: 30, color: WHITE, fontWeight: "300", lineHeight: 36 },
  pageTitle:   { fontSize: isSmall ? 22 : 26, fontWeight: "800", color: WHITE, letterSpacing: -0.5, fontFamily: "System" },
  pageSub:     { fontSize: 13, color: WHITE60, fontFamily: "Lato-Regular", marginTop: 2 },
  refreshBtn:  { width: 38, height: 38, justifyContent: "center", alignItems: "center", backgroundColor: WHITE15, borderRadius: 19 },
  refreshText: { fontSize: 22, color: WHITE, fontWeight: "300" },

  /* SUMMARY CARD */
  summaryCard: {
    backgroundColor: WHITE15,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: WHITE25,
  },
  summaryLeft:     { flex: 1 },
  summaryLabel:    { fontSize: 12, fontWeight: "700", color: WHITE60, textTransform: "uppercase", letterSpacing: 0.7, fontFamily: "Lato-Regular", marginBottom: 6 },
  summaryFraction: { fontSize: 42, fontWeight: "800", color: WHITE, fontFamily: "Lato-Regular", lineHeight: 46 },
  summaryTotal:    { fontSize: 24, fontWeight: "400", color: WHITE60 },
  summaryHint:     { fontSize: 13, color: WHITE60, marginTop: 4, fontFamily: "System" },
  summaryRight:    { alignItems: "center", justifyContent: "center" },
  progressRing: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: WHITE25,
    justifyContent: "center", alignItems: "center",
  },
  progressRingTrack: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 36,
  },
  progressRingFill: {
    justifyContent: "center", alignItems: "center",
    width: "100%", height: "100%",
  },
  progressRingPct: { fontSize: 18, fontWeight: "800", color: WHITE, fontFamily: "System" },

  /* SECTION TITLES */
  sectionTitle: {
    fontSize: isSmall ? 16 : 18,
    fontWeight: "800",
    color: WHITE,
    fontFamily: "Lato-Regular",
    marginBottom: 12,
  },
  sectionDateLabel: {
    fontWeight: "500",
    color: WHITE60,
    fontSize: isSmall ? 14 : 16,
  },

  /* DATE STRIP */
  dateScroll:        { marginHorizontal: -H_PAD, marginBottom: 24 },
  dateScrollContent: { paddingHorizontal: H_PAD, gap: 8, paddingBottom: 6 },
  dateCard: {
    alignItems: "center",
    backgroundColor: WHITE15,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
    minWidth: 58,
  },
  dateCardActive: { backgroundColor: WHITE, borderColor: WHITE },
  dateCardToday:  { borderColor: WHITE60 },
  dateCardPast:   { opacity: 0.5 },
  dateDayLabel:   { fontSize: 10, fontWeight: "700", color: WHITE60, fontFamily: "Lato-Regular", marginBottom: 4 },
  dateNum:        { fontSize: 20, fontWeight: "800", color: WHITE, fontFamily: "System" },
  dateMonth:      { fontSize: 10, color: WHITE60, fontFamily: "Lato-Regular", marginTop: 2 },
  dateLabelActive:{ color: BLACK },
  dateLabelPast:  { color: WHITE25 },
  dateBadge: {
    marginTop: 6,
    backgroundColor: WHITE25,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  dateBadgeOnWhite: { backgroundColor: "rgba(0,0,0,0.12)" },
  dateBadgeDone:    { backgroundColor: "rgba(74,222,128,0.3)" },
  dateBadgeText:    { fontSize: 10, fontWeight: "700", color: WHITE, fontFamily: "System" },
  dateBadgeTextOnWhite: { color: BLACK },
  dateBadgeDoneText:    { color: "#4ade80" },

  /* TASKS SECTION */
  tasksSection:       { marginBottom: 8 },
  tasksSectionHeader: { marginBottom: 6 },

  /* MINI PROGRESS BAR */
  miniProgressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  miniProgressTrack: {
    flex: 1, height: 5, backgroundColor: WHITE25, borderRadius: 3, overflow: "hidden",
  },
  miniProgressFill: { height: 5, borderRadius: 3 },
  miniProgressLabel:{ fontSize: 12, color: WHITE60, fontFamily: "Lato-Regular", width: 56, textAlign: "right" },

  /* TASK CARDS */
  taskCard: {
    flexDirection: "row",
    backgroundColor: WHITE90,
    borderRadius: 18,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  taskCardDone: { opacity: 0.8 },
  taskStripe:     { width: 4, backgroundColor: BLACK },
  taskStripeDone: { backgroundColor: "#4ade80" },
  taskContent: { flex: 1, padding: 14 },

  taskTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  doneBadge: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  doneBadgeText: { fontSize: 11, fontWeight: "700", color: "#065f46", fontFamily: "System" },
  pendingBadge: {
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pendingBadgeText: { fontSize: 11, fontWeight: "600", color: GRAY500, fontFamily: "System" },

  taskActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: GRAY100,
    justifyContent: "center", alignItems: "center",
  },
  actionBtnText: { fontSize: 15 },
  completeBtn: {
    width: "auto",
    paddingHorizontal: 12,
    backgroundColor: BLACK,
    borderRadius: 17,
  },
  completeBtnText: { fontSize: 12, fontWeight: "700", color: WHITE, fontFamily: "System" },

  taskTitle: {
    fontSize: isSmall ? 14 : 15,
    fontWeight: "700",
    color: BLACK,
    fontFamily: "Lato-Regular",
    marginBottom: 4,
  },
  taskTitleDone: { textDecorationLine: "line-through", color: GRAY500 },
  taskDesc: {
    fontSize: 13, color: GRAY500,
    fontFamily: "Lato-Regular", lineHeight: 18, marginBottom: 6,
  },
  coachLabel: {
    fontSize: 11, color: GRAY500,
    fontFamily: "Lato-Regular", marginTop: 4,
  },
  completionNoteBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#4ade80",
  },
  completionNoteLabel: {
    fontSize: 10, fontWeight: "700",
    color: GRAY500, textTransform: "uppercase",
    letterSpacing: 0.5, marginBottom: 3,
  },
  completionNoteText: { fontSize: 13, color: BLACK, fontFamily: "Lato-Regular", lineHeight: 18 },
  completedAt: {
    fontSize: 11, color: "#4ade80",
    fontFamily: "Lato-Regular", marginTop: 6, fontWeight: "600",
  },

  /* EMPTY */
  centerPad: { paddingVertical: 40, alignItems: "center" },
  emptyBox: {
    backgroundColor: WHITE15,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: WHITE25,
    gap: 6,
  },
  emptyEmoji: { fontSize: 38, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: WHITE, fontFamily: "System" },
  emptyHint:  { fontSize: 13, color: WHITE60, fontFamily: "Lato-Regular", textAlign: "center" },
});

/* ─── Modal styles ────────────────────────────────────────── */
const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: H_PAD + 4,
    paddingTop: 12,
    maxHeight: SCREEN_H * 0.75,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: GRAY300,
    alignSelf: "center",
    marginBottom: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title:    { fontSize: 20, fontWeight: "800", color: BLACK, fontFamily: "System" },
  subtitle: { fontSize: 13, color: GRAY500, fontFamily: "Lato-Regular", marginTop: 3 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: GRAY100,
    justifyContent: "center", alignItems: "center",
  },
  closeBtnText: { fontSize: 14, fontWeight: "700", color: BLACK },
  label: {
    fontSize: 10, fontWeight: "800",
    color: GRAY500, letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8, fontFamily: "Lato-Regular",
  },
  input: {
    backgroundColor: GRAY100,
    color: BLACK,
    borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, fontFamily: "Lato-Regular",
    borderWidth: 1, borderColor: GRAY200,
    marginBottom: 16,
  },
  textarea: { height: 100, paddingTop: 13, textAlignVertical: "top" },
  saveBtn: {
    backgroundColor: BLACK,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnGreen:    { backgroundColor: "#16a34a" },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText:     { color: WHITE, fontWeight: "800", fontSize: 16, fontFamily: "System" },
  cancelBtn:       { marginTop: 12, marginBottom: 8, alignItems: "center" },
  cancelText:      { color: GRAY500, fontSize: 14, fontFamily: "System" },
});