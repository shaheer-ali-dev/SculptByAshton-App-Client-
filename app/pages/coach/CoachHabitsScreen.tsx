import useProgramStore from "@/store/useProgramStore";
import api from "@/utils/api";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const BASE_URL  = "http://sculptbyashton.com:5000";
const BAR_MAX_H = 100;
const STEP_GOAL = 10000;

/* ─── types ─────────────────────────────────────────────────── */
interface Habit {
  _id:     string;
  title:   string;
  type:    "boolean" | "number";
  target?: number;
  client:  string;
}
interface StepEntry { date: string; steps: number; }

/* ─── helpers ────────────────────────────────────────────────── */
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

const MONTH_SHORT     = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES       = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const WEEK_DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const avatarUri = (u: any) =>
  u?.avatar
    ? u.avatar.startsWith("http") ? u.avatar : `${BASE_URL}${u.avatar}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
        `${u?.firstName || "U"} ${u?.lastName || ""}`
      )}&background=111111&color=ffffff&size=80`;

/* ════════════════════════════════════════════════════════════
   COACH HABITS SCREEN
════════════════════════════════════════════════════════════ */
export default function CoachHabitsScreen() {
  const router = useRouter();

  const getClients   = useProgramStore(s => s.getClients);
  const clients      = useProgramStore(s => s.clients);
  const storeLoading = useProgramStore(s => s.loading);

  const [selectedClient, setSelectedClient] = useState<any>(null);

  const [habits,      setHabits]      = useState<Habit[]>([]);
  const [logs,        setLogs]        = useState<Record<string, any>>({});
  const [weekSteps,   setWeekSteps]   = useState<StepEntry[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [weekDays]     = useState(buildWeekDays());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedISO = toISO(selectedDate);
  const isToday     = selectedISO === toISO(new Date());

  const [showPicker, setShowPicker] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit,   setShowEdit]   = useState(false);
  const [editTarget, setEditTarget] = useState<Habit | null>(null);

  const [fTitle,  setFTitle]  = useState("");
  const [fType,   setFType]   = useState<"boolean" | "number">("boolean");
  const [fTarget, setFTarget] = useState("");
  const [fSaving, setFSaving] = useState(false);

  const [search, setSearch] = useState("");

  useEffect(() => { getClients(); }, []);

  /* ════ load data for selected client ════
     FIX: use /habits/coach/client/:id, /habits/coach/logs/:id/:date,
          /habits/coach/steps/:id/:date  — the correct coach endpoints
  ════════════════════════════════════════ */
  const loadClientData = useCallback(async (clientId: string) => {
    setDataLoading(true);
    try {
      /* 1) all habits the coach has assigned to this client */
      const habRes = await api.get(`/habits/coach/client/${clientId}`);
      setHabits(Array.isArray(habRes.data) ? habRes.data : []);
      console.log("Loaded habits for client:", clientId, habRes.data);

      /* 2) logs for the selected date */
      const logRes = await api.get(`/habits/coach/logs/${clientId}/${selectedISO}`);
      const map: Record<string, any> = {};
      (Array.isArray(logRes.data) ? logRes.data : []).forEach((l: any) => {
        map[l.habit] = l.value;
      });
      setLogs(map);
      console.log("Loaded logs for", selectedISO, ":", logRes.data);

      /* 3) steps for all 7 days of the current week (parallel requests) */
      const stepResults = await Promise.all(
        weekDays.map(d =>
          api.get(`/habits/coach/steps/${clientId}/${toISO(d)}`)
            .then(r => ({ date: toISO(d), steps: r.data?.steps ?? 0 }))
            .catch(() => ({ date: toISO(d), steps: 0 }))
        )
      );
      setWeekSteps(stepResults);
      console.log("Loaded week steps:", stepResults);
    } catch (e: any) {
      console.error("loadClientData error:", e?.response?.data || e.message);
      Alert.alert("Error", "Failed to load client data. Check console for details.");
    } finally {
      setDataLoading(false);
    }
  }, [selectedISO, weekDays]);

  useEffect(() => {
    if (selectedClient?._id) loadClientData(selectedClient._id);
  }, [selectedClient, selectedISO]);

  /* ════ CRUD ════ */
  const resetForm = () => {
    setFTitle(""); setFType("boolean"); setFTarget(""); setEditTarget(null);
  };

  const createHabit = async () => {
    if (!fTitle.trim())  return Alert.alert("Missing title", "Enter a habit name.");
    if (!selectedClient) return Alert.alert("No client", "Select a client first.");
    setFSaving(true);
    try {
      /* POST /habits — coach creates habit for client */
      const res = await api.post("/habits", {
        clientId: selectedClient._id,
        title:    fTitle.trim(),
        type:     fType,
        target:   fType === "number" && fTarget ? Number(fTarget) : undefined,
      });
      setHabits(p => [...p, res.data]);
      resetForm();
      setShowCreate(false);
      Alert.alert("Done ✓", `"${fTitle.trim()}" assigned to ${selectedClient.firstName}.`);
    } catch (e: any) {
      console.error("createHabit error:", e?.response?.data || e.message);
      Alert.alert("Error", e?.response?.data?.msg || "Failed to create habit.");
    } finally {
      setFSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editTarget || !fTitle.trim()) return;
    setFSaving(true);
    try {
      /* PUT /habits/:habitId — coach edits habit */
      const res = await api.put(`/habits/${editTarget._id}`, {
        title:  fTitle.trim(),
        type:   fType,
        target: fType === "number" && fTarget ? Number(fTarget) : undefined,
      });
      setHabits(p => p.map(h => h._id === editTarget._id ? res.data : h));
      setShowEdit(false);
      resetForm();
    } catch (e: any) {
      console.error("saveEdit error:", e?.response?.data || e.message);
      Alert.alert("Error", e?.response?.data?.msg || "Failed to update habit.");
    } finally {
      setFSaving(false);
    }
  };

  const deleteHabit = (h: Habit) =>
    Alert.alert("Delete", `Delete "${h.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            /* DELETE /habits/:habitId */
            await api.delete(`/habits/${h._id}`);
            setHabits(p => p.filter(x => x._id !== h._id));
          } catch (e: any) {
            console.error("deleteHabit error:", e?.response?.data || e.message);
            Alert.alert("Error", "Failed to delete habit.");
          }
        },
      },
    ]);

  const openEdit = (h: Habit) => {
    setEditTarget(h);
    setFTitle(h.title);
    setFType(h.type);
    setFTarget(h.target?.toString() ?? "");
    setShowEdit(true);
  };

  /* ════ derived ════ */
  const completedCount = habits.filter(h => {
    const v = logs[h._id];
    return v != null && v !== false;
  }).length;
  const progress  = habits.length > 0 ? completedCount / habits.length : 0;
  const todaySteps = weekSteps.find(e => e.date === toISO(new Date()))?.steps ?? 0;
  const maxSteps   = Math.max(...weekSteps.map(e => e.steps), STEP_GOAL, 1);

  const filteredClients = (clients || []).filter((c: any) => {
    const q = search.toLowerCase();
    return !q
      || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)
      || c.email?.toLowerCase().includes(q);
  });

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <LinearGradient
      colors={["#000000", "#555555", "#ffffff"]}
locations={[0, 0.5, 1]}
start={{x:0.5, y:0}}
end={{x:0.5, y:1}}
      style={s.container}
    >
      <SafeAreaView style={s.safe}>

        {/* ── TOP BAR ── */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={s.pageTitle}>Client Habits</Text>
          <TouchableOpacity
            style={[s.addBtn, !selectedClient && s.addBtnDisabled]}
            onPress={() => { if (!selectedClient) return; resetForm(); setShowCreate(true); }}
          >
            <Text style={s.addBtnText}>＋</Text>
          </TouchableOpacity>
        </View>

        {/* ── CLIENT SELECTOR CARD ── */}
        <TouchableOpacity
          style={s.clientCard}
          onPress={() => setShowPicker(true)}
          activeOpacity={0.85}
        >
          {selectedClient ? (
            <View style={s.clientCardInner}>
              <Image source={{ uri: avatarUri(selectedClient) }} style={s.clientAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={s.clientCardName}>{selectedClient.firstName} {selectedClient.lastName}</Text>
                <Text style={s.clientCardEmail}>{selectedClient.email}</Text>
              </View>
              <View style={s.changeChip}>
                <Text style={s.changeChipText}>Switch ›</Text>
              </View>
            </View>
          ) : (
            <View style={s.clientCardInner}>
              <View style={s.clientCardEmpty}>
                <Text style={{ fontSize: 22 }}>👤</Text>
              </View>
              <Text style={s.clientCardEmptyText}>Tap to select a client</Text>
              {storeLoading
                ? <ActivityIndicator color="#aaa" size="small" />
                : <Text style={s.clientCardChevron}>›</Text>
              }
            </View>
          )}
        </TouchableOpacity>

        {/* ── NO CLIENT SELECTED ── */}
        {!selectedClient ? (
          <View style={s.emptyScreen}>
            <Text style={s.emptyScreenEmoji}>🏋️</Text>
            <Text style={s.emptyScreenTitle}>No client selected</Text>
            <Text style={s.emptyScreenSub}>
              Select a client above to view their habits, steps graph and progress
            </Text>
            <TouchableOpacity style={s.emptyScreenBtn} onPress={() => setShowPicker(true)}>
              <Text style={s.emptyScreenBtnText}>Browse clients</Text>
            </TouchableOpacity>
          </View>

        ) : dataLoading ? (
          <View style={s.emptyScreen}>
            <ActivityIndicator size="large" color="#111" />
            <Text style={[s.emptyScreenSub, { marginTop: 12 }]}>Loading data…</Text>
          </View>

        ) : (
          <>
            {/* ── DATE STRIP ── */}
            <View style={s.dateStrip}>
              {weekDays.map((d, i) => {
                const isSel = toISO(d) === toISO(selectedDate);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[s.dateItem, isSel && s.dateItemActive]}
                    onPress={() => setSelectedDate(d)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.dateMonth, isSel && s.dateTextActive]}>
                      {MONTH_SHORT[d.getMonth()]}
                    </Text>
                    <Text style={[s.dateNum, isSel && s.dateTextActive]}>
                      {String(d.getDate()).padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

              {/* ── STEPS BAR CHART ── */}
              <View style={s.chartCard}>
                <View style={s.chartHeader}>
                  <View>
                    <Text style={s.chartTitle}>Weekly Steps</Text>
                  </View>
                  <View style={s.todayBadge}>
                    <Text style={s.todayBadgeSteps}>{todaySteps.toLocaleString()}</Text>
                    <Text style={s.todayBadgeLabel}>today</Text>
                    
                  </View>
                </View>

                <View style={s.chartBody}>
                  <View style={s.yAxis}>
                    {["10k","5k","0"].map((v, i) => (
                      <Text key={i} style={s.yLabel}>{v}</Text>
                    ))}
                  </View>
                  <View style={s.chartGrid}>
                    <View style={[s.gridLine, { bottom: BAR_MAX_H }]} />
                    <View style={[s.gridLine, { bottom: BAR_MAX_H / 2 }]} />
                    <View style={[s.gridLine, { bottom: 0 }]} />
                    <View style={[s.goalLine, { bottom: (STEP_GOAL / maxSteps) * BAR_MAX_H }]} />
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
                            {val > 0 ? (val >= 1000 ? `${(val/1000).toFixed(1)}k` : `${val}`) : ""}
                          </Text>
                          <View style={[
                            s.bar, { height: barH },
                            hitGoal  && s.barHit,
                            isTodayB && s.barToday,
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

                <View style={s.legend}>
                  {[
                    { color: "#d4d4d4", label: "No data" },
                    { color: "#111111", label: "Below goal" },
                    { color: "#4ade80", label: "Goal reached" },
                    { color: "#f9a8d4", label: "10k line" },
                  ].map((item, i) => (
                    <View key={i} style={s.legendItem}>
                      <View style={[s.legendDot, { backgroundColor: item.color }]} />
                      <Text style={s.legendLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>

                <View style={s.goalBarWrap}>
                  <View style={s.goalBar}>
                    <View style={[s.goalBarFill, {
                      width: `${Math.min(todaySteps / STEP_GOAL * 100, 100)}%` as any,
                      backgroundColor: todaySteps >= STEP_GOAL ? "#4ade80" : "#111",
                    }]} />
                  </View>
                 
                </View>
              </View>

              {/* ── PROGRESS CARD ── */}
              <View style={s.progressCard}>
                <View style={s.progressRow}>
                  <View>
                    <Text style={s.progressTitle}>
                      {isToday ? "Today's Habits" : `${DAY_NAMES[selectedDate.getDay()]}'s Habits`}
                    </Text>
                    <Text style={s.progressSub}>{completedCount} of {habits.length} completed</Text>
                  </View>
                  <Text style={s.progressPct}>{Math.round(progress * 100)}%</Text>
                </View>
                <View style={s.progressBar}>
                  <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
                </View>
              </View>

              {/* ── HABITS LIST ── */}
              <View style={s.sectionRow}>
                <Text style={s.sectionTitle}>Assigned Habits</Text>
                <TouchableOpacity
                  style={s.addHabitBtn}
                  onPress={() => { resetForm(); setShowCreate(true); }}
                >
                  <Text style={s.addHabitBtnText}>＋ New habit</Text>
                </TouchableOpacity>
              </View>

              {habits.length === 0 ? (
                <View style={s.emptyCard}>
                  <Text style={s.emptyEmoji}>🌱</Text>
                  <Text style={s.emptyTitle}>No habits assigned</Text>
                  <Text style={s.emptySub}>Tap "＋ New habit" to assign the first habit to this client</Text>
                </View>
              ) : habits.map(habit => {
                const logVal = logs[habit._id];
                const done   = logVal != null && logVal !== false;
                return (
                  <View key={habit._id} style={s.habitRow}>
                    <View style={[s.habitDot, done && s.habitDotDone]}>
                      {done && (
                        <Text style={s.habitDotText}>
                          {habit.type === "number" ? String(logVal) : "✓"}
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.habitTitleRow}>
                        <Text style={[s.habitTitle, done && s.habitTitleDone]} numberOfLines={1}>
                          {habit.title}
                        </Text>
                        <View style={[s.typePill, habit.type === "number" && s.typePillNum]}>
                          <Text style={s.typePillText}>{habit.type === "boolean" ? "✓" : "#"}</Text>
                        </View>
                      </View>
                      <Text style={s.habitSub}>
                        {habit.type === "number"
                          ? `Target ${habit.target ?? "—"} · Logged: ${logVal != null ? logVal : "not yet"}`
                          : done ? "Completed ✓" : "Not logged yet"}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => openEdit(habit)} style={s.iconBtn}>
                      <Text style={s.iconBtnText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteHabit(habit)} style={s.iconBtn}>
                      <Text style={s.iconBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              <View style={{ height: 60 }} />
            </ScrollView>
          </>
        )}
      </SafeAreaView>

      {/* ── CLIENT PICKER MODAL ── */}
      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={m.overlay}>
          <View style={[m.sheet, { maxHeight: "85%" }]}>
            <View style={m.header}>
              <Text style={m.headerTitle}>Select Client</Text>
              <TouchableOpacity
                onPress={() => { setShowPicker(false); setSearch(""); }}
                style={m.closeBtn}
              >
                <Text style={m.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={m.searchBox}>
              <Text style={m.searchIcon}>🔍</Text>
              <TextInput
                style={m.searchInput}
                placeholder="Search by name or email…"
                placeholderTextColor="#bbb"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Text style={{ color: "#bbb", fontSize: 16, paddingHorizontal: 4 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {storeLoading ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator color="#111" />
                <Text style={{ marginTop: 10, color: "#aaa", fontSize: 13 }}>Loading clients…</Text>
              </View>
            ) : filteredClients.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>🤷</Text>
                <Text style={{ color: "#aaa", fontSize: 14 }}>No clients found</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {filteredClients.map((c: any) => {
                  const isActive = selectedClient?._id === c._id;
                  return (
                    <TouchableOpacity
                      key={c._id}
                      style={[m.clientRow, isActive && m.clientRowActive]}
                      onPress={() => { setSelectedClient(c); setShowPicker(false); setSearch(""); }}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: avatarUri(c) }} style={m.clientAvatar} />
                      <View style={{ flex: 1 }}>
                        <Text style={m.clientName}>{c.firstName} {c.lastName}</Text>
                        <Text style={m.clientEmail}>{c.email}</Text>
                      </View>
                      {isActive && (
                        <View style={m.activeTick}>
                          <Text style={m.activeTickText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
                <View style={{ height: 30 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── CREATE HABIT MODAL ── */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.header}>
              <Text style={m.headerTitle}>Assign Habit</Text>
              <TouchableOpacity onPress={() => { setShowCreate(false); resetForm(); }} style={m.closeBtn}>
                <Text style={m.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            {selectedClient && (
              <View style={m.chip}>
                <Image source={{ uri: avatarUri(selectedClient) }} style={m.chipAvatar} />
                <Text style={m.chipText}>{selectedClient.firstName} {selectedClient.lastName}</Text>
              </View>
            )}
            <ScrollView showsVerticalScrollIndicator={false}>
              <HabitForm
                title={fTitle} setTitle={setFTitle}
                type={fType}   setType={setFType}
                target={fTarget} setTarget={setFTarget}
              />
              <TouchableOpacity
                style={[m.saveBtn, fSaving && m.saveBtnOff]}
                onPress={createHabit}
                disabled={fSaving}
              >
                {fSaving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={m.saveBtnText}>Assign Habit</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowCreate(false); resetForm(); }} style={m.cancelRow}>
                <Text style={m.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── EDIT HABIT MODAL ── */}
      <Modal visible={showEdit} animationType="slide" transparent>
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.header}>
              <Text style={m.headerTitle}>Edit Habit</Text>
              <TouchableOpacity onPress={() => { setShowEdit(false); resetForm(); }} style={m.closeBtn}>
                <Text style={m.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <HabitForm
                title={fTitle} setTitle={setFTitle}
                type={fType}   setType={setFType}
                target={fTarget} setTarget={setFTarget}
              />
              <TouchableOpacity
                style={m.deleteBtn}
                onPress={() => { setShowEdit(false); if (editTarget) deleteHabit(editTarget); }}
              >
                <Text style={m.deleteBtnText}>🗑️  Delete this habit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[m.saveBtn, fSaving && m.saveBtnOff]}
                onPress={saveEdit}
                disabled={fSaving}
              >
                {fSaving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={m.saveBtnText}>Save Changes</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowEdit(false); resetForm(); }} style={m.cancelRow}>
                <Text style={m.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </LinearGradient>
  );
}

/* ─── Shared form ────────────────────────────────────────────── */
function HabitForm({ title, setTitle, type, setType, target, setTarget }: {
  title: string;   setTitle: (v: string) => void;
  type: "boolean" | "number"; setType: (v: "boolean" | "number") => void;
  target: string;  setTarget: (v: string) => void;
}) {
  return (
    <>
      <Text style={f.label}>Habit title</Text>
      <TextInput
        style={f.input}
        placeholder="e.g. Drink 3L water"
        placeholderTextColor="#bbb"
        value={title}
        onChangeText={setTitle}
        autoFocus
      />
      <Text style={f.label}>Type</Text>
      <View style={f.typeRow}>
        {(["boolean", "number"] as const).map(opt => (
          <TouchableOpacity
            key={opt}
            style={[f.typeChip, type === opt && f.typeChipOn]}
            onPress={() => setType(opt)}
          >
            <Text style={[f.typeChipText, type === opt && f.typeChipTextOn]}>
              {opt === "boolean" ? "✓  Checkbox" : "#  Numeric"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={f.typeHint}>
        {type === "boolean"
          ? "Client marks it done / not done each day."
          : "Client logs a number (e.g. glasses of water, km run)."}
      </Text>
      {type === "number" && (
        <>
          <Text style={[f.label, { marginTop: 16 }]}>Target value</Text>
          <TextInput
            style={f.input}
            placeholder="e.g. 3"
            placeholderTextColor="#bbb"
            value={target}
            onChangeText={setTarget}
            keyboardType="numeric"
          />
        </>
      )}
    </>
  );
}

/* ─── Palette ────────────────────────────────────────────────── */
const WHITE   = "#ffffff";
const BLACK   = "#111111";
const GRAY100 = "#f5f5f5";
const GRAY200 = "#e8e8e8";
const GRAY300 = "#d4d4d4";
const GRAY500 = "#737373";
const PINK    = "#f9a8d4";
const GREEN   = "#4ade80";

/* ─── Styles (unchanged from reference — design is already correct) ── */
const s = StyleSheet.create({
  container: { flex: 1 },
  safe:      { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  backBtn:       { width: 36, height: 36, justifyContent: "center" },
  backBtnText:   { fontSize: 28, color: BLACK, fontWeight: "300", lineHeight: 34 },
  pageTitle:     { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "800", color: BLACK, fontFamily: "Lato-Regular", letterSpacing: -0.3 },
  addBtn:        { width: 36, height: 36, justifyContent: "center", alignItems: "flex-end" },
  addBtnText:    { fontSize: 24, color: BLACK },
  addBtnDisabled:{ opacity: 0.3 },
  clientCard: { marginHorizontal: 16, marginBottom: 10, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 16, padding: 14, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  clientCardInner:     { flexDirection: "row", alignItems: "center", gap: 12 },
  clientAvatar:        { width: 46, height: 46, borderRadius: 23, backgroundColor: GRAY100 },
  clientCardName:      { fontSize: 15, fontWeight: "700", color: BLACK, fontFamily: "System" },
  clientCardEmail:     { fontSize: 12, color: GRAY500, marginTop: 1 },
  changeChip:          { backgroundColor: GRAY100, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: GRAY200 },
  changeChipText:      { fontSize: 12, color: GRAY500, fontWeight: "600" },
  clientCardEmpty:     { width: 46, height: 46, borderRadius: 23, backgroundColor: GRAY100, justifyContent: "center", alignItems: "center" },
  clientCardEmptyText: { flex: 1, fontSize: 14, color: GRAY500, fontFamily: "System" },
  clientCardChevron:   { fontSize: 24, color: GRAY300 },
  emptyScreen: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, paddingHorizontal: 40 },
  emptyScreenEmoji:   { fontSize: 54, marginBottom: 4 },
  emptyScreenTitle:   { fontSize: 20, fontWeight: "800", color: BLACK, fontFamily: "System" },
  emptyScreenSub:     { fontSize: 14, color: GRAY500, textAlign: "center", fontFamily: "Lato-Regular", lineHeight: 20 },
  emptyScreenBtn:     { marginTop: 10, backgroundColor: BLACK, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 },
  emptyScreenBtnText: { color: WHITE, fontWeight: "800", fontSize: 15, fontFamily: "System" },
  dateStrip:     { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 12, paddingBottom: 10, paddingTop: 2 },
  dateItem:      { alignItems: "center", paddingVertical: 7, paddingHorizontal: 9, borderRadius: 13 },
  dateItemActive:{ backgroundColor: "rgba(255,255,255,0.88)" },
  dateMonth:     { fontSize: 10, color: GRAY500, fontFamily: "Lato-Regular", marginBottom: 2 },
  dateNum:       { fontSize: 16, fontWeight: "700", color: GRAY500, fontFamily: "System" },
  dateTextActive:{ color: BLACK },
  scrollContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 100 },
  chartCard: { backgroundColor: "rgba(255,255,255,0.93)", borderRadius: 20, padding: 18, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 14, elevation: 3 },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  chartTitle: { fontSize: 17, fontWeight: "800", color: BLACK, fontFamily: "System" },
  chartSub:   { fontSize: 12, color: GRAY500, marginTop: 3, fontFamily: "System" },
  todayBadge:      { alignItems: "flex-end" },
  todayBadgeSteps: { fontSize: 22, fontWeight: "800", color: BLACK, fontFamily: "Lato-Regular", lineHeight: 26 },
  todayBadgeLabel: { fontSize: 11, color: GRAY500, fontFamily: "System" },
  todayBadgePct:   { fontSize: 13, fontWeight: "700", color: BLACK, fontFamily: "System" },
  chartBody: { flexDirection: "row", height: BAR_MAX_H + 24, marginBottom: 4 },
  yAxis:     { width: 34, justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 20, paddingRight: 6 },
  yLabel:    { fontSize: 10, color: GRAY500, fontFamily: "System" },
  chartGrid: { flex: 1, flexDirection: "row", alignItems: "flex-end", position: "relative", paddingBottom: 20 },
  gridLine:  { position: "absolute", left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: GRAY200 },
  goalLine:  { position: "absolute", left: 0, right: 0, height: 1.5, backgroundColor: PINK },
  barCol:      { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 3 },
  barTopLabel: { fontSize: 8, color: GRAY500, fontFamily: "Lato-Regular", height: 12 },
  bar:         { width: "60%", borderRadius: 6, backgroundColor: GRAY300 },
  barHit:      { backgroundColor: GREEN },
  barToday:    { backgroundColor: BLACK },
  barSel:      { backgroundColor: GRAY500 },
  barLabel:    { fontSize: 9, color: GRAY500, fontFamily: "System" },
  barLabelBold:{ color: BLACK, fontWeight: "700" },
  legend:      { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  legendItem:  { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot:   { width: 9, height: 9, borderRadius: 5 },
  legendLabel: { fontSize: 10, color: GRAY500, fontFamily: "System" },
  goalBarWrap: { marginTop: 14 },
  goalBar:     { height: 6, backgroundColor: GRAY200, borderRadius: 3, overflow: "hidden" },
  goalBarFill: { height: 6, borderRadius: 3 },
  goalBarLabel:{ fontSize: 11, color: GRAY500, marginTop: 5, fontFamily: "System" },
  progressCard: { backgroundColor: "rgba(255,255,255,0.88)", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  progressRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 },
  progressTitle:{ fontSize: 15, fontWeight: "700", color: BLACK, fontFamily: "System" },
  progressSub:  { fontSize: 12, color: GRAY500, marginTop: 2, fontFamily: "System" },
  progressPct:  { fontSize: 26, fontWeight: "800", color: BLACK, fontFamily: "System" },
  progressBar:  { height: 7, backgroundColor: GRAY200, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 7, backgroundColor: BLACK, borderRadius: 4 },
  sectionRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle:   { fontSize: 17, fontWeight: "800", color: BLACK, fontFamily: "System" },
  addHabitBtn:    { backgroundColor: BLACK, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  addHabitBtnText:{ color: WHITE, fontSize: 13, fontWeight: "700", fontFamily: "System" },
  habitRow: { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  habitDot:     { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: GRAY300, backgroundColor: WHITE, justifyContent: "center", alignItems: "center" },
  habitDotDone: { backgroundColor: BLACK, borderColor: BLACK },
  habitDotText: { color: WHITE, fontWeight: "800", fontSize: 12 },
  habitTitleRow:  { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 3, flexWrap: "wrap" },
  habitTitle:     { fontSize: 14, fontWeight: "700", color: BLACK, fontFamily: "System" },
  habitTitleDone: { textDecorationLine: "line-through", color: GRAY500 },
  habitSub:       { fontSize: 12, color: GRAY500, fontFamily: "System" },
  typePill:    { backgroundColor: GRAY100, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: GRAY200 },
  typePillNum: { backgroundColor: "#e0f2fe", borderColor: "#bae6fd" },
  typePillText:{ fontSize: 10, color: GRAY500, fontWeight: "700" },
  iconBtn:     { width: 34, height: 34, justifyContent: "center", alignItems: "center" },
  iconBtnText: { fontSize: 15 },
  emptyCard:  { backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 18, padding: 32, alignItems: "center", gap: 8 },
  emptyEmoji: { fontSize: 40, marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: BLACK, fontFamily: "System" },
  emptySub:   { fontSize: 13, color: GRAY500, fontFamily: "Lato-Regular", textAlign: "center" },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:   { backgroundColor: WHITE, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, maxHeight: "85%" },
  header:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: BLACK, fontFamily: "System" },
  closeBtn:    { width: 34, height: 34, borderRadius: 17, backgroundColor: GRAY100, justifyContent: "center", alignItems: "center" },
  closeBtnText:{ fontSize: 14, fontWeight: "700", color: BLACK },
  searchBox:   { flexDirection: "row", alignItems: "center", backgroundColor: GRAY100, borderRadius: 12, paddingHorizontal: 12, marginBottom: 14, borderWidth: 1, borderColor: GRAY200 },
  searchIcon:  { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 15, color: BLACK, fontFamily: "System" },
  clientRow:       { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  clientRowActive: { backgroundColor: "#fafafa" },
  clientAvatar:    { width: 46, height: 46, borderRadius: 23, backgroundColor: GRAY100 },
  clientName:      { fontSize: 15, fontWeight: "700", color: BLACK, fontFamily: "System" },
  clientEmail:     { fontSize: 12, color: GRAY500, marginTop: 2 },
  activeTick:     { width: 28, height: 28, borderRadius: 14, backgroundColor: BLACK, justifyContent: "center", alignItems: "center" },
  activeTickText: { color: WHITE, fontWeight: "800", fontSize: 13 },
  chip:       { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", backgroundColor: GRAY100, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: GRAY200 },
  chipAvatar: { width: 22, height: 22, borderRadius: 11 },
  chipText:   { fontSize: 13, color: BLACK, fontWeight: "600" },
  deleteBtn:     { marginTop: 14, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: "rgba(239,68,68,0.25)", backgroundColor: "rgba(239,68,68,0.05)", alignItems: "center" },
  deleteBtnText: { color: "#ef4444", fontWeight: "700", fontSize: 14 },
  saveBtn:    { backgroundColor: BLACK, paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 20 },
  saveBtnOff: { opacity: 0.5 },
  saveBtnText:{ color: WHITE, fontWeight: "800", fontSize: 16, fontFamily: "System" },
  cancelRow:  { marginTop: 12, marginBottom: 20 },
  cancelText: { color: "#aaa", textAlign: "center", fontSize: 14 },
});

const f = StyleSheet.create({
  label:       { fontSize: 11, fontWeight: "700", color: GRAY500, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8, fontFamily: "System" },
  input:       { backgroundColor: GRAY100, color: BLACK, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: "Lato-Regular", borderWidth: 1, borderColor: GRAY200, marginBottom: 4 },
  typeRow:     { flexDirection: "row", gap: 10, marginBottom: 6 },
  typeChip:    { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: GRAY100, borderWidth: 1, borderColor: GRAY200 },
  typeChipOn:     { backgroundColor: BLACK, borderColor: BLACK },
  typeChipText:   { fontSize: 14, color: GRAY500, fontWeight: "600", fontFamily: "System" },
  typeChipTextOn: { color: WHITE },
  typeHint:    { fontSize: 12, color: "#bbb", marginBottom: 4, fontFamily: "System" },
});
