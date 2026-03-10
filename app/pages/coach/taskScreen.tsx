import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
  View
} from "react-native";
import { ClientUser, useAuthStore } from "../../../store/auth";
import { Task, useTaskStore } from "../../../store/useTaskStore";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const H_PAD  = Math.round(SCREEN_W * 0.045);
const isSmall = SCREEN_W < 375;

/* ─── helpers ─────────────────────────────────────────────── */
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const TODAY = toISO(new Date());

const isPast = (dateStr: string) => dateStr < TODAY;

/** Build next 30 days starting today */
const buildDateRange = (): Date[] => {
  const days: Date[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
};

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_SHORT   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

/* ════════════════════════════════════════════════════════════ */
export default function CoachTasksScreen() {
  const router = useRouter();
  const { coachTasks, loading, error, fetchCoachTasks, createTask, updateTask, deleteTask } = useTaskStore();

  /* ── client state from useAuthStore ── */
  const { coachClients, clientsLoading, clientsError, fetchCoachClients } = useAuthStore();
  const [filtered, setFiltered]         = useState<ClientUser[]>([]);
  const [search, setSearch]             = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientUser | null>(null);
  const [showClientList, setShowClientList] = useState(true);

  /* ── date state ── */
  const [dateRange]         = useState(buildDateRange());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  /* ── task modal state ── */
  const [showTaskModal, setShowTaskModal]   = useState(false);
  const [editingTask, setEditingTask]       = useState<Task | null>(null);
  const [taskTitle, setTaskTitle]           = useState("");
  const [taskDesc, setTaskDesc]             = useState("");
  const [saving, setSaving]                 = useState(false);

  /* ── fetch clients on mount ── */
  useEffect(() => {
    fetchCoachClients();
    fetchCoachTasks().catch(() => {});
  }, []);

  /* ── search filter ── */
  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) { setFiltered(coachClients); return; }
    setFiltered(
      coachClients.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      )
    );
  }, [search, coachClients]);

  /* ── tasks for selected client + date ── */
  const getClientId = (c: any): string =>
    typeof c === "object" && c !== null ? c._id : String(c);

  const tasksForDate: Task[] = selectedClient && selectedDate
    ? coachTasks.filter(
        t => getClientId(t.client) === selectedClient._id && t.date === selectedDate
      )
    : [];

  /* ── task counts per date for badges ── */
  const taskCountForDate = (dateStr: string): number => {
    if (!selectedClient) return 0;
    return coachTasks.filter(
      t => getClientId(t.client) === selectedClient._id && t.date === dateStr
    ).length;
  };

  /* ── select client ── */
  const handleSelectClient = (client: ClientUser) => {
    setSelectedClient(client);
    setShowClientList(false);
    setSelectedDate(null);
    setSearch("");
  };

  /* ── open add modal ── */
  const openAddModal = () => {
    if (!selectedDate || isPast(selectedDate)) return;
    setEditingTask(null);
    setTaskTitle("");
    setTaskDesc("");
    setShowTaskModal(true);
  };

  /* ── open edit modal ── */
  const openEditModal = (task: Task) => {
    if (isPast(task.date)) return;
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description ?? "");
    setShowTaskModal(true);
  };

  /* ── save task ── */
  const handleSaveTask = async () => {
    if (!taskTitle.trim()) return Alert.alert("Missing title", "Please enter a task title.");
    if (!selectedClient || !selectedDate) return;
    setSaving(true);
    try {
      if (editingTask) {
        await updateTask(editingTask._id, { title: taskTitle.trim(), description: taskDesc.trim() });
      } else {
        await createTask(selectedClient._id, taskTitle.trim(), taskDesc.trim(), selectedDate);
      }
      setShowTaskModal(false);
    } catch (e) {
      Alert.alert("Error", "Failed to save task.");
    } finally {
      setSaving(false);
    }
  };

  /* ── delete task ── */
  const handleDeleteTask = (task: Task) => {
    Alert.alert(
      "Delete Task",
      `Delete "${task.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            try { await deleteTask(task._id); }
            catch { Alert.alert("Error", "Failed to delete task."); }
          },
        },
      ]
    );
  };

  /* ── avatar helpers ── */
  const avatarUri = (c: ClientUser) =>
    c.avatar
      ? c.avatar.startsWith("http") ? c.avatar : `http://sculptbyashton.com:5000${c.avatar}`
      : null;

  const initials = (c: ClientUser) =>
    `${c.firstName?.[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase();

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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[st.scroll, { paddingHorizontal: H_PAD }]}
          >

            {/* ── TOP BAR ── */}
            <View style={st.topBar}>
              <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
                <Text style={st.backText}>‹</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={st.pageTitle}>Task Manager</Text>
                <Text style={st.pageSub}>Assign & manage client tasks</Text>
              </View>
            </View>

            {/* ══════════════════════════════════════════════════
                SECTION 1 — CLIENT SELECTOR
            ══════════════════════════════════════════════════ */}

            {/* Selected client chip — shown when a client is chosen */}
            {selectedClient && (
              <View style={st.selectedChipRow}>
                <View style={st.selectedChip}>
                  <View style={st.chipAvatarWrap}>
                    {avatarUri(selectedClient) ? (
                      <Image source={{ uri: avatarUri(selectedClient)! }} style={st.chipAvatar} />
                    ) : (
                      <View style={st.chipAvatarFallback}>
                        <Text style={st.chipAvatarText}>{initials(selectedClient)}</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.chipName}>{selectedClient.firstName} {selectedClient.lastName}</Text>
                    <Text style={st.chipEmail} numberOfLines={1}>{selectedClient.email}</Text>
                  </View>
                  <TouchableOpacity
                    style={st.changeClientBtn}
                    onPress={() => setShowClientList(v => !v)}
                    activeOpacity={0.8}
                  >
                    <Text style={st.changeClientText}>
                      {showClientList ? "Hide ▲" : "Change ▼"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Client list — visible initially or when toggled */}
            {showClientList && (
              <View style={st.clientSection}>
                {!selectedClient && (
                  <Text style={st.sectionTitle}>Select Client</Text>
                )}

                {/* Search */}
                <View style={st.searchBar}>
                  <Text style={st.searchIcon}>🔍</Text>
                  <TextInput
                    style={st.searchInput}
                    placeholder="Search by name or email…"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={search}
                    onChangeText={setSearch}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch("")}>
                      <Text style={st.clearText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Client list */}
                {clientsLoading ? (
                  <View style={st.centerPad}>
                    <ActivityIndicator color="#fff" />
                  </View>
                ) : clientsError ? (
                  <View style={st.emptyBox}>
                    <Text style={st.emptyEmoji}>⚠️</Text>
                    <Text style={st.emptyText}>Could not load clients</Text>
                    <Text style={st.emptyHint}>{clientsError}</Text>
                    <TouchableOpacity onPress={() => fetchCoachClients()} style={st.retryBtn} activeOpacity={0.8}>
                      <Text style={st.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : filtered.length === 0 ? (
                  <View style={st.emptyBox}>
                    <Text style={st.emptyEmoji}>👥</Text>
                    <Text style={st.emptyText}>No clients found</Text>
                  </View>
                ) : (
                  <View style={st.clientList}>
                    {filtered.map(client => (
                      <TouchableOpacity
                        key={client._id}
                        style={[
                          st.clientRow,
                          selectedClient?._id === client._id && st.clientRowActive,
                        ]}
                        onPress={() => handleSelectClient(client)}
                        activeOpacity={0.82}
                      >
                        <View style={st.clientAvatarWrap}>
                          {avatarUri(client) ? (
                            <Image source={{ uri: avatarUri(client)! }} style={st.clientAvatar} />
                          ) : (
                            <View style={st.clientAvatarFallback}>
                              <Text style={st.clientAvatarText}>{initials(client)}</Text>
                            </View>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={st.clientName}>{client.firstName} {client.lastName}</Text>
                          <Text style={st.clientEmail} numberOfLines={1}>{client.email}</Text>
                        </View>
                        <Text style={st.clientArrow}>›</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ══════════════════════════════════════════════════
                SECTION 2 — DATE STRIP (only after client picked)
            ══════════════════════════════════════════════════ */}
            {selectedClient && !showClientList && (
              <>
                <View style={[st.sectionHeader, { marginTop: 24 }]}>
                  <Text style={st.sectionTitle}>Pick a Date</Text>
                  <Text style={st.sectionSub}>Next 30 days</Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={st.dateScroll}
                  contentContainerStyle={st.dateScrollContent}
                >
                  {dateRange.map((d, i) => {
                    const iso     = toISO(d);
                    const isSel   = iso === selectedDate;
                    const isToday = iso === TODAY;
                    const count   = taskCountForDate(iso);
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[
                          st.dateCard,
                          isSel && st.dateCardActive,
                          isToday && !isSel && st.dateCardToday,
                        ]}
                        onPress={() => setSelectedDate(iso)}
                        activeOpacity={0.8}
                      >
                        <Text style={[st.dateDayLabel, isSel && st.dateLabelActive]}>
                          {isToday ? "Today" : DAY_SHORT[d.getDay()]}
                        </Text>
                        <Text style={[st.dateNum, isSel && st.dateLabelActive]}>
                          {String(d.getDate()).padStart(2, "0")}
                        </Text>
                        <Text style={[st.dateMonth, isSel && st.dateLabelActive]}>
                          {MONTH_SHORT[d.getMonth()]}
                        </Text>
                        {count > 0 && (
                          <View style={[st.dateBadge, isSel && st.dateBadgeActive]}>
                            <Text style={[st.dateBadgeText, isSel && st.dateBadgeTextActive]}>
                              {count}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* ══════════════════════════════════════════════
                    SECTION 3 — TASKS for selected date
                ══════════════════════════════════════════════ */}
                {selectedDate && (
                  <View style={{ marginTop: 24 }}>

                    {/* Task section header */}
                    <View style={st.sectionHeader}>
                      <View>
                        <Text style={st.sectionTitle}>
                          Tasks
                          <Text style={st.sectionTitleDate}>
                            {" "}— {selectedDate === TODAY ? "Today" :
                              (() => {
                                const d = new Date(selectedDate + "T00:00:00");
                                return `${DAY_SHORT[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
                              })()}
                          </Text>
                        </Text>
                        <Text style={st.sectionSub}>
                          {tasksForDate.length} task{tasksForDate.length !== 1 ? "s" : ""} assigned
                        </Text>
                      </View>

                      {/* Add button — disabled for past */}
                      <TouchableOpacity
                        style={[st.addBtn, isPast(selectedDate) && st.addBtnDisabled]}
                        onPress={openAddModal}
                        disabled={isPast(selectedDate)}
                        activeOpacity={0.85}
                      >
                        <Text style={st.addBtnText}>+ Add</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Past date notice */}
                    {isPast(selectedDate) && (
                      <View style={st.pastNotice}>
                        <Text style={st.pastNoticeText}>
                          📅 Past date — tasks are read-only
                        </Text>
                      </View>
                    )}

                    {/* Inline error banner — tappable retry, never blocks task list */}
                    {error && (
                      <TouchableOpacity
                        style={st.errorBanner}
                        onPress={() => fetchCoachTasks()}
                        activeOpacity={0.8}
                      >
                        <Text style={st.errorBannerText}>⚠️ {error} — Tap to retry</Text>
                      </TouchableOpacity>
                    )}

                    {/* Loading / Empty / Tasks */}
                    {loading ? (
                      <View style={st.centerPad}>
                        <ActivityIndicator color="#fff" />
                      </View>
                    ) : tasksForDate.length === 0 ? (
                      <View style={st.emptyBox}>
                        <Text style={st.emptyEmoji}>📋</Text>
                        <Text style={st.emptyText}>No tasks for this date</Text>
                        {!isPast(selectedDate) && (
                          <Text style={st.emptyHint}>Tap "+ Add" to create one</Text>
                        )}
                      </View>
                    ) : (
                      tasksForDate.map(task => (
                        <View
                          key={task._id}
                          style={[st.taskCard, task.completed && st.taskCardDone]}
                        >
                          {/* Completion indicator */}
                          <View style={[st.taskAccent, task.completed && st.taskAccentDone]} />

                          <View style={st.taskBody}>
                            <View style={st.taskTopRow}>
                              {task.completed && (
                                <View style={st.doneBadge}>
                                  <Text style={st.doneBadgeText}>✓ Done</Text>
                                </View>
                              )}
                            </View>
                            <Text style={[st.taskTitle, task.completed && st.taskTitleDone]}>
                              {task.title}
                            </Text>
                            {task.description ? (
                              <Text style={st.taskDesc}>{task.description}</Text>
                            ) : null}
                            {task.completionNote ? (
                              <View style={st.completionNoteBox}>
                                <Text style={st.completionNoteLabel}>Client note:</Text>
                                <Text style={st.completionNoteText}>{task.completionNote}</Text>
                              </View>
                            ) : null}
                          </View>

                          {/* Actions — only for today/future */}
                          {!isPast(selectedDate) && (
                            <View style={st.taskActions}>
                              <TouchableOpacity
                                style={st.editBtn}
                                onPress={() => openEditModal(task)}
                                activeOpacity={0.8}
                              >
                                <Text style={st.editBtnText}>✏️</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={st.deleteBtn}
                                onPress={() => handleDeleteTask(task)}
                                activeOpacity={0.8}
                              >
                                <Text style={st.deleteBtnText}>🗑</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* Placeholder when no date selected */}
                {!selectedDate && (
                  <View style={[st.emptyBox, { marginTop: 16 }]}>
                    <Text style={st.emptyEmoji}>👆</Text>
                    <Text style={st.emptyText}>Select a date above</Text>
                    <Text style={st.emptyHint}>to view or assign tasks</Text>
                  </View>
                )}
              </>
            )}

            <View style={{ height: 80 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ══════════════════════════════════════════════════════
          TASK ADD / EDIT MODAL
      ══════════════════════════════════════════════════════ */}
      <Modal visible={showTaskModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={m.overlay}>
            <View style={m.sheet}>

              {/* Sheet handle */}
              <View style={m.handle} />

              {/* Header */}
              <View style={m.header}>
                <View>
                  <Text style={m.title}>{editingTask ? "Edit Task" : "New Task"}</Text>
                  {selectedClient && (
                    <Text style={m.subtitle}>
                      For {selectedClient.firstName} · {selectedDate === TODAY ? "Today" : selectedDate}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => setShowTaskModal(false)}
                  style={m.closeBtn}
                >
                  <Text style={m.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Title field */}
              <Text style={m.label}>TASK TITLE *</Text>
              <TextInput
                style={m.input}
                placeholder="e.g. Complete 10 push-ups"
                placeholderTextColor="#bbb"
                value={taskTitle}
                onChangeText={setTaskTitle}
                autoFocus
                maxLength={100}
              />

              {/* Description field */}
              <Text style={m.label}>DESCRIPTION (optional)</Text>
              <TextInput
                style={[m.input, m.textarea]}
                placeholder="Add more details…"
                placeholderTextColor="#bbb"
                value={taskDesc}
                onChangeText={setTaskDesc}
                multiline
                textAlignVertical="top"
                maxLength={300}
              />

              {/* Save */}
              <TouchableOpacity
                style={[m.saveBtn, saving && m.saveBtnDisabled]}
                onPress={handleSaveTask}
                disabled={saving}
                activeOpacity={0.88}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={m.saveBtnText}>{editingTask ? "Save Changes" : "Create Task"}</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowTaskModal(false)}
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
const WHITE90 = "rgba(255,255,255,0.90)";

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
  backBtn:  { width: 36, height: 36, justifyContent: "center" },
  backText: { fontSize: 30, color: WHITE, fontWeight: "300", lineHeight: 36 },
  pageTitle:{
    fontSize: isSmall ? 22 : 26,
    fontWeight: "800",
    color: WHITE,
    letterSpacing: -0.5,
    fontFamily: "System",
  },
  pageSub: {
    fontSize: 13,
    color: WHITE60,
    fontFamily: "System",
    marginTop: 2,
  },

  /* SECTION HEADERS */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: isSmall ? 16 : 18,
    fontWeight: "800",
    color: WHITE,
    fontFamily: "System",
  },
  sectionTitleDate: {
    fontWeight: "500",
    color: WHITE60,
  },
  sectionSub: {
    fontSize: 12,
    color: WHITE60,
    marginTop: 2,
    fontFamily: "System",
  },

  /* SELECTED CLIENT CHIP */
  selectedChipRow: { marginBottom: 8 },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE15,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: WHITE25,
    gap: 10,
  },
  chipAvatarWrap: { width: 34, height: 34, borderRadius: 17, overflow: "hidden" },
  chipAvatar:     { width: "100%", height: "100%" },
  chipAvatarFallback: {
    width: "100%", height: "100%",
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  chipAvatarText: { color: WHITE, fontWeight: "800", fontSize: 12 },
  chipName:  { fontSize: 13, fontWeight: "700", color: WHITE, fontFamily: "System" },
  chipEmail: { fontSize: 11, color: WHITE60, fontFamily: "System", marginTop: 1 },
  changeClientBtn: {
    backgroundColor: WHITE25,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  changeClientText: { fontSize: 12, fontWeight: "700", color: WHITE, fontFamily: "System" },

  /* CLIENT SECTION */
  clientSection: { marginTop: 4 },

  /* SEARCH BAR */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE15,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: WHITE25,
    gap: 10,
  },
  searchIcon:  { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: WHITE,
    fontFamily: "System",
  },
  clearText: { fontSize: 13, color: WHITE60, padding: 4 },

  /* CLIENT LIST */
  clientList: { gap: 8 },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE15,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 10,
  },
  clientRowActive: {
    borderColor: WHITE60,
    backgroundColor: WHITE25,
  },
  clientAvatarWrap: {
    width: 34, height: 34, borderRadius: 17, overflow: "hidden",
  },
  clientAvatar: { width: "100%", height: "100%" },
  clientAvatarFallback: {
    width: "100%", height: "100%",
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  clientAvatarText: { color: WHITE, fontWeight: "800", fontSize: 12 },
  clientName:  { fontSize: 13, fontWeight: "700", color: WHITE, fontFamily: "System" },
  clientEmail: { fontSize: 11, color: WHITE60, marginTop: 1, fontFamily: "System" },
  clientArrow: { fontSize: 18, color: WHITE60 },

  /* DATE SCROLL */
  dateScroll:        { marginHorizontal: -H_PAD },
  dateScrollContent: { paddingHorizontal: H_PAD, gap: 10, paddingVertical: 4, paddingBottom: 8 },
  dateCard: {
    alignItems: "center",
    backgroundColor: WHITE15,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
    minWidth: 52,
  },
  dateCardActive: {
    backgroundColor: WHITE,
    borderColor: WHITE,
  },
  dateCardToday: {
    borderColor: WHITE60,
  },
  dateDayLabel: { fontSize: 10, fontWeight: "600", color: WHITE60, fontFamily: "System", marginBottom: 3 },
  dateNum:      { fontSize: 17, fontWeight: "800", color: WHITE,   fontFamily: "System" },
  dateMonth:    { fontSize: 10, color: WHITE60, fontFamily: "System", marginTop: 1 },
  dateLabelActive: { color: BLACK },
  dateBadge: {
    marginTop: 6,
    backgroundColor: WHITE25,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: "center",
  },
  dateBadgeActive: { backgroundColor: BLACK },
  dateBadgeText:   { fontSize: 11, fontWeight: "700", color: WHITE, fontFamily: "System" },
  dateBadgeTextActive: { color: WHITE },

  /* PAST NOTICE */
  pastNotice: {
    backgroundColor: "rgba(255,200,0,0.12)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,200,0,0.25)",
  },
  pastNoticeText: { fontSize: 13, color: "rgba(255,220,80,0.9)", fontFamily: "System", fontWeight: "600" },

  /* ADD BUTTON */
  addBtn: {
    backgroundColor: WHITE,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnDisabled: { backgroundColor: WHITE25, opacity: 0.5 },
  addBtnText:     { fontSize: 14, fontWeight: "800", color: BLACK, fontFamily: "System" },

  /* TASK CARDS */
  taskCard: {
    flexDirection: "row",
    backgroundColor: WHITE90,
    borderRadius: 14,
    marginBottom: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  taskCardDone: { opacity: 0.75 },
  taskAccent: {
    width: 4,
    backgroundColor: BLACK,
  },
  taskAccentDone: { backgroundColor: "#4ade80" },
  taskBody: {
    flex: 1,
    padding: 11,
  },
  taskTopRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  doneBadge: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  doneBadgeText: { fontSize: 11, fontWeight: "700", color: "#065f46", fontFamily: "System" },
  taskTitle: {
    fontSize: isSmall ? 14 : 15,
    fontWeight: "700",
    color: BLACK,
    fontFamily: "System",
    marginBottom: 4,
  },
  taskTitleDone: { textDecorationLine: "line-through", color: GRAY500 },
  taskDesc: {
    fontSize: 13,
    color: GRAY500,
    fontFamily: "System",
    lineHeight: 18,
  },
  completionNoteBox: {
    backgroundColor: GRAY100,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#4ade80",
  },
  completionNoteLabel: { fontSize: 10, fontWeight: "700", color: GRAY500, textTransform: "uppercase", marginBottom: 2 },
  completionNoteText:  { fontSize: 12, color: BLACK, fontFamily: "System" },

  taskActions: {
    justifyContent: "center",
    alignItems: "center",
    paddingRight: 12,
    gap: 8,
  },
  editBtn:   { padding: 8 },
  deleteBtn: { padding: 8 },
  editBtnText:   { fontSize: 18 },
  deleteBtnText: { fontSize: 18 },

  /* EMPTY / LOADING */
  centerPad: { paddingVertical: 32, alignItems: "center" },
  emptyBox: {
    backgroundColor: WHITE15,
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: WHITE25,
    gap: 6,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 4 },
  emptyText:  { fontSize: 15, fontWeight: "700", color: WHITE, fontFamily: "System" },
  emptyHint:  { fontSize: 12, color: WHITE60, fontFamily: "System" },
  retryBtn: {
    marginTop: 14,
    backgroundColor: WHITE,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: { fontSize: 13, fontWeight: "700", color: BLACK, fontFamily: "System" },
  errorBanner: {
    backgroundColor: "rgba(255,60,60,0.15)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,60,60,0.3)",
  },
  errorBannerText: { fontSize: 12, color: "#ff8080", fontFamily: "System", fontWeight: "600", textAlign: "center" },
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
    maxHeight: SCREEN_H * 0.78,
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
  subtitle: { fontSize: 13, color: GRAY500, fontFamily: "System", marginTop: 3 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: GRAY100,
    justifyContent: "center", alignItems: "center",
  },
  closeBtnText: { fontSize: 14, fontWeight: "700", color: BLACK },

  label: {
    fontSize: 10,
    fontWeight: "800",
    color: GRAY500,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    fontFamily: "System",
  },
  input: {
    backgroundColor: GRAY100,
    color: BLACK,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: "System",
    borderWidth: 1,
    borderColor: GRAY200,
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
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: { color: WHITE, fontWeight: "800", fontSize: 16, fontFamily: "System" },
  cancelBtn: { marginTop: 12, marginBottom: 8, alignItems: "center" },
  cancelText: { color: GRAY500, fontSize: 14, fontFamily: "System" },
});