import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useRecipeStore, Recipe, Ingredient } from "@/store/useRecipeStore";

/* ─── Palette ────────────────────────────────────────────────── */
const WHITE   = "#ffffff";
const BLACK   = "#111111";
const GRAY100 = "#f5f5f5";
const GRAY200 = "#ebebeb";
const GRAY300 = "#d4d4d4";
const GRAY500 = "#737373";

/* ─── Category config ────────────────────────────────────────── */
const CATEGORY_META = {
  breakfast: { emoji: "🌅", label: "Breakfast", color: "#fef9c3", border: "#fde68a", text: "#92400e" },
  lunch:     { emoji: "☀️",  label: "Lunch",     color: "#d1fae5", border: "#6ee7b7", text: "#065f46" },
  dinner:    { emoji: "🌙", label: "Dinner",    color: "#ede9fe", border: "#c4b5fd", text: "#5b21b6" },
  snacks:    { emoji: "🍎", label: "Snacks",    color: "#fee2e2", border: "#fca5a5", text: "#991b1b" },
} as const;

type MealType = keyof typeof CATEGORY_META;
const MEAL_TYPES = Object.keys(CATEGORY_META) as MealType[];

/* CoachRecipe extends store Recipe with the fields that the coach
   GET /recipes/coach endpoint actually returns */
type CoachRecipe = Recipe & { mealType: MealType; steps?: string[] };

/* ════════════════════════════════════════════════════════════
   MAIN SCREEN
════════════════════════════════════════════════════════════ */
export default function CoachNutritionScreen() {
  const router = useRouter();

  /* ── store ── */
  const fetchCoachRecipes = useRecipeStore(s => s.fetchCoachRecipes);
  const deleteRecipe      = useRecipeStore(s => s.deleteRecipe);
  const storeRecipes      = useRecipeStore(s => s.recipes);
  const storeLoading      = useRecipeStore(s => s.loading);

  /* coach store always returns a flat array from GET /recipes/coach */
  const recipes = storeRecipes as unknown as CoachRecipe[];

  /* ── UI state ── */
  const [search,        setSearch]        = useState("");
  const [activeTab,     setActiveTab]     = useState<MealType | "all">("all");
  const [detailRecipe,  setDetailRecipe]  = useState<CoachRecipe | null>(null);
  const [showForm,      setShowForm]      = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<CoachRecipe | null>(null);

  /* ── fetch on mount ── */
  useEffect(() => { fetchCoachRecipes(); }, []);

  /* ── delete via store ── */
  const handleDelete = useCallback((id: string) =>
    Alert.alert("Delete Recipe", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await deleteRecipe(id);
            if (detailRecipe?._id === id) setDetailRecipe(null);
          } catch {
            Alert.alert("Error", "Failed to delete recipe.");
          }
        },
      },
    ]), [detailRecipe, deleteRecipe]);

  /* ── filtered list ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recipes.filter(r => {
      const matchTab    = activeTab === "all" || r.mealType === activeTab;
      const matchSearch = !q
        || r.dishName.toLowerCase().includes(q)
        || r.description?.toLowerCase().includes(q);
      return matchTab && matchSearch;
    });
  }, [recipes, activeTab, search]);

  /* ── counts per tab ── */
  const counts = useMemo(() => {
    const out: Record<string, number> = { all: recipes.length };
    MEAL_TYPES.forEach(c => { out[c] = recipes.filter(r => r.mealType === c).length; });
    return out;
  }, [recipes]);

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
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={s.pageTitle}>Nutrition</Text>
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => { setEditingRecipe(null); setShowForm(true); }}
          >
            <Text style={s.addBtnText}>＋</Text>
          </TouchableOpacity>
        </View>

        {/* ── SEARCH BAR ── */}
        <View style={s.searchWrap}>
          <View style={s.searchBox}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={s.searchInput}
              placeholder="Search recipes…"
              placeholderTextColor="#bbb"
              value={search}
              onChangeText={setSearch}
              clearButtonMode="while-editing"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Text style={{ color: "#bbb", fontSize: 16, paddingRight: 4 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── CATEGORY TABS ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.tabScroll}
          contentContainerStyle={s.tabContent}
        >
          <TouchableOpacity
            style={[s.tab, activeTab === "all" && s.tabActive]}
            onPress={() => setActiveTab("all")}
          >
            <Text style={[s.tabText, activeTab === "all" && s.tabTextActive]}>
              All {counts.all > 0 ? `· ${counts.all}` : ""}
            </Text>
          </TouchableOpacity>
          {MEAL_TYPES.map(cat => {
            const meta     = CATEGORY_META[cat];
            const isActive = activeTab === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  s.tab,
                  isActive && s.tabActive,
                  isActive && { backgroundColor: meta.color, borderColor: meta.border },
                ]}
                onPress={() => setActiveTab(cat)}
              >
                <Text style={[s.tabText, isActive && { color: meta.text, fontWeight: "800" }]}>
                  {meta.emoji} {meta.label}{counts[cat] > 0 ? ` · ${counts[cat]}` : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── RECIPE LIST ── */}
        {storeLoading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={BLACK} />
            <Text style={s.loadingText}>Loading recipes…</Text>
          </View>
        ) : (
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filtered.length === 0 ? (
              <View style={s.emptyWrap}>
                <Text style={s.emptyEmoji}>🍽️</Text>
                <Text style={s.emptyTitle}>No recipes found</Text>
                <Text style={s.emptySub}>
                  {search ? "Try a different search term" : "Tap ＋ to create your first recipe"}
                </Text>
              </View>
            ) : activeTab === "all" ? (
              MEAL_TYPES.map(cat => {
                const group = filtered.filter(r => r.mealType === cat);
                if (group.length === 0) return null;
                const meta = CATEGORY_META[cat];
                return (
                  <View key={cat}>
                    <View style={s.groupHeader}>
                      <Text style={s.groupEmoji}>{meta.emoji}</Text>
                      <Text style={s.groupLabel}>{meta.label}</Text>
                      <View style={[s.groupCount, { backgroundColor: meta.color, borderColor: meta.border }]}>
                        <Text style={[s.groupCountText, { color: meta.text }]}>{group.length}</Text>
                      </View>
                    </View>
                    {group.map(r => (
                      <RecipeCard
                        key={r._id}
                        recipe={r}
                        onPress={() => setDetailRecipe(r)}
                        onEdit={() => { setEditingRecipe(r); setShowForm(true); }}
                        onDelete={() => handleDelete(r._id)}
                      />
                    ))}
                  </View>
                );
              })
            ) : (
              filtered.map(r => (
                <RecipeCard
                  key={r._id}
                  recipe={r}
                  onPress={() => setDetailRecipe(r)}
                  onEdit={() => { setEditingRecipe(r); setShowForm(true); }}
                  onDelete={() => handleDelete(r._id)}
                />
              ))
            )}
            <View style={{ height: 60 }} />
          </ScrollView>
        )}
      </SafeAreaView>

      {/* ── DETAIL MODAL ── */}
      {detailRecipe && (
        <Modal visible animationType="slide">
          <RecipeDetailScreen
            recipe={detailRecipe}
            onClose={() => setDetailRecipe(null)}
            onEdit={() => {
              setEditingRecipe(detailRecipe);
              setDetailRecipe(null);
              setShowForm(true);
            }}
            onDelete={() => {
              handleDelete(detailRecipe._id);
              setDetailRecipe(null);
            }}
          />
        </Modal>
      )}

      {/* ── CREATE / EDIT FORM MODAL ── */}
      {showForm && (
        <Modal visible animationType="slide">
          <RecipeFormScreen
            editing={editingRecipe}
            onClose={() => { setShowForm(false); setEditingRecipe(null); }}
            onSaved={() => {
              setShowForm(false);
              setEditingRecipe(null);
              fetchCoachRecipes(); // re-fetch to stay in sync
            }}
          />
        </Modal>
      )}
    </LinearGradient>
  );
}

/* ════════════════════════════════════════════════════════════
   RECIPE CARD
════════════════════════════════════════════════════════════ */
function RecipeCard({ recipe, onPress, onEdit, onDelete }: {
  recipe: CoachRecipe;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = CATEGORY_META[recipe.mealType] ?? CATEGORY_META.breakfast;
  return (
    <TouchableOpacity style={s.card} activeOpacity={0.88} onPress={onPress}>
      <View style={[s.mealPill, { backgroundColor: meta.color, borderColor: meta.border }]}>
        <Text style={[s.mealPillText, { color: meta.text }]}>{meta.emoji} {meta.label}</Text>
      </View>
      <Text style={s.cardTitle}>{recipe.dishName}</Text>
      {recipe.description ? (
        <Text style={s.cardDesc} numberOfLines={2}>{recipe.description}</Text>
      ) : null}
      <View style={s.cardIngredients}>
        {recipe.ingredients.slice(0, 4).map((ing, i) => (
          <View key={i} style={s.ingChip}>
            <Text style={s.ingChipText}>{ing.name}</Text>
          </View>
        ))}
        {recipe.ingredients.length > 4 && (
          <View style={s.ingChip}>
            <Text style={s.ingChipText}>+{recipe.ingredients.length - 4} more</Text>
          </View>
        )}
      </View>
      <View style={s.cardActions}>
        <TouchableOpacity style={s.cardActionBtn} onPress={onEdit}>
          <Text style={s.cardActionBtnText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.cardActionBtn, s.cardDeleteBtn]} onPress={onDelete}>
          <Text style={[s.cardActionBtnText, { color: "#ef4444" }]}>🗑️ Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.viewBtn} onPress={onPress}>
          <Text style={s.viewBtnText}>View →</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

/* ════════════════════════════════════════════════════════════
   RECIPE DETAIL SCREEN
════════════════════════════════════════════════════════════ */
function RecipeDetailScreen({ recipe, onClose, onEdit, onDelete }: {
  recipe: CoachRecipe; onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const meta = CATEGORY_META[recipe.mealType] ?? CATEGORY_META.breakfast;
  return (
    <LinearGradient
     colors={["#000000", "#555555", "#ffffff"]}
locations={[0, 0.5, 1]}
start={{x:0.5, y:0}}
end={{x:0.5, y:1}}
      style={s.container}
    >
      <SafeAreaView style={s.safe}>
        <View style={s.modalHeader}>
          <TouchableOpacity style={s.backBtn} onPress={onClose}>
            <Text style={s.backBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={s.modalTitle} numberOfLines={1}>{recipe.dishName}</Text>
          <TouchableOpacity style={s.editHeaderBtn} onPress={onEdit}>
            <Text style={s.editHeaderBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[s.detailCatBadge, { backgroundColor: meta.color, borderColor: meta.border }]}>
            <Text style={[s.detailCatBadgeText, { color: meta.text }]}>
              {meta.emoji} {meta.label}
            </Text>
          </View>
          {recipe.description ? (
            <View style={s.detailSection}>
              <Text style={s.detailSectionLabel}>About</Text>
              <Text style={s.detailDesc}>{recipe.description}</Text>
            </View>
          ) : null}
          <View style={s.detailSection}>
            <Text style={s.detailSectionLabel}>Ingredients ({recipe.ingredients.length})</Text>
            <View style={s.detailCard}>
              {recipe.ingredients.map((ing, i) => (
                <View key={i} style={[s.ingRow, i < recipe.ingredients.length - 1 && s.ingRowBorder]}>
                  <View style={s.ingDot} />
                  <Text style={s.ingName}>{ing.name}</Text>
                  <Text style={s.ingQty}>{ing.quantity} {ing.unit}</Text>
                </View>
              ))}
            </View>
          </View>
          {(recipe.steps || []).length > 0 && (
            <View style={s.detailSection}>
              <Text style={s.detailSectionLabel}>Cooking Steps ({(recipe.steps || []).length})</Text>
              {(recipe.steps || []).map((step, i) => (
                <View key={i} style={s.stepRow}>
                  <View style={s.stepNum}>
                    <Text style={s.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={s.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}
          <TouchableOpacity style={s.deleteFullBtn} onPress={onDelete}>
            <Text style={s.deleteFullBtnText}>🗑️  Delete Recipe</Text>
          </TouchableOpacity>
          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ════════════════════════════════════════════════════════════
   RECIPE FORM — uses store.createRecipe() and store.updateRecipe()
════════════════════════════════════════════════════════════ */
function RecipeFormScreen({ editing, onClose, onSaved }: {
  editing: CoachRecipe | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const createRecipe = useRecipeStore(s => s.createRecipe);
  const updateRecipe = useRecipeStore(s => s.updateRecipe);

  const [dishName,    setDishName]    = useState(editing?.dishName || "");
  const [mealType,    setMealType]    = useState<MealType>(editing?.mealType || "breakfast");
  const [description, setDescription] = useState(editing?.description || "");
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    editing?.ingredients?.length
      ? editing.ingredients
      : [{ name: "", quantity: 1, unit: "" }]
  );
  const [steps,  setSteps]  = useState<string[]>(
    editing?.steps?.length ? editing.steps : [""]
  );
  const [saving, setSaving] = useState(false);

  const addIngredient    = () => setIngredients(p => [...p, { name: "", quantity: 1, unit: "" }]);
  const removeIngredient = (i: number) => setIngredients(p => p.filter((_, idx) => idx !== i));
  const updateIng = (i: number, field: keyof Ingredient, val: string | number) =>
    setIngredients(p => p.map((ing, idx) => idx !== i ? ing : { ...ing, [field]: val }));

  const addStep    = () => setSteps(p => [...p, ""]);
  const removeStep = (i: number) => setSteps(p => p.filter((_, idx) => idx !== i));
  const updateStep = (i: number, val: string) =>
    setSteps(p => p.map((s, idx) => idx !== i ? s : val));

  const handleSave = async () => {
    if (!dishName.trim())
      return Alert.alert("Missing", "Enter a dish name.");
    const validIng = ingredients.filter(i => i.name.trim() && i.unit.trim());
    if (!validIng.length)
      return Alert.alert("Missing", "Add at least one ingredient with a name and unit.");
    const validSteps = steps.filter(s => s.trim());
    const mappedIng  = validIng.map(i => ({ ...i, quantity: Number(i.quantity) }));

    setSaving(true);
    try {
      if (editing) {
        await updateRecipe(editing._id, dishName.trim(), mealType, mappedIng, description.trim(), validSteps);
      } else {
        await createRecipe(dishName.trim(), mealType, mappedIng, description.trim(), validSteps);
      }
      onSaved();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.msg || "Failed to save recipe.");
    } finally {
      setSaving(false);
    }
  };

  return (
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
            <TouchableOpacity style={s.backBtn} onPress={onClose}>
              <Text style={s.backBtnText}>‹</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>{editing ? "Edit Recipe" : "New Recipe"}</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* MEAL TYPE */}
            <View style={s.formCard}>
              <Text style={s.formSectionLabel}>Meal Type</Text>
              <View style={s.mealTypeRow}>
                {MEAL_TYPES.map(cat => {
                  const meta   = CATEGORY_META[cat];
                  const active = mealType === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[s.mealTypeChip, active && { backgroundColor: meta.color, borderColor: meta.border }]}
                      onPress={() => setMealType(cat)}
                    >
                      <Text style={{ fontSize: 16 }}>{meta.emoji}</Text>
                      <Text style={[s.mealTypeChipText, active && { color: meta.text, fontWeight: "800" }]}>
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* DETAILS */}
            <View style={[s.formCard, { marginTop: 12 }]}>
              <Text style={s.formSectionLabel}>Details</Text>
              <FLabel label="Dish Name">
                <TextInput style={f.input} value={dishName} onChangeText={setDishName} placeholder="e.g. Grilled Salmon Bowl" placeholderTextColor="#bbb" />
              </FLabel>
              <FLabel label="Description (optional)">
                <TextInput style={[f.input, { height: 80, textAlignVertical: "top", paddingTop: 10 }]} value={description} onChangeText={setDescription} placeholder="A short description…" placeholderTextColor="#bbb" multiline />
              </FLabel>
            </View>

            {/* INGREDIENTS */}
            <View style={[s.formCard, { marginTop: 12 }]}>
              <Text style={s.formSectionLabel}>Ingredients</Text>
              {ingredients.map((ing, i) => (
                <View key={i} style={s.ingFormRow}>
                  <View style={s.ingFormNumBadge}>
                    <Text style={s.ingFormNum}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <TextInput style={f.input} value={ing.name} onChangeText={v => updateIng(i, "name", v)} placeholder="Ingredient name" placeholderTextColor="#bbb" />
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TextInput style={[f.input, { flex: 1 }]} value={String(ing.quantity)} onChangeText={v => updateIng(i, "quantity", v)} placeholder="Qty" placeholderTextColor="#bbb" keyboardType="numeric" />
                      <TextInput style={[f.input, { flex: 1.5 }]} value={ing.unit} onChangeText={v => updateIng(i, "unit", v)} placeholder="Unit (g, ml…)" placeholderTextColor="#bbb" />
                      {ingredients.length > 1 && (
                        <TouchableOpacity style={s.removeBtn} onPress={() => removeIngredient(i)}>
                          <Text style={s.removeBtnText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={s.addRowBtn} onPress={addIngredient}>
                <Text style={s.addRowBtnText}>＋ Add Ingredient</Text>
              </TouchableOpacity>
            </View>

            {/* COOKING STEPS */}
            <View style={[s.formCard, { marginTop: 12 }]}>
              <Text style={s.formSectionLabel}>Cooking Steps</Text>
              {steps.map((step, i) => (
                <View key={i} style={s.stepFormRow}>
                  <View style={s.stepNum}>
                    <Text style={s.stepNumText}>{i + 1}</Text>
                  </View>
                  <TextInput style={[f.input, { flex: 1, marginBottom: 0 }]} value={step} onChangeText={v => updateStep(i, v)} placeholder={`Step ${i + 1}…`} placeholderTextColor="#bbb" multiline />
                  {steps.length > 1 && (
                    <TouchableOpacity style={s.removeBtn} onPress={() => removeStep(i)}>
                      <Text style={s.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity style={s.addRowBtn} onPress={addStep}>
                <Text style={s.addRowBtnText}>＋ Add Step</Text>
              </TouchableOpacity>
            </View>

            {/* SAVE */}
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color={WHITE} />
                : <Text style={s.saveBtnText}>{editing ? "Save Changes" : "Create Recipe"}</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 60 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function FLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
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
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  backBtn:     { width: 36, height: 36, justifyContent: "center" },
  backBtnText: { fontSize: 28, color: BLACK, fontWeight: "300", lineHeight: 34 },
  pageTitle:   { fontSize: 24, fontWeight: "800", color: BLACK, letterSpacing: -0.5, fontFamily: "System" },
  addBtn:      { width: 40, height: 40, borderRadius: 12, backgroundColor: BLACK, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 8, elevation: 4 },
  addBtnText:  { fontSize: 22, color: WHITE, lineHeight: 28 },
  searchWrap:  { paddingHorizontal: 16, marginBottom: 10 },
  searchBox:   { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: GRAY200, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  searchIcon:  { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: BLACK, fontFamily: "System" },
  tabScroll:   { flexGrow: 0, marginBottom: 8 },
  tabContent:  { paddingHorizontal: 16, gap: 8 },
  tab:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.85)", borderWidth: 1, borderColor: GRAY200 },
  tabActive:   { backgroundColor: BLACK, borderColor: BLACK },
  tabText:     { fontSize: 13, fontWeight: "600", color: GRAY500 },
  tabTextActive: { color: WHITE, fontWeight: "800" },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  groupHeader:   { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, marginBottom: 8 },
  groupEmoji:    { fontSize: 18 },
  groupLabel:    { fontSize: 13, fontWeight: "800", color: BLACK, textTransform: "uppercase", letterSpacing: 0.8, flex: 1 },
  groupCount:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  groupCountText:{ fontSize: 11, fontWeight: "700" },
  card:          { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  mealPill:      { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, marginBottom: 8 },
  mealPillText:  { fontSize: 11, fontWeight: "700" },
  cardTitle:     { fontSize: 18, fontWeight: "800", color: BLACK, fontFamily: "Lato-Regular", marginBottom: 4 },
  cardDesc:      { fontSize: 13, color: GRAY500, lineHeight: 18, marginBottom: 10 },
  cardIngredients:  { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  ingChip:       { backgroundColor: GRAY100, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: GRAY200 },
  ingChipText:   { fontSize: 11, color: GRAY500, fontWeight: "600" },
  cardActions:   { flexDirection: "row", alignItems: "center", gap: 8 },
  cardActionBtn: { backgroundColor: GRAY100, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: GRAY200 },
  cardDeleteBtn: { borderColor: "rgba(239,68,68,0.2)", backgroundColor: "rgba(239,68,68,0.06)" },
  cardActionBtnText: { fontSize: 12, fontWeight: "700", color: BLACK },
  viewBtn:       { flex: 1, alignItems: "flex-end" },
  viewBtnText:   { fontSize: 13, fontWeight: "700", color: BLACK },
  emptyWrap:     { paddingTop: 80, alignItems: "center", gap: 8 },
  emptyEmoji:    { fontSize: 48, marginBottom: 4 },
  emptyTitle:    { fontSize: 18, fontWeight: "700", color: BLACK },
  emptySub:      { fontSize: 14, color: GRAY500, textAlign: "center" },
  modalHeader:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: GRAY200 },
  modalTitle:       { fontSize: 17, fontWeight: "700", color: BLACK, flex: 1, textAlign: "center" },
  editHeaderBtn:    { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: GRAY100, borderRadius: 8, borderWidth: 1, borderColor: GRAY200 },
  editHeaderBtnText:{ fontSize: 13, fontWeight: "700", color: BLACK },
  detailCatBadge:    { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginBottom: 16 },
  detailCatBadgeText:{ fontSize: 13, fontWeight: "800" },
  detailSection:     { marginBottom: 20 },
  detailSectionLabel:{ fontSize: 11, fontWeight: "700", color: GRAY500, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  detailDesc:        { fontSize: 15, color: BLACK, lineHeight: 22 },
  detailCard:        { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  ingRow:            { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  ingRowBorder:      { borderBottomWidth: 1, borderBottomColor: GRAY200 },
  ingDot:            { width: 7, height: 7, borderRadius: 4, backgroundColor: BLACK },
  ingName:           { flex: 1, fontSize: 14, fontWeight: "600", color: BLACK },
  ingQty:            { fontSize: 13, color: GRAY500, fontWeight: "700" },
  stepRow:           { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  stepNum:           { width: 28, height: 28, borderRadius: 14, backgroundColor: BLACK, alignItems: "center", justifyContent: "center", marginTop: 2 },
  stepNumText:       { color: WHITE, fontWeight: "800", fontSize: 13 },
  stepText:          { flex: 1, fontSize: 14, color: BLACK, lineHeight: 20, paddingTop: 4, fontFamily: "System" },
  deleteFullBtn:     { marginTop: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: "rgba(239,68,68,0.2)", backgroundColor: "rgba(239,68,68,0.06)", alignItems: "center" },
  deleteFullBtnText: { color: "#ef4444", fontWeight: "700", fontSize: 14 },
  formCard:         { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 18, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  formSectionLabel: { fontSize: 11, fontWeight: "700", color: GRAY500, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 14 },
  mealTypeRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mealTypeChip:     { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: GRAY100, borderWidth: 1, borderColor: GRAY200 },
  mealTypeChipText: { fontSize: 13, fontWeight: "600", color: GRAY500 },
  ingFormRow:       { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  ingFormNumBadge:  { width: 26, height: 26, borderRadius: 13, backgroundColor: BLACK, alignItems: "center", justifyContent: "center", marginTop: 10 },
  ingFormNum:       { color: WHITE, fontWeight: "800", fontSize: 12 },
  removeBtn:        { width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(239,68,68,0.08)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(239,68,68,0.15)", alignSelf: "center" },
  removeBtnText:    { color: "#ef4444", fontWeight: "700", fontSize: 13 },
  addRowBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: GRAY300, borderStyle: "dashed", marginTop: 4 },
  addRowBtnText:    { fontSize: 14, fontWeight: "700", color: GRAY500 },
  stepFormRow:      { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  saveBtn:          { backgroundColor: BLACK, paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 16, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 8, elevation: 4 },
  saveBtnText:      { color: WHITE, fontWeight: "800", fontSize: 16, fontFamily: "System" },
});

const f = StyleSheet.create({
  label: { fontSize: 11, fontWeight: "700", color: GRAY500, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: GRAY100, color: BLACK, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: "Lato-Regular", borderWidth: 1, borderColor: GRAY200, marginBottom: 0 },
});
