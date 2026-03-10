"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Plus, Trash2, ChevronRight, Search, ArrowLeft } from "lucide-react-native";
import { useCoachMealPlanStore } from "../../../store/mealPlanStore";
import api from "../../../utils/api";

const WEEK_DAYS = [
  "monday", "tuesday", "wednesday", "thursday",
  "friday", "saturday", "sunday",
] as const;
type DayKey = typeof WEEK_DAYS[number];

function emptyDay() {
  return { breakfast: [] as string[], brunch: [] as string[], lunch: [] as string[], eveningSnack: [] as string[], dinner: [] as string[] };
}
function formatMeals(m: any) {
  if (!m) return "—";
  if (Array.isArray(m)) return m.length ? m.join(", ") : "—";
  const s = String(m).trim();
  return s.length ? s : "—";
}

/* ─── Tokens ─────────────────────────────────────────────── */
const WHITE   = "#ffffff";
const BLACK   = "#111111";
const GRAY100 = "#f5f5f5";
const GRAY200 = "#ebebeb";
const GRAY500 = "#737373";

/* ─── Avatar initials helper ─────────────────────────────── */
function InitialsAvatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0] || "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: BLACK, alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ color: WHITE, fontSize: size * 0.36, fontWeight: "700" }}>
        {initials || "?"}
      </Text>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN SCREEN
════════════════════════════════════════════════════════════ */
export default function CoachMealPlansScreen() {
  const {
    clients, mealPlansByUser, loading,
    fetchClients, fetchMealPlansByUser, createMealPlan, updateMealPlan,
  } = useCoachMealPlanStore();

  const [view, setView]                           = useState<"clients" | "plans">("clients");
  const [search, setSearch]                       = useState("");
  const [selectedClient, setSelectedClient]       = useState<any>(null);
  const [showCreateOverlay, setShowCreateOverlay] = useState(false);
  const [editingMealPlan, setEditingMealPlan]     = useState<any>(null);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c: any) =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  }, [search, clients]);

  const openClient = async (client: any) => {
    setSelectedClient(client);
    await fetchMealPlansByUser(client._id);
    setView("plans");
  };

  const goBack = () => { setView("clients"); setSelectedClient(null); };

  const handleDeleteMealPlan = async (mealPlanId: string) => {
    Alert.alert("Delete Meal Plan", "Are you sure you want to delete this meal plan?", [
      { text: "Cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/mealplans/coach/mealplans/${mealPlanId}`);
            if (selectedClient) await fetchMealPlansByUser(selectedClient._id);
          } catch (err: any) {
            Alert.alert("Error", err?.response?.data?.msg || "Failed to delete meal plan");
          }
        },
      },
    ]);
  };

  if (loading && !clients.length) {
    return (
      <GradientBg style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={BLACK} />
          <Text style={s.loadingText}>Loading clients…</Text>
        </View>
      </GradientBg>
    );
  }

  return (
    <GradientBg style={s.container}>
      <SafeAreaView style={s.safe}>

        {/* ═══════════════ CLIENTS VIEW ═══════════════ */}
        {view === "clients" && (
          <>
            <View style={s.topBar}>
              <Text style={s.pageTitle}>Meal Plans</Text>
              <View style={s.topBadge}>
                <Text style={s.topBadgeText}>{clients.length} clients</Text>
              </View>
            </View>

            <View style={s.searchWrap}>
              <View style={s.searchBox}>
                <Search size={15} color={GRAY500} style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="Search clients…"
                  placeholderTextColor="#bbb"
                  value={search}
                  onChangeText={setSearch}
                  style={s.searchInput}
                  clearButtonMode="while-editing"
                />
              </View>
            </View>

            <Text style={s.listSectionLabel}>All Clients</Text>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item._id}
              contentContainerStyle={s.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={s.emptyWrap}>
                  <Text style={s.emptyEmoji}>👤</Text>
                  <Text style={s.emptyHint}>No clients found</Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.clientCard}
                  activeOpacity={0.85}
                  onPress={() => openClient(item)}
                >
                  <InitialsAvatar name={item.name} size={46} />
                  <View style={s.clientCardInfo}>
                    <Text style={s.clientCardName}>{item.name}</Text>
                    {item.email ? <Text style={s.clientCardEmail}>{item.email}</Text> : null}
                    <View style={s.clientCardMeta}>
                      <View style={s.planCountBadge}>
                        <Text style={s.planCountText}>
                          {(mealPlansByUser[item._id] || []).length} plan{(mealPlansByUser[item._id] || []).length !== 1 ? "s" : ""}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <ChevronRight size={18} color={GRAY500} />
                </TouchableOpacity>
              )}
            />
          </>
        )}

        {/* ═══════════════ PLANS VIEW ═══════════════ */}
        {view === "plans" && selectedClient && (
          <>
            <View style={s.topBar}>
              <TouchableOpacity style={s.backBtn} onPress={goBack}>
                <ArrowLeft size={20} color={BLACK} />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.planViewTitle}>{selectedClient.name}</Text>
                <Text style={s.planViewSub}>Meal Plans</Text>
              </View>
              <TouchableOpacity style={s.addBtn} onPress={() => setShowCreateOverlay(true)}>
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

              {(mealPlansByUser[selectedClient._id] || []).length === 0 && !loading ? (
                <View style={s.emptyWrap}>
                  <Text style={s.emptyEmoji}>🥗</Text>
                  <Text style={s.emptyHint}>No meal plans yet</Text>
                  <TouchableOpacity
                    style={[s.addBtn, { marginTop: 16, width: "auto", paddingHorizontal: 20, borderRadius: 12, height: 44 }]}
                    onPress={() => setShowCreateOverlay(true)}
                  >
                    <Text style={{ color: WHITE, fontWeight: "700", fontSize: 14 }}>+ Create First Plan</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                (mealPlansByUser[selectedClient._id] || []).map((mp: any) => (
                  <View key={mp._id} style={s.planCard}>
                    <View style={s.planHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.planTitle}>{mp.title}</Text>
                        {mp.description ? <Text style={s.planDesc}>{mp.description}</Text> : null}
                      </View>
                      <View style={s.planActions}>
                        <TouchableOpacity style={s.planEditBtn} onPress={() => setEditingMealPlan(mp)}>
                          <Text style={s.planEditBtnText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.planDeleteBtn} onPress={() => handleDeleteMealPlan(mp._id)}>
                          <Trash2 size={15} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={s.divider} />

                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={s.table}>
                        <View style={[s.tableRow, s.tableHeaderRow]}>
                          {["Day", "Breakfast", "Brunch", "Lunch", "Evening", "Dinner"].map((h, i) => (
                            <View key={h} style={i === 0 ? s.tableCellDay : s.tableCell}>
                              <Text style={s.tableHeaderText}>{h}</Text>
                            </View>
                          ))}
                        </View>
                        {WEEK_DAYS.map((dayKey, idx) => {
                          const dayMeals = mp.days?.[dayKey] || emptyDay();
                          return (
                            <View key={dayKey} style={[s.tableRow, idx % 2 === 1 && s.tableRowAlt]}>
                              <View style={s.tableCellDay}>
                                <Text style={s.tableDayText}>{dayKey.slice(0, 3).toUpperCase()}</Text>
                              </View>
                              {(["breakfast", "brunch", "lunch", "eveningSnack", "dinner"] as const).map((meal) => (
                                <View key={meal} style={s.tableCell}>
                                  <Text style={s.tableText}>{formatMeals(dayMeals[meal])}</Text>
                                </View>
                              ))}
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                ))
              )}

              <View style={{ height: 60 }} />
            </ScrollView>
          </>
        )}

        {/* CREATE OVERLAY */}
        {showCreateOverlay && selectedClient && (
          <Modal visible animationType="slide">
            <CreateMealPlanOverlay
              userId={selectedClient._id}
              createMealPlan={createMealPlan}
              onClose={async () => {
                setShowCreateOverlay(false);
                if (selectedClient) await fetchMealPlansByUser(selectedClient._id);
              }}
            />
          </Modal>
        )}

        {/* EDIT OVERLAY */}
        {editingMealPlan && (
          <Modal visible animationType="slide">
            <EditMealPlanOverlay
              mealPlan={editingMealPlan}
              onClose={async () => {
                setEditingMealPlan(null);
                if (selectedClient) await fetchMealPlansByUser(selectedClient._id);
              }}
              updateMealPlan={updateMealPlan}
              onDelete={handleDeleteMealPlan}
            />
          </Modal>
        )}

      </SafeAreaView>
    </GradientBg>
  );
}

/* ══════════════════════════════════════════════════════════════
   CREATE OVERLAY
══════════════════════════════════════════════════════════════ */
function CreateMealPlanOverlay({ userId, createMealPlan, onClose }: {
  userId: string; createMealPlan: any; onClose: () => void;
}) {
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [daysStr, setDaysStr]         = useState<Record<DayKey, Record<string, string>>>(
    WEEK_DAYS.reduce((acc, day) => {
      acc[day] = { breakfast: "", brunch: "", lunch: "", eveningSnack: "", dinner: "" };
      return acc;
    }, {} as Record<DayKey, Record<string, string>>)
  );

  const updateMealField = (day: DayKey, meal: string, value: string) =>
    setDaysStr((p) => ({ ...p, [day]: { ...p[day], [meal]: value } }));

  const parseDays = () => {
    const out: any = {};
    WEEK_DAYS.forEach((d) => {
      out[d] = {
        breakfast:    daysStr[d].breakfast    ? daysStr[d].breakfast.split(",").map(s => s.trim()).filter(Boolean)    : [],
        brunch:       daysStr[d].brunch       ? daysStr[d].brunch.split(",").map(s => s.trim()).filter(Boolean)       : [],
        lunch:        daysStr[d].lunch        ? daysStr[d].lunch.split(",").map(s => s.trim()).filter(Boolean)        : [],
        eveningSnack: daysStr[d].eveningSnack ? daysStr[d].eveningSnack.split(",").map(s => s.trim()).filter(Boolean) : [],
        dinner:       daysStr[d].dinner       ? daysStr[d].dinner.split(",").map(s => s.trim()).filter(Boolean)       : [],
      };
    });
    return out;
  };

  const handleSubmit = async () => {
    if (!title.trim()) return Alert.alert("Missing title", "Please enter a plan title.");
    try {
      await createMealPlan({ userId, title, description, days: parseDays() });
      Alert.alert("Success", "Meal plan created!");
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.msg || "Failed to create meal plan");
    }
  };

  return (
    <MealPlanForm
      heading="Create Meal Plan" submitLabel="Create Plan"
      title={title} description={description} daysStr={daysStr}
      onClose={onClose} onChangeTitle={setTitle} onChangeDescription={setDescription}
      updateMealField={updateMealField} onSubmit={handleSubmit}
    />
  );
}

/* ══════════════════════════════════════════════════════════════
   EDIT OVERLAY
══════════════════════════════════════════════════════════════ */
function EditMealPlanOverlay({ mealPlan, onClose, updateMealPlan, onDelete }: {
  mealPlan: any; onClose: () => void; updateMealPlan: any; onDelete: (id: string) => void;
}) {
  const init = WEEK_DAYS.reduce((acc, d) => {
    const day = mealPlan.days?.[d] || emptyDay();
    acc[d] = {
      breakfast:    (day.breakfast    || []).join(", "),
      brunch:       (day.brunch       || []).join(", "),
      lunch:        (day.lunch        || []).join(", "),
      eveningSnack: (day.eveningSnack || []).join(", "),
      dinner:       (day.dinner       || []).join(", "),
    };
    return acc;
  }, {} as Record<DayKey, Record<string, string>>);

  const [title, setTitle]             = useState(mealPlan.title || "");
  const [description, setDescription] = useState(mealPlan.description || "");
  const [daysStr, setDaysStr]         = useState(init);

  const updateMealField = (day: DayKey, meal: string, value: string) =>
    setDaysStr((p) => ({ ...p, [day]: { ...p[day], [meal]: value } }));

  const parseDays = () => {
    const out: any = {};
    WEEK_DAYS.forEach((d) => {
      out[d] = {
        breakfast:    daysStr[d].breakfast    ? daysStr[d].breakfast.split(",").map(s => s.trim()).filter(Boolean)    : [],
        brunch:       daysStr[d].brunch       ? daysStr[d].brunch.split(",").map(s => s.trim()).filter(Boolean)       : [],
        lunch:        daysStr[d].lunch        ? daysStr[d].lunch.split(",").map(s => s.trim()).filter(Boolean)        : [],
        eveningSnack: daysStr[d].eveningSnack ? daysStr[d].eveningSnack.split(",").map(s => s.trim()).filter(Boolean) : [],
        dinner:       daysStr[d].dinner       ? daysStr[d].dinner.split(",").map(s => s.trim()).filter(Boolean)       : [],
      };
    });
    return out;
  };

  const handleSave = async () => {
    try {
      await updateMealPlan(mealPlan._id, { title, description, days: parseDays() });
      Alert.alert("Saved", "Meal plan updated.");
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.msg || "Failed to update meal plan");
    }
  };

  return (
    <MealPlanForm
      heading="Edit Meal Plan" submitLabel="Save Changes"
      title={title} description={description} daysStr={daysStr}
      onClose={onClose} onChangeTitle={setTitle} onChangeDescription={setDescription}
      updateMealField={updateMealField} onSubmit={handleSave}
      onDelete={() => { onDelete(mealPlan._id); onClose(); }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════
   SHARED FORM
══════════════════════════════════════════════════════════════ */
function MealPlanForm({ heading, submitLabel, title, description, daysStr,
  onClose, onChangeTitle, onChangeDescription, updateMealField, onSubmit, onDelete,
}: {
  heading: string; submitLabel: string; title: string; description: string;
  daysStr: Record<DayKey, Record<string, string>>;
  onClose: () => void; onChangeTitle: (v: string) => void;
  onChangeDescription: (v: string) => void;
  updateMealField: (day: DayKey, meal: string, value: string) => void;
  onSubmit: () => void; onDelete?: () => void;
}) {
  return (
    <GradientBg style={s.container}>
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>

          <View style={s.modalHeader}>
            <TouchableOpacity style={s.backBtn} onPress={onClose}>
              <ArrowLeft size={20} color={BLACK} />
            </TouchableOpacity>
            <Text style={s.modalTitle}>{heading}</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={s.modalContent} showsVerticalScrollIndicator={false}>

            <View style={s.formCard}>
              <Text style={s.cardSectionLabel}>Plan Details</Text>
              <LabeledInput label="Title" value={title} onChangeText={onChangeTitle} placeholder="e.g. Weight Loss Plan" />
              <LabeledInput label="Description" value={description} onChangeText={onChangeDescription} placeholder="Optional notes about this plan…" multiline numberOfLines={3} />
            </View>

            <Text style={[s.listSectionLabel, { marginTop: 20, marginBottom: 10 }]}>Weekly Schedule</Text>

            {WEEK_DAYS.map((day) => (
              <View key={day} style={[s.formCard, { marginBottom: 10 }]}>
                <View style={s.dayHeader}>
                  <View style={s.dayDot} />
                  <Text style={s.dayTitle}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
                </View>
                <LabeledInput label="Breakfast"     value={daysStr[day].breakfast}    onChangeText={(v) => updateMealField(day, "breakfast", v)}    placeholder="e.g. Oats, Eggs" />
                <LabeledInput label="Brunch"        value={daysStr[day].brunch}       onChangeText={(v) => updateMealField(day, "brunch", v)}       placeholder="e.g. Fruit, Yogurt" />
                <LabeledInput label="Lunch"         value={daysStr[day].lunch}        onChangeText={(v) => updateMealField(day, "lunch", v)}        placeholder="e.g. Chicken, Rice" />
                <LabeledInput label="Evening Snack" value={daysStr[day].eveningSnack} onChangeText={(v) => updateMealField(day, "eveningSnack", v)} placeholder="e.g. Nuts, Protein bar" />
                <LabeledInput label="Dinner"        value={daysStr[day].dinner}       onChangeText={(v) => updateMealField(day, "dinner", v)}       placeholder="e.g. Salmon, Veggies" />
              </View>
            ))}

            {onDelete ? (
              <View style={s.rowActions}>
                <TouchableOpacity style={[s.saveBtn, { flex: 1 }]} onPress={onSubmit}>
                  <Text style={s.saveBtnText}>{submitLabel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.deleteBtn} onPress={onDelete}>
                  <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.saveBtn} onPress={onSubmit}>
                <Text style={s.saveBtnText}>{submitLabel}</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBg>
  );
}

/* ─── Gradient wrapper ───────────────────────────────────── */
function GradientBg({ style, children }: { style?: any; children: React.ReactNode }) {
  return (
    <LinearGradient
      colors={["#000000", "#555555", "#ffffff"]}
locations={[0, 0.5, 1]}
start={{x:0.5, y:0}}
end={{x:0.5, y:1}}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}

/* ─── LabeledInput ───────────────────────────────────────── */
function LabeledInput({ label, value, onChangeText, placeholder, multiline, numberOfLines }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean; numberOfLines?: number;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#bbb"
        style={[f.input, multiline && {
          height: Math.max(80, (numberOfLines || 1) * 22),
          textAlignVertical: "top",
          paddingTop: 10,
        }]}
        multiline={multiline}
      />
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
  pageTitle: {
    fontSize: 28, fontWeight: "800", color: BLACK,
    letterSpacing: -0.5, fontFamily: "Lato-Regular", flex: 1,
  },
  topBadge: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: GRAY200,
  },
  topBadgeText: { fontSize: 12, fontWeight: "700", color: GRAY500 },

  /* SEARCH */
  searchWrap: { paddingHorizontal: 16, marginBottom: 8 },
  searchBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: GRAY200,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  searchInput: {
    flex: 1, paddingVertical: 12, fontSize: 15,
    color: BLACK, fontFamily: "Lato-Regular",
  },

  /* SECTION LABEL */
  listSectionLabel: {
    fontSize: 11, fontWeight: "700", color: GRAY500,
    textTransform: "uppercase", letterSpacing: 0.8,
    paddingHorizontal: 16, marginBottom: 8, fontFamily: "Lato-Regular",
  },

  /* LIST */
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },

  /* CLIENT CARD */
  clientCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, elevation: 2,
    gap: 12,
  },
  clientCardInfo:  { flex: 1 },
  clientCardName:  { fontSize: 16, fontWeight: "700", color: BLACK, fontFamily: "System" },
  clientCardEmail: { fontSize: 13, color: GRAY500, marginTop: 2, fontFamily: "System" },
  clientCardMeta:  { flexDirection: "row", marginTop: 6 },
  planCountBadge: {
    backgroundColor: GRAY100, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: GRAY200,
  },
  planCountText: { fontSize: 11, fontWeight: "700", color: GRAY500 },

  /* EMPTY */
  emptyWrap:  { paddingTop: 80, alignItems: "center", gap: 6 },
  emptyEmoji: { fontSize: 44, marginBottom: 4 },
  emptyHint:  { fontSize: 15, color: GRAY500, fontFamily: "System" },

  /* PLANS VIEW TOP BAR */
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: GRAY200,
  },
  planViewTitle: { fontSize: 18, fontWeight: "800", color: BLACK, fontFamily: "System" },
  planViewSub:   { fontSize: 12, color: GRAY500, fontFamily: "Lato-Regular", marginTop: 1 },
  addBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: BLACK, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 8, elevation: 4,
  },

  /* SCROLL */
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  /* PLAN CARD */
  planCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, elevation: 2,
  },
  planHeader:  { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  planTitle:   { fontSize: 17, fontWeight: "800", color: BLACK, fontFamily: "System" },
  planDesc:    { fontSize: 13, color: GRAY500, marginTop: 4, fontFamily: "System" },
  planActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  planEditBtn: {
    backgroundColor: GRAY100, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: GRAY200,
  },
  planEditBtnText: { fontSize: 13, fontWeight: "700", color: BLACK },
  planDeleteBtn: {
    backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 8,
    padding: 6, borderWidth: 1, borderColor: "rgba(239,68,68,0.15)",
  },
  divider: { height: 1, backgroundColor: GRAY200, marginVertical: 12 },

  /* TABLE */
  table:         { borderWidth: 1, borderColor: GRAY200, borderRadius: 10, overflow: "hidden" },
  tableRow:      { flexDirection: "row", backgroundColor: WHITE },
  tableHeaderRow: { backgroundColor: GRAY100 },
  tableRowAlt:   { backgroundColor: "#fafafa" },
  tableCellDay:  {
    padding: 10, minWidth: 56,
    borderRightWidth: 1, borderColor: GRAY200, justifyContent: "center",
  },
  tableCell: {
    padding: 10, minWidth: 150,
    borderRightWidth: 1, borderColor: GRAY200, justifyContent: "center",
  },
  tableHeaderText: { color: BLACK, fontWeight: "800", fontSize: 11, letterSpacing: 0.3 },
  tableDayText:    { color: GRAY500, fontWeight: "800", fontSize: 11, letterSpacing: 0.5 },
  tableText:       { color: BLACK, fontSize: 12, flexWrap: "wrap" },

  /* MODAL HEADER */
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: GRAY200,
  },
  modalTitle: {
    fontSize: 17, fontWeight: "700", color: BLACK,
    fontFamily: "Lato-Regular", flex: 1, textAlign: "center",
  },
  modalContent: { paddingHorizontal: 16, paddingTop: 16 },

  /* FORM CARD */
  formCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  cardSectionLabel: {
    fontSize: 11, fontWeight: "700", color: GRAY500,
    textTransform: "uppercase", letterSpacing: 0.6,
    marginBottom: 14, fontFamily: "Lato-Regular",
  },

  /* DAY HEADER */
  dayHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  dayDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: BLACK },
  dayTitle:  { fontSize: 14, fontWeight: "800", color: BLACK, fontFamily: "System" },

  /* SAVE / DELETE */
  saveBtn: {
    backgroundColor: BLACK, paddingVertical: 15,
    borderRadius: 14, alignItems: "center", marginTop: 16,
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: WHITE, fontWeight: "800", fontSize: 16, fontFamily: "System" },
  deleteBtn: {
    backgroundColor: "rgba(239,68,68,0.08)", paddingVertical: 15,
    paddingHorizontal: 18, borderRadius: 14, alignItems: "center", marginTop: 16,
    borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
  },
  rowActions: { flexDirection: "row", gap: 10 },
});

/* ─── Form field styles ──────────────────────────────────── */
const f = StyleSheet.create({
  label: {
    fontSize: 11, fontWeight: "700", color: GRAY500,
    textTransform: "uppercase", letterSpacing: 0.5,
    marginBottom: 6, fontFamily: "Lato-Regular",
  },
  input: {
    backgroundColor: GRAY100, color: BLACK, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14,
    fontFamily: "Lato-Regular", borderWidth: 1, borderColor: GRAY200,
  },
});
