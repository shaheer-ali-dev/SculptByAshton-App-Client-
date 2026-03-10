"use client";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ChevronRight, Edit2, Heart, Plus, ShoppingCart, Trash2, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useClientMealPlanStore } from "../../../store/mealPlanStore";
import { useFoodiesStore } from "../../../store/useFoodiesStore";

const { height: SCREEN_H } = Dimensions.get("window");

/* ─── constants ─────────────────────────────────────────────── */
const WEEK_DAYS = [
  "monday","tuesday","wednesday","thursday","friday","saturday","sunday",
] as const;
type DayKey = typeof WEEK_DAYS[number];

/* NEW: tab type */
type TabType = "Meals" | "Shopping" | "Favorites";

const TODAY_ISO = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
})();

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

  /* NEW: foodies store */
  const {
    favoriteMeals, loadingFavorites, fetchFavorites, updateFavorites, deleteFavoriteMeal,
    shopping, loadingShopping, fetchShopping, addShopping, updateShopping, deleteShopping,
  } = useFoodiesStore();

  /* ORIGINAL state */
  const [tab, setTab]               = useState<TabType>("Meals"); // extended to TabType
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [editingPlan, setEditingPlan]   = useState<any>(null);

  /* ── Reactive dimensions (ORIGINAL) ── */
  const { width } = useWindowDimensions();
  const isWide     = width >= 640;
  const maxW       = Math.min(width, 700);
  const recipeCardW = isWide ? 200 : width * 0.42;

  /* NEW: Shopping state */
  const [showShopModal, setShowShopModal] = useState(false);
  const [editShopItem, setEditShopItem]   = useState<any>(null);
  const [shopName, setShopName]           = useState("");
  const [shopQty, setShopQty]             = useState("");
  const [shopPrice, setShopPrice]         = useState("");
  const [shopDate, setShopDate]           = useState(TODAY_ISO);
  const [shopSaving, setShopSaving]       = useState(false);

  /* NEW: Favourites state */
  const [showAddFav, setShowAddFav]     = useState(false);
  const [newFav, setNewFav]             = useState("");
  const [editFavOld, setEditFavOld]     = useState<string|null>(null);
  const [editFavNew, setEditFavNew]     = useState("");
  const [favSaving, setFavSaving]       = useState(false);

  /* ORIGINAL: fetch on mount — extended to also fetch foodies */
  useEffect(() => {
    fetchMealPlans();
    fetchFavorites();
    fetchShopping();
  }, [fetchMealPlans]);

  /* ORIGINAL: loading guard */
  if (loading && (!mealPlans || mealPlans.length === 0)) {
    return (
      <LinearGradient
        colors={["#000000", "#555555", "#ffffff"]}
locations={[0, 0.5, 1]}
start={{x:0.5, y:0}}
end={{x:0.5, y:1}}
        style={s.container}
      >
        <View style={s.center}><ActivityIndicator size="large" color="#111" /></View>
      </LinearGradient>
    );
  }

  /* ════════════════════════════════════════════════════════
     NEW: Shopping helpers
  ════════════════════════════════════════════════════════ */
  const openAddShop = () => {
    setEditShopItem(null); setShopName(""); setShopQty(""); setShopPrice(""); setShopDate(TODAY_ISO);
    setShowShopModal(true);
  };
  const openEditShop = (it: any) => {
    setEditShopItem(it); setShopName(it.item); setShopQty(it.quantity ?? "");
    setShopPrice(it.price != null ? String(it.price) : ""); setShopDate(it.date);
    setShowShopModal(true);
  };
  const saveShop = async () => {
    if (!shopName.trim()) return Alert.alert("Required", "Enter an item name.");
    setShopSaving(true);
    try {
      const payload = {
        item: shopName.trim(),
        quantity: shopQty.trim() || undefined,
        price: shopPrice ? parseFloat(shopPrice) : undefined,
        date: shopDate.trim() || TODAY_ISO,
      };
      if (editShopItem) await updateShopping(editShopItem._id, payload);
      else await addShopping(payload);
      setShowShopModal(false);
    } catch { Alert.alert("Error", "Failed to save."); }
    finally { setShopSaving(false); }
  };
  const deleteShop = (id: string) =>
    Alert.alert("Delete", "Remove this item?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteShopping(id) },
    ]);

  /* Group shopping by date for grouped display */
  const shopByDate = shopping.reduce((acc: Record<string, typeof shopping>, it) => {
    (acc[it.date] || (acc[it.date] = [])).push(it); return acc;
  }, {});
  const sortedDates = Object.keys(shopByDate).sort((a, b) => b.localeCompare(a));

  /* ════════════════════════════════════════════════════════
     NEW: Favourites helpers
  ════════════════════════════════════════════════════════ */
  const addFav = async () => {
    if (!newFav.trim()) return Alert.alert("Required", "Enter a meal name.");
    setFavSaving(true);
    try {
      await updateFavorites([...favoriteMeals, newFav.trim()]);
      setShowAddFav(false); setNewFav("");
    } catch { Alert.alert("Error", "Failed."); }
    finally { setFavSaving(false); }
  };
  const editFav = async () => {
    if (!editFavNew.trim() || !editFavOld) return;
    setFavSaving(true);
    try {
      await updateFavorites(favoriteMeals.map(m => m === editFavOld ? editFavNew.trim() : m));
      setEditFavOld(null); setEditFavNew("");
    } catch { Alert.alert("Error", "Failed."); }
    finally { setFavSaving(false); }
  };
  const deleteFav = (meal: string) =>
    Alert.alert("Remove", `Remove "${meal}" from favourites?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteFavoriteMeal(meal) },
    ]);

  /* ════════════════════════════════════════════════════════
     ORIGINAL: PLAN DETAIL VIEW — unchanged
  ════════════════════════════════════════════════════════ */
  if (selectedPlan) {
    return (
      <LinearGradient
        colors={["#000000", "#555555", "#ffffff"]}
locations={[0, 0.5, 1]}
start={{x:0.5, y:0}}
end={{x:0.5, y:1}}
        style={s.container}
      >
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
                { label:"Breakfast 🍳",    items: d.breakfast },
                { label:"Brunch 🥑",       items: d.brunch },
                { label:"Lunch 🥗",        items: d.lunch },
                { label:"Evening Snack 🍎", items: d.eveningSnack },
                { label:"Dinner 🍽️",      items: d.dinner },
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

        {/* ORIGINAL: Edit overlay inside detail view */}
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

  /* ════════════════════════════════════════════════════════
     ORIGINAL: MAIN LIBRARY VIEW — with new tabs added
  ════════════════════════════════════════════════════════ */
  return (
    <LinearGradient
     colors={["#000000", "#555555", "#ffffff"]}
locations={[0, 0.5, 1]}
start={{x:0.5, y:0}}
end={{x:0.5, y:1}}
      style={s.container}
    >
      {/* ORIGINAL: PAGE TITLE */}
      <View style={s.headerArea}>
        <Text style={s.pageTitle}>Library</Text>
      </View>

      {/* ORIGINAL tabs row — extended to Meals | Shopping | Favorites */}
      <View style={s.tabRow}>
        {(["Meals", "Shopping", "Favorites"] as TabType[]).map(t => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab===t && s.tabActive]} onPress={()=>setTab(t)} activeOpacity={0.8}>
            <Text style={[s.tabText, tab===t && s.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[s.scrollContent, { alignItems: isWide ? "center" : undefined }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ORIGINAL: Constrained inner wrapper */}
        <View style={{ width: "100%", maxWidth: maxW }}>

          {/* ══════════════════════════════════════════════════
              ORIGINAL MEALS TAB — completely unchanged
          ══════════════════════════════════════════════════ */}
          {tab === "Meals" && (
            <>
              {/* NEW: Quick links — Food Diary, Shopping, Favorites (like the image) */}
              <View style={s.quickLinksCard}>
                {[
                  { emoji:"🛒", label:"Shopping list",  onPress: () => setTab("Shopping") },
                  { emoji:"❤️", label:"Favorite meals", onPress: () => setTab("Favorites") },
                ].map((link, i, arr) => (
                  <TouchableOpacity
                    key={link.label}
                    style={[s.quickLinkRow, i < arr.length-1 && { borderBottomWidth:1, borderBottomColor:"#efefef" }]}
                    onPress={link.onPress}
                    activeOpacity={0.85}
                  >
                    <View style={s.quickLinkIconBg}>
                      <Text style={{ fontSize: 20 }}>{link.emoji}</Text>
                    </View>
                    <Text style={s.quickLinkLabel}>{link.label}</Text>
                    <ChevronRight size={18} color="#d0d0d0" />
                  </TouchableOpacity>
                ))}
              </View>

              {/* ORIGINAL: RECIPE BOOK */}
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Recipe Book</Text>
                <TouchableOpacity onPress={() => router.push("/pages/client/RecipesScreen" as any)}>
                  <Text style={s.viewAll}>View all</Text>
                </TouchableOpacity>
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
                    onPress={() => router.push("/pages/client/RecipesScreen" as any)}
                  >
                    <Image source={{ uri: cat.img }} style={s.recipeImg} />
                    <Text style={s.recipeLabel}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* ORIGINAL: PERSONALIZED PLANS */}
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
                    { label: "🍳 Breakfast",     items: todayMeals.breakfast    || [] },
                    { label: "🥑 Brunch",        items: todayMeals.brunch       || [] },
                    { label: "🥗 Lunch",         items: todayMeals.lunch        || [] },
                    { label: "🍎 Evening Snack", items: todayMeals.eveningSnack || [] },
                    { label: "🍽️ Dinner",       items: todayMeals.dinner       || [] },
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

              {/* ORIGINAL: WEEK SUMMARY */}
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
          )}

          {/* ══════════════════════════════════════════════════
              NEW: SHOPPING TAB
          ══════════════════════════════════════════════════ */}
          {tab === "Shopping" && (
            <>
              <View style={s.sectionHeader}>
                <View>
                  <Text style={s.sectionTitle}>Shopping List</Text>
                  <Text style={s.sectionSub}>{shopping.length} item{shopping.length !== 1 ? "s" : ""}</Text>
                </View>
                <TouchableOpacity style={s.addBtn} onPress={openAddShop} activeOpacity={0.85}>
                  <Plus size={15} color="#fff" />
                  <Text style={s.addBtnText}>Add Item</Text>
                </TouchableOpacity>
              </View>

              {loadingShopping ? (
                <View style={s.centerPad}><ActivityIndicator color="#111" /></View>
              ) : shopping.length === 0 ? (
                <View style={s.emptyCard}>
                  <Text style={{ fontSize: 44, marginBottom: 8 }}>🛒</Text>
                  <Text style={s.emptyText}>Your shopping list is empty</Text>
                  <TouchableOpacity onPress={openAddShop} style={s.emptyAction}>
                    <Text style={s.emptyActionText}>+ Add your first item</Text>
                  </TouchableOpacity>
                </View>
              ) : sortedDates.map(date => (
                <View key={date} style={{ marginBottom: 18 }}>
                  {/* Date group header */}
                  <View style={s.dateHeader}>
                    <View style={s.dateDot} />
                    <Text style={s.dateHeaderText}>
                      {date === TODAY_ISO
                        ? "Today"
                        : new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" })
                      }
                    </Text>
                    {/* Date total */}
                    {shopByDate[date].some(i => i.price != null) && (
                      <Text style={s.dateTotal}>
                        ${shopByDate[date].reduce((sum, i) => sum + (i.price ?? 0), 0).toFixed(2)}
                      </Text>
                    )}
                  </View>

                  {shopByDate[date].map(it => (
                    <View key={it._id} style={s.shopCard}>
                      <View style={s.shopCardLeft}>
                        <View style={s.shopIconWrap}>
                          <ShoppingCart size={15} color="#111" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.shopItemName}>{it.item}</Text>
                          <View style={{ flexDirection:"row", gap:10, marginTop:3 }}>
                            {it.quantity && <Text style={s.shopMeta}>📦 {it.quantity}</Text>}
                            {it.price != null && <Text style={s.shopMeta}>💰 ${it.price.toFixed(2)}</Text>}
                          </View>
                        </View>
                      </View>
                      <View style={{ flexDirection:"row", gap:4 }}>
                        <TouchableOpacity onPress={() => openEditShop(it)} style={s.iconBtn}>
                          <Edit2 size={14} color="#888" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteShop(it._id)} style={s.iconBtn}>
                          <Trash2 size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </>
          )}

          {/* ══════════════════════════════════════════════════
              NEW: FAVORITES TAB
          ══════════════════════════════════════════════════ */}
          {tab === "Favorites" && (
            <>
              <View style={s.sectionHeader}>
                <View>
                  <Text style={s.sectionTitle}>Favourite Meals</Text>
                  <Text style={s.sectionSub}>{favoriteMeals.length} saved</Text>
                </View>
                <TouchableOpacity style={s.addBtn} onPress={() => setShowAddFav(true)} activeOpacity={0.85}>
                  <Plus size={15} color="#fff" />
                  <Text style={s.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              {loadingFavorites ? (
                <View style={s.centerPad}><ActivityIndicator color="#111" /></View>
              ) : favoriteMeals.length === 0 ? (
                <View style={s.emptyCard}>
                  <Text style={{ fontSize: 44, marginBottom: 8 }}>❤️</Text>
                  <Text style={s.emptyText}>No favourite meals saved yet</Text>
                  <TouchableOpacity onPress={() => setShowAddFav(true)} style={s.emptyAction}>
                    <Text style={s.emptyActionText}>+ Save your first favourite</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={s.favGrid}>
                  {favoriteMeals.map((meal, i) => (
                    <View key={i} style={s.favCard}>
                      <View style={s.favCardBody}>
                        <Heart size={17} color="#ef4444" fill="#ef4444" style={{ marginBottom: 7 }} />
                        <Text style={s.favName} numberOfLines={3}>{meal}</Text>
                      </View>
                      <View style={s.favCardActions}>
                        <TouchableOpacity
                          style={s.favActionBtn}
                          onPress={() => { setEditFavOld(meal); setEditFavNew(meal); }}
                        >
                          <Edit2 size={13} color="#888" />
                        </TouchableOpacity>
                        <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
                        <TouchableOpacity style={s.favActionBtn} onPress={() => deleteFav(meal)}>
                          <Trash2 size={13} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>

      {/* ORIGINAL: Edit overlay from main view */}
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

      {/* ══ NEW: Shopping Add/Edit Modal ══ */}
      <Modal visible={showShopModal} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.overlay}>
            <View style={s.overlayCard}>
              <View style={s.sheetHandle} />
              <View style={s.overlayHeader}>
                <Text style={s.overlayTitle}>{editShopItem ? "Edit Item" : "Add to Shopping List"}</Text>
                <TouchableOpacity onPress={() => setShowShopModal(false)} style={s.closeBtn}>
                  <X size={20} color="#111" />
                </TouchableOpacity>
              </View>

              <Text style={s.fieldLabel}>ITEM NAME *</Text>
              <TextInput style={s.input} placeholder="e.g. Chicken breast" placeholderTextColor="#bbb" value={shopName} onChangeText={setShopName} autoFocus />

              <View style={{ flexDirection:"row", gap:10 }}>
                <View style={{ flex:1 }}>
                  <Text style={s.fieldLabel}>QUANTITY</Text>
                  <TextInput style={s.input} placeholder="e.g. 500g" placeholderTextColor="#bbb" value={shopQty} onChangeText={setShopQty} />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={s.fieldLabel}>PRICE ($)</Text>
                  <TextInput style={s.input} placeholder="0.00" placeholderTextColor="#bbb" value={shopPrice} onChangeText={setShopPrice} keyboardType="numeric" />
                </View>
              </View>

              <Text style={s.fieldLabel}>DATE</Text>
              <TextInput style={s.input} placeholder="YYYY-MM-DD" placeholderTextColor="#bbb" value={shopDate} onChangeText={setShopDate} />

              <TouchableOpacity style={[s.saveBtn, shopSaving && { opacity: 0.55 }]} onPress={saveShop} disabled={shopSaving} activeOpacity={0.88}>
                {shopSaving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>{editShopItem ? "Save Changes" : "Add Item"}</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowShopModal(false)} style={{ marginTop:12, marginBottom:8, alignItems:"center" }}>
                <Text style={{ color:"#aaa", fontSize:14 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══ NEW: Add Favourite Modal ══ */}
      <Modal visible={showAddFav} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.overlayCard}>
            <View style={s.sheetHandle} />
            <View style={s.overlayHeader}>
              <Text style={s.overlayTitle}>Add Favourite Meal</Text>
              <TouchableOpacity onPress={() => setShowAddFav(false)} style={s.closeBtn}>
                <X size={20} color="#111" />
              </TouchableOpacity>
            </View>
            <Text style={s.fieldLabel}>MEAL NAME *</Text>
            <TextInput style={s.input} placeholder="e.g. Grilled salmon with rice" placeholderTextColor="#bbb" value={newFav} onChangeText={setNewFav} autoFocus />
            <TouchableOpacity style={[s.saveBtn, favSaving && { opacity: 0.55 }]} onPress={addFav} disabled={favSaving} activeOpacity={0.88}>
              {favSaving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Favourite</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAddFav(false)} style={{ marginTop:12, marginBottom:8, alignItems:"center" }}>
              <Text style={{ color:"#aaa", fontSize:14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ NEW: Edit Favourite Modal ══ */}
      <Modal visible={!!editFavOld} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.overlayCard}>
            <View style={s.sheetHandle} />
            <View style={s.overlayHeader}>
              <Text style={s.overlayTitle}>Edit Favourite</Text>
              <TouchableOpacity onPress={() => setEditFavOld(null)} style={s.closeBtn}>
                <X size={20} color="#111" />
              </TouchableOpacity>
            </View>
            <Text style={s.fieldLabel}>MEAL NAME *</Text>
            <TextInput style={s.input} value={editFavNew} onChangeText={setEditFavNew} autoFocus />
            <TouchableOpacity style={[s.saveBtn, favSaving && { opacity: 0.55 }]} onPress={editFav} disabled={favSaving} activeOpacity={0.88}>
              {favSaving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditFavOld(null)} style={{ marginTop:12, marginBottom:8, alignItems:"center" }}>
              <Text style={{ color:"#aaa", fontSize:14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </LinearGradient>
  );
}

/* ════════════════════════════════════════════════════════════
   ORIGINAL: EditClientMealPlanOverlay — completely unchanged
════════════════════════════════════════════════════════════ */
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
          {/* ORIGINAL header */}
          <View style={s.overlayHeader}>
            <Text style={s.overlayTitle}>Edit Meal Plan</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <X size={20} color="#111" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* ORIGINAL inputs */}
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
// ORIGINAL palette — unchanged
const WHITE   = "#ffffff";
const BLACK   = "#111111";
const GRAY100 = "#f5f5f5";
const GRAY300 = "#e0e0e0";
const GRAY500 = "#888888";
const PINK    = "#848183";

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex:1, justifyContent:"center", alignItems:"center" },
  centerPad: { paddingVertical: 40, alignItems: "center" }, // NEW

  /* ── ORIGINAL: HEADER ── */
  headerArea: {
    paddingTop: 58,
    paddingBottom: 10,
    alignItems: "center",
  },
  pageTitle: {
    fontSize: 24,
    color:WHITE,
    fontWeight: "800",
    letterSpacing: -0.4,
    fontFamily: "Lato-Regular",
  },

  /* ── ORIGINAL: TABS ── */
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 4,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
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
  tabText: { fontSize: 14, fontWeight: "600", color: GRAY500, fontFamily: "Lato-Regular" },
  tabTextActive: { color: BLACK, fontWeight: "700" },

  /* ── ORIGINAL: SCROLL ── */
  scrollContent: {
    paddingTop: 0,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  detailScrollContent: {
    padding: 16,
    paddingBottom: 60,
  },

  /* ── NEW: QUICK LINKS (matches screenshot) ── */
  quickLinksCard: {
    backgroundColor: "rgba(255,255,255,0.93)",
    borderRadius: 18,
    marginBottom: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  quickLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 17,
    paddingHorizontal: 18,
    gap: 14,
  },
  quickLinkIconBg: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: GRAY100,
    justifyContent: "center", alignItems: "center",
  },
  quickLinkLabel: { flex: 1, fontSize: 16, fontWeight: "600", color: BLACK, fontFamily: "Lato-Regular" },

  /* ── ORIGINAL: SECTION HEADERS ── */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: { fontSize: 19, fontWeight: "800", color: BLACK, fontFamily: "Lato-Regular" },
  sectionSub:   { fontSize: 12, color: GRAY500, marginTop: 2 }, // NEW
  viewAll: { fontSize: 14, fontWeight: "500", color: GRAY500 },

  /* ── NEW: ADD BUTTON ── */
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: BLACK, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  addBtnText: { fontSize: 13, fontWeight: "700", color: WHITE },

  /* ── ORIGINAL: RECIPE BOOK ── */
  recipeScroll: { marginHorizontal: -16 },
  recipeCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    marginRight: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    paddingBottom: 12,
  },
  recipeImg: {
    width: "100%", height: 130,
    borderRadius: 0, marginBottom: 10, resizeMode: "cover",
  },
  recipeLabel: { fontSize: 15, fontWeight: "700", color: BLACK, paddingHorizontal: 12, fontFamily: "Lato-Regular" },
  recipeCount: { fontSize: 12, color: GRAY500, paddingHorizontal: 12, marginTop: 2 },

  /* ── ORIGINAL: TODAY PLAN CARD ── */
  todayPlanCard: {
    backgroundColor: "rgba(255,255,255,0.93)",
    borderRadius: 20, padding: 16, marginBottom: 16,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  todayPlanHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10, gap: 10 },
  todayPlanTitle:  { fontSize: 17, fontWeight: "800", color: BLACK, fontFamily: "Lato-Regular" },
  todayPlanDesc:   { fontSize: 12, color: GRAY500, marginTop: 2 },
  todayBadgeRow:   { marginBottom: 12 },
  todayBadge: {
    alignSelf: "flex-start", backgroundColor: PINK,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
  },
  todayBadgeText:  { fontSize: 12, fontWeight: "700", color: "#2f2e2f" },
  noTodayMeals: {
    fontSize: 13, color: GRAY500, fontStyle: "italic",
    marginBottom: 12, textAlign: "center", paddingVertical: 8,
  },
  mealSlotRow:   { marginBottom: 10 },
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
  mealPillText:    { fontSize: 13, color: BLACK, fontWeight: "500" },
  viewAllDaysBtn: {
    marginTop: 14, borderTopWidth: 1, borderTopColor: GRAY300,
    paddingTop: 12, alignItems: "center",
  },
  viewAllDaysText: { fontSize: 14, fontWeight: "700", color: "#6e6a6c" },
  editChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 4,
  },
  editChipText: { color: WHITE, fontSize: 12, fontWeight: "600" },

  /* ── ORIGINAL: WEEK SUMMARY ── */
  weekRow: {
    flexDirection: "row", alignItems: "center", marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 12, padding: 10, gap: 10,
  },
  weekDay:     { width: 80, fontSize: 13, fontWeight: "600", color: BLACK, fontFamily: "Lato-Regular" },
  weekBar:     { flex: 1, height: 6, backgroundColor: GRAY300, borderRadius: 3, overflow: "hidden" },
  weekBarFill: { height: 6, backgroundColor: PINK, borderRadius: 3 },
  weekCount:   { width: 50, fontSize: 12, color: GRAY500, textAlign: "right" },

  /* ── ORIGINAL: EMPTY ── */
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 18,
    padding: 32, alignItems: "center", marginTop: 12,
  },
  emptyText:       { fontSize: 15, color: GRAY500, textAlign: "center" },
  emptyAction:     { marginTop: 12, backgroundColor: BLACK, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }, // NEW
  emptyActionText: { fontSize: 13, fontWeight: "700", color: WHITE }, // NEW

  /* ── ORIGINAL: PLAN DETAIL ── */
  backBtn:  { paddingHorizontal: 16, paddingVertical: 8 },
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
    textTransform: "capitalize", fontFamily: "Lato-Regular",
  },
  mealRow:   { flexDirection: "row", marginBottom: 6, gap: 8 },
  mealLabel: { fontSize: 12, color: GRAY500, width: 110 },
  mealItems: { fontSize: 12, color: BLACK, flex: 1 },
  emptyDay:  { fontSize: 13, color: GRAY500, fontStyle: "italic" },

  /* ── ORIGINAL: OVERLAY / EDIT MODAL ── */
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  overlayCard: {
    backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: "92%",
  },
  sheetHandle: { // NEW: drag handle for new modals
    width: 40, height: 4, borderRadius: 2, backgroundColor: "#ddd",
    alignSelf: "center", marginBottom: 14,
  },
  overlayHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
  },
  overlayTitle: { fontSize: 20, fontWeight: "800", color: BLACK, fontFamily: "Lato-Regular" },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: GRAY100, justifyContent: "center", alignItems: "center",
  },
  overlaySubheading: { fontSize: 14, fontWeight: "700", color: GRAY500, marginBottom: 12, marginTop: 4 },
  dayEditBlock:      { backgroundColor: GRAY100, borderRadius: 12, padding: 12, marginBottom: 12 },
  dayEditLabel:      { fontSize: 14, fontWeight: "700", color: BLACK, marginBottom: 8, textTransform: "capitalize" },

  // ORIGINAL input styles — unchanged
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

  // NEW: field label for new modals
  fieldLabel: {
    fontSize: 10, fontWeight: "800", color: GRAY500,
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8,
  },

  /* ── NEW: SHOPPING styles ── */
  dateHeader:     { flexDirection:"row", alignItems:"center", gap:8, marginBottom:10 },
  dateDot:        { width:8, height:8, borderRadius:4, backgroundColor:BLACK },
  dateHeaderText: { flex:1, fontSize:12, fontWeight:"800", color:BLACK, textTransform:"uppercase", letterSpacing:0.5 },
  dateTotal:      { fontSize:12, fontWeight:"700", color:BLACK },
  shopCard: {
    backgroundColor:"rgba(255,255,255,0.93)", borderRadius:14, padding:14, marginBottom:8,
    flexDirection:"row", alignItems:"center",
    shadowColor:"#000", shadowOpacity:0.05, shadowRadius:6, elevation:1,
  },
  shopCardLeft:  { flexDirection:"row", alignItems:"center", flex:1, gap:12 },
  shopIconWrap:  { width:34, height:34, borderRadius:17, backgroundColor:GRAY100, justifyContent:"center", alignItems:"center" },
  shopItemName:  { fontSize:15, fontWeight:"700", color:BLACK },
  shopMeta:      { fontSize:12, color:GRAY500 },
  iconBtn:       { width:34, height:34, borderRadius:17, backgroundColor:GRAY100, justifyContent:"center", alignItems:"center" },

  /* ── NEW: FAVORITES styles ── */
  favGrid: { flexDirection:"row", flexWrap:"wrap", gap:10 },
  favCard: {
    backgroundColor:"rgba(255,255,255,0.93)", borderRadius:16, width:"48%",
    overflow:"hidden", flexDirection:"row",
    shadowColor:"#000", shadowOpacity:0.06, shadowRadius:8, elevation:2,
  },
  favCardBody:    { flex:1, padding:13 },
  favName:        { fontSize:13, fontWeight:"600", color:BLACK, lineHeight:19 },
  favCardActions: { width:36, justifyContent:"center", borderLeftWidth:1, borderLeftColor:"#efefef" },
  favActionBtn:   { flex:1, justifyContent:"center", alignItems:"center" },
});