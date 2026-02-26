"use client";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
  Image,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X, Edit2, ChevronRight } from "lucide-react-native";
import { useClientMealPlanStore } from "../../../store/mealPlanStore";

/* ─── constants ─────────────────────────────────────────────── */
const WEEK_DAYS = [
  "monday","tuesday","wednesday","thursday","friday","saturday","sunday",
] as const;
type DayKey = typeof WEEK_DAYS[number];

function emptyDay() {
  return { breakfast:[] as string[], brunch:[] as string[], lunch:[] as string[], eveningSnack:[] as string[], dinner:[] as string[] };
}
function formatMeals(m: any) {
  if (!m) return "—";
  if (Array.isArray(m)) return m.length ? m.join(", ") : "—";
  const s = String(m).trim();
  return s.length ? s : "—";
}

/* ─── Recipe Book data (static showcase) ───────────────────── */
const RECIPE_CATEGORIES = [
  { label: "Breakfast",     count: 14, img: "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=300&q=80" },
  { label: "Lunch",         count: 18, img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&q=80" },
  { label: "Evening Snacks",count: 12, img: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=300&q=80" },
  { label: "Dinner",        count: 20, img: "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=300&q=80" },
];

/* ════════════════════════════════════════════════════════════ */
export default function ClientMealPlansScreen() {
  const router = useRouter();
  const { mealPlans, loading, fetchMealPlans, updateMealPlan } = useClientMealPlanStore();
  const [tab, setTab]               = useState<"Meals">("Meals");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [editingPlan, setEditingPlan]   = useState<any>(null);

  /* ── Reactive dimensions ── */
  const { width } = useWindowDimensions();
  const isWide     = width >= 640;
  const maxW       = Math.min(width, 700);
  /* Recipe card width: 42% on mobile, fixed 200 on wide */
  const recipeCardW = isWide ? 200 : width * 0.42;

  useEffect(() => { fetchMealPlans(); }, [fetchMealPlans]);

  if (loading && (!mealPlans || mealPlans.length === 0)) {
    return (
      <LinearGradient colors={["#b8b5b5","#888888","#ffffff","#888888","#b8b5b5"]} locations={[0,0.2,0.5,0.8,1]} start={{x:0.5,y:0}} end={{x:0.5,y:1}} style={s.container}>
        <View style={s.center}><ActivityIndicator size="large" color="#111" /></View>
      </LinearGradient>
    );
  }

  /* ── PLAN DETAIL VIEW ─────────────────────────────────────── */
  if (selectedPlan) {
    return (
      <LinearGradient colors={["#b8b5b5","#888888","#ffffff","#888888","#b8b5b5"]} locations={[0,0.2,0.5,0.8,1]} start={{x:0.5,y:0}} end={{x:0.5,y:1}} style={s.container}>
        <View style={s.titleRow}>
          <TouchableOpacity onPress={() => setSelectedPlan(null)} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.pageTitle} numberOfLines={1}>{selectedPlan.title}</Text>
          <TouchableOpacity onPress={() => setEditingPlan(selectedPlan)}>
            <Edit2 size={20} color="#111" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[s.detailScrollContent, { alignItems: isWide ? "center" : undefined }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: "100%", maxWidth: maxW }}>
            {selectedPlan.description ? <Text style={s.planDesc}>{selectedPlan.description}</Text> : null}

            {WEEK_DAYS.map((dayKey) => {
              const d = selectedPlan.days?.[dayKey] || emptyDay();
              const meals = [
                { label:"Breakfast 🍳",   items: d.breakfast },
                { label:"Brunch 🥑",      items: d.brunch },
                { label:"Lunch 🥗",       items: d.lunch },
                { label:"Evening Snack 🍎",items: d.eveningSnack },
                { label:"Dinner 🍽️",     items: d.dinner },
              ];
              const hasAny = meals.some(m => m.items?.length > 0);
              return (
                <View key={dayKey} style={s.dayCard}>
                  <Text style={s.dayTitle}>{dayKey.charAt(0).toUpperCase()+dayKey.slice(1)}</Text>
                  {hasAny ? meals.map(m => (
                    m.items?.length > 0 && (
                      <View key={m.label} style={s.mealRow}>
                        <Text style={s.mealLabel}>{m.label}</Text>
                        <Text style={s.mealItems}>{m.items.join(", ")}</Text>
                      </View>
                    )
                  )) : (
                    <Text style={s.emptyDay}>No meals planned</Text>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>

        {editingPlan && (
          <EditClientMealPlanOverlay
            mealPlan={editingPlan}
            onClose={async () => {
              setEditingPlan(null);
              await fetchMealPlans();
              const refreshed = (mealPlans||[]).find((p:any) => p._id === editingPlan._id);
              if (refreshed) setSelectedPlan(refreshed);
            }}
            updateMealPlan={async (id, days) => {
              try { await updateMealPlan(id, days); await fetchMealPlans(); }
              catch (err:any) { Alert.alert("Error", err?.response?.data?.msg || "Failed to update"); }
            }}
          />
        )}
      </LinearGradient>
    );
  }

  /* ── MAIN LIBRARY VIEW ────────────────────────────────────── */
  return (
    <LinearGradient
      colors={["#b8b5b5","#888888","#ffffff","#888888","#b8b5b5"]}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{x:0.5, y:0}}
      end={{x:0.5, y:1}}
      style={s.container}
    >
      {/* ── PAGE TITLE ── */}
      <View style={s.headerArea}>
        <Text style={s.pageTitle}>Library</Text>
      </View>

      {/* ── TABS ── */}
      <View style={s.tabRow}>
        {(["Meals"] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab===t && s.tabActive]} onPress={()=>setTab(t)} activeOpacity={0.8}>
            <Text style={[s.tabText, tab===t && s.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[s.scrollContent, { alignItems: isWide ? "center" : undefined }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Constrained inner wrapper */}
        <View style={{ width: "100%", maxWidth: maxW }}>

          {tab === "Meals" ? (
            <>
              {/* ── RECIPE BOOK ── */}
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Recipe Book</Text>
                <TouchableOpacity><Text style={s.viewAll}>View all</Text></TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.recipeScroll}
                contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
              >
                {RECIPE_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.label}
                    style={[s.recipeCard, { width: recipeCardW }]}
                    activeOpacity={0.88}
                    onPress={() => router.push("/pages/client/RecipesScreen")}
                  >
                    <Image source={{ uri: cat.img }} style={s.recipeImg} />
                    <Text style={s.recipeLabel}>{cat.label}</Text>
                    <Text style={s.recipeCount}>{cat.count} Recipes</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* ── PERSONALIZED PLANS ── */}
              <View style={[s.sectionHeader, { marginTop: 24 }]}>
                <Text style={s.sectionTitle}>Personalized Plans</Text>
              </View>

              {(!mealPlans || mealPlans.length === 0) ? (
                <View style={s.emptyCard}>
                  <Text style={s.emptyText}>No meal plans assigned yet 🥗</Text>
                </View>
              ) : (
                mealPlans.map((mp: any) => {
                  const todayKey = (["sunday","monday","tuesday","wednesday","thursday","friday","saturday"])[new Date().getDay()];
                  const todayMeals = mp.days?.[todayKey] || {};
                  const mealSlots = [
                    { label: "🍳 Breakfast",    items: todayMeals.breakfast    || [] },
                    { label: "🥑 Brunch",       items: todayMeals.brunch       || [] },
                    { label: "🥗 Lunch",        items: todayMeals.lunch        || [] },
                    { label: "🍎 Evening Snack",items: todayMeals.eveningSnack || [] },
                    { label: "🍽️ Dinner",      items: todayMeals.dinner       || [] },
                  ].filter(slot => slot.items.length > 0);

                  return (
                    <View key={mp._id} style={s.todayPlanCard}>
                      <View style={s.todayPlanHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.todayPlanTitle}>{mp.title}</Text>
                          {mp.description ? <Text style={s.todayPlanDesc}>{mp.description}</Text> : null}
                        </View>
                        <TouchableOpacity onPress={() => setEditingPlan(mp)} style={s.editChip}>
                          <Edit2 size={12} color="#fff" />
                          <Text style={s.editChipText}>Edit</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={s.todayBadgeRow}>
                        <View style={s.todayBadge}>
                          <Text style={s.todayBadgeText}>
                            📅 Today — {todayKey.charAt(0).toUpperCase() + todayKey.slice(1)}
                          </Text>
                        </View>
                      </View>

                      {mealSlots.length === 0 ? (
                        <Text style={s.noTodayMeals}>No meals planned for today</Text>
                      ) : (
                        mealSlots.map(slot => (
                          <View key={slot.label} style={s.mealSlotRow}>
                            <Text style={s.mealSlotLabel}>{slot.label}</Text>
                            <View style={s.mealSlotItems}>
                              {slot.items.map((item: string, i: number) => (
                                <View key={i} style={s.mealPill}>
                                  <Text style={s.mealPillText}>{item}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        ))
                      )}

                      <TouchableOpacity
                        style={s.viewAllDaysBtn}
                        onPress={() => setSelectedPlan(mp)}
                        activeOpacity={0.85}
                      >
                        <Text style={s.viewAllDaysText}>View full week plan →</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}

              {/* ── WEEK SUMMARY ── */}
              {mealPlans?.length > 0 && (
                <>
                  <View style={[s.sectionHeader, { marginTop: 24 }]}>
                    <Text style={s.sectionTitle}>This Week</Text>
                  </View>
                  {WEEK_DAYS.map(day => {
                    const plan = mealPlans[0];
                    const dayData = plan?.days?.[day];
                    const count = (dayData?.breakfast?.length||0)+(dayData?.lunch?.length||0)+(dayData?.dinner?.length||0)+(dayData?.brunch?.length||0)+(dayData?.eveningSnack?.length||0);
                    return (
                      <View key={day} style={s.weekRow}>
                        <Text style={s.weekDay}>{day.charAt(0).toUpperCase()+day.slice(1)}</Text>
                        <View style={s.weekBar}>
                          <View style={[s.weekBarFill, { width: `${Math.min(count * 12, 100)}%` }]} />
                        </View>
                        <Text style={s.weekCount}>{count} items</Text>
                      </View>
                    );
                  })}
                </>
              )}
            </>
          ) : (
            <View style={s.emptyCard}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📁</Text>
              <Text style={s.emptyText}>No files shared yet</Text>
            </View>
          )}

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>

      {editingPlan && (
        <EditClientMealPlanOverlay
          mealPlan={editingPlan}
          onClose={async () => {
            setEditingPlan(null);
            await fetchMealPlans();
          }}
          updateMealPlan={async (id, days) => {
            try { await updateMealPlan(id, days); await fetchMealPlans(); }
            catch (err:any) { Alert.alert("Error", err?.response?.data?.msg || "Failed to update"); }
          }}
        />
      )}
    </LinearGradient>
  );
}

/* ── EDIT OVERLAY ──────────────────────────────────────────── */
function EditClientMealPlanOverlay({ mealPlan, onClose, updateMealPlan }: {
  mealPlan: any; onClose: () => void;
  updateMealPlan: (id: string, days: any) => Promise<void>;
}) {
  const initialDaysStr = WEEK_DAYS.reduce((acc, d) => {
    const day = mealPlan.days?.[d] || emptyDay();
    acc[d] = {
      breakfast:   (day.breakfast||[]).join(", "),
      brunch:      (day.brunch||[]).join(", "),
      lunch:       (day.lunch||[]).join(", "),
      eveningSnack:(day.eveningSnack||[]).join(", "),
      dinner:      (day.dinner||[]).join(", "),
    };
    return acc;
  }, {} as Record<DayKey, Record<string,string>>);

  const [title, setTitle]      = useState(mealPlan.title||"");
  const [description, setDesc] = useState(mealPlan.description||"");
  const [daysStr, setDaysStr]  = useState(initialDaysStr);
  const [saving, setSaving]    = useState(false);

  const updateField = (day:DayKey, meal:string, val:string) =>
    setDaysStr(prev => ({...prev, [day]:{...prev[day],[meal]:val}}));

  const parseDays = () => {
    const parsed:any = {};
    WEEK_DAYS.forEach(d => {
      parsed[d] = {
        breakfast:    daysStr[d].breakfast.split(",").map(s=>s.trim()).filter(Boolean),
        brunch:       daysStr[d].brunch.split(",").map(s=>s.trim()).filter(Boolean),
        lunch:        daysStr[d].lunch.split(",").map(s=>s.trim()).filter(Boolean),
        eveningSnack: daysStr[d].eveningSnack.split(",").map(s=>s.trim()).filter(Boolean),
        dinner:       daysStr[d].dinner.split(",").map(s=>s.trim()).filter(Boolean),
      };
    });
    return parsed;
  };

  const handleSave = async () => {
    if (!title) return Alert.alert("Missing title");
    setSaving(true);
    try {
      await updateMealPlan(mealPlan._id, parseDays());
      Alert.alert("Saved ✓","Meal plan updated");
      onClose();
    } catch(err:any) {
      Alert.alert("Error", err?.response?.data?.msg || "Failed to update");
    } finally { setSaving(false); }
  };

  return (
    <Modal transparent animationType="slide">
      <View style={s.overlay}>
        <View style={s.overlayCard}>
          <View style={s.overlayHeader}>
            <Text style={s.overlayTitle}>Edit Meal Plan</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <X size={20} color="#111" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <TextInput style={s.input} placeholder="Plan title" placeholderTextColor="#aaa" value={title} onChangeText={setTitle} />
            <TextInput style={s.input} placeholder="Description (optional)" placeholderTextColor="#aaa" value={description} onChangeText={setDesc} />

            <Text style={s.overlaySubheading}>Edit meals (comma-separated)</Text>

            {WEEK_DAYS.map(day => (
              <View key={day} style={s.dayEditBlock}>
                <Text style={s.dayEditLabel}>{day.charAt(0).toUpperCase()+day.slice(1)}</Text>
                {[
                  ["breakfast","🍳 Breakfast"],
                  ["brunch","🥑 Brunch"],
                  ["lunch","🥗 Lunch"],
                  ["eveningSnack","🍎 Evening Snack"],
                  ["dinner","🍽️ Dinner"],
                ].map(([key, label]) => (
                  <TextInput
                    key={key}
                    style={s.smallInput}
                    placeholder={label as string}
                    placeholderTextColor="#bbb"
                    value={daysStr[day as DayKey][key as string]}
                    onChangeText={v => updateField(day as DayKey, key as string, v)}
                  />
                ))}
              </View>
            ))}

            <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              <Text style={s.saveBtnText}>{saving ? "Saving..." : "Save Changes"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={{ marginTop: 12, marginBottom: 30 }}>
              <Text style={{ color: "#aaa", textAlign:"center", fontSize:14 }}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ─── styles ─────────────────────────────────────────────────── */
const WHITE   = "#ffffff";
const BLACK   = "#111111";
const GRAY100 = "#f5f5f5";
const GRAY300 = "#e0e0e0";
const GRAY500 = "#888888";
const PINK    = "#848183";

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex:1, justifyContent:"center", alignItems:"center" },

  /* ── HEADER ── */
  headerArea: {
    paddingTop: 58,
    paddingBottom: 10,
    alignItems: "center",
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: BLACK,
    letterSpacing: -0.4,
    fontFamily: "System",
  },

  /* ── TABS ── */
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 4,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  tabActive: {
    backgroundColor: WHITE,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: { fontSize: 15, fontWeight: "600", color: GRAY500, fontFamily: "System" },
  tabTextActive: { color: BLACK, fontWeight: "700" },

  /* ── SCROLL ── */
  scrollContent: {
    paddingTop: 0,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  detailScrollContent: {
    padding: 16,
    paddingBottom: 60,
  },

  /* ── SECTION HEADERS ── */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: { fontSize: 19, fontWeight: "800", color: BLACK, fontFamily: "System" },
  viewAll: { fontSize: 14, fontWeight: "500", color: GRAY500 },

  /* ── RECIPE BOOK ── */
  recipeScroll: { marginHorizontal: -16 },
  recipeCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    marginRight: 12,
    /* width set inline via recipeCardW */
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    paddingBottom: 12,
  },
  recipeImg: {
    width: "100%",
    height: 130,
    borderRadius: 0,
    marginBottom: 10,
    resizeMode: "cover",
  },
  recipeLabel: { fontSize: 15, fontWeight: "700", color: BLACK, paddingHorizontal: 12, fontFamily: "System" },
  recipeCount: { fontSize: 12, color: GRAY500, paddingHorizontal: 12, marginTop: 2 },

  /* ── TODAY PLAN CARD ── */
  todayPlanCard: {
    backgroundColor: "rgba(255,255,255,0.93)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  todayPlanHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 10,
  },
  todayPlanTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: BLACK,
    fontFamily: "System",
  },
  todayPlanDesc: { fontSize: 12, color: GRAY500, marginTop: 2 },
  todayBadgeRow: { marginBottom: 12 },
  todayBadge: {
    alignSelf: "flex-start",
    backgroundColor: PINK,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  todayBadgeText: { fontSize: 12, fontWeight: "700", color: "#2f2e2f" },
  noTodayMeals: {
    fontSize: 13, color: GRAY500, fontStyle: "italic",
    marginBottom: 12, textAlign: "center", paddingVertical: 8,
  },
  mealSlotRow: { marginBottom: 10 },
  mealSlotLabel: {
    fontSize: 12, fontWeight: "700", color: GRAY500,
    marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.4,
  },
  mealSlotItems: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  mealPill: {
    backgroundColor: GRAY100, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: GRAY300,
  },
  mealPillText: { fontSize: 13, color: BLACK, fontWeight: "500" },
  viewAllDaysBtn: {
    marginTop: 14, borderTopWidth: 1, borderTopColor: GRAY300,
    paddingTop: 12, alignItems: "center",
  },
  viewAllDaysText: { fontSize: 14, fontWeight: "700", color: "#6e6a6c" },

  editChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, gap: 4,
  },
  editChipText: { color: WHITE, fontSize: 12, fontWeight: "600" },

  /* ── WEEK SUMMARY ── */
  weekRow: {
    flexDirection: "row", alignItems: "center", marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 12,
    padding: 10, gap: 10,
  },
  weekDay: { width: 80, fontSize: 13, fontWeight: "600", color: BLACK, fontFamily: "System" },
  weekBar: { flex: 1, height: 6, backgroundColor: GRAY300, borderRadius: 3, overflow: "hidden" },
  weekBarFill: { height: 6, backgroundColor: PINK, borderRadius: 3 },
  weekCount: { width: 50, fontSize: 12, color: GRAY500, textAlign: "right" },

  /* ── EMPTY ── */
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 18,
    padding: 32, alignItems: "center", marginTop: 12,
  },
  emptyText: { fontSize: 15, color: GRAY500, textAlign: "center" },

  /* ── PLAN DETAIL ── */
  backBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  backText: { fontSize: 14, color: GRAY500, fontWeight: "600" },
  titleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 54, paddingHorizontal: 16, paddingBottom: 10,
  },
  planDesc: { fontSize: 13, color: GRAY500, marginBottom: 16 },
  dayCard: {
    backgroundColor: "rgba(255,255,255,0.88)", borderRadius: 14,
    padding: 14, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  dayTitle: {
    fontSize: 15, fontWeight: "800", color: BLACK, marginBottom: 8,
    textTransform: "capitalize", fontFamily: "System",
  },
  mealRow: { flexDirection: "row", marginBottom: 6, gap: 8 },
  mealLabel: { fontSize: 12, color: GRAY500, width: 110 },
  mealItems: { fontSize: 12, color: BLACK, flex: 1 },
  emptyDay: { fontSize: 13, color: GRAY500, fontStyle: "italic" },

  /* ── OVERLAY / EDIT MODAL ── */
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  overlayCard: {
    backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: "92%",
  },
  overlayHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
  },
  overlayTitle: { fontSize: 20, fontWeight: "800", color: BLACK, fontFamily: "System" },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: GRAY100, justifyContent: "center", alignItems: "center",
  },
  overlaySubheading: { fontSize: 14, fontWeight: "700", color: GRAY500, marginBottom: 12, marginTop: 4 },
  dayEditBlock: { backgroundColor: GRAY100, borderRadius: 12, padding: 12, marginBottom: 12 },
  dayEditLabel: { fontSize: 14, fontWeight: "700", color: BLACK, marginBottom: 8, textTransform: "capitalize" },
  input: {
    backgroundColor: GRAY100, color: BLACK, borderRadius: 12,
    padding: 13, marginBottom: 10, fontSize: 14,
    borderWidth: 1, borderColor: GRAY300,
  },
  smallInput: {
    backgroundColor: WHITE, color: BLACK, borderRadius: 10,
    padding: 10, marginBottom: 6, fontSize: 13,
    borderWidth: 1, borderColor: GRAY300,
  },
  saveBtn: {
    backgroundColor: BLACK, padding: 15, borderRadius: 14,
    alignItems: "center", marginTop: 8,
  },
  saveBtnText: { color: WHITE, fontWeight: "700", fontSize: 15 },
});