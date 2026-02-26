import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useRecipeStore, Recipe, Ingredient } from "../../../store/useRecipeStore";

/* ─── meal category config ───────────────────────────────────── */
type MealType = "breakfast" | "lunch" | "dinner" | "snacks";

const CATEGORIES: { key: MealType; label: string; emoji: string; color: string; img: string }[] = [
  {
    key:   "breakfast",
    label: "Breakfast",
    emoji: "🍳",
    color: "#fef3c7",
    img:   "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&q=80",
  },
  {
    key:   "lunch",
    label: "Lunch",
    emoji: "🥗",
    color: "#d1fae5",
    img:   "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80",
  },
  {
    key:   "dinner",
    label: "Dinner",
    emoji: "🍽️",
    color: "#ede9fe",
    img:   "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=400&q=80",
  },
  {
    key:   "snacks",
    label: "Snacks",
    emoji: "🍎",
    color: "#fce7f3",
    img:   "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80",
  },
];

const RECIPE_CARD_IMAGES: Record<string, string[]> = {
  breakfast: [
    "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=300&q=80",
    "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=300&q=80",
    "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=300&q=80",
  ],
  lunch: [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&q=80",
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&q=80",
  ],
  dinner: [
    "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=300&q=80",
    "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=300&q=80",
    "https://images.unsplash.com/photo-1574484284002-952d92456975?w=300&q=80",
  ],
  snacks: [
    "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=300&q=80",
    "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=300&q=80",
    "https://images.unsplash.com/photo-1548940740-204726a19be3?w=300&q=80",
  ],
};

function generateCookingSteps(recipe: Recipe & { mealType?: string }): string[] {
  const steps: string[] = [];
  const ing = recipe.ingredients || [];
  const prepItems = ing.slice(0, Math.min(3, ing.length))
    .map(i => `${i.quantity} ${i.unit} ${i.name}`).join(", ");
  if (prepItems) steps.push(`Gather and prepare all ingredients: ${prepItems}.`);
  const mealType = (recipe as any).mealType || "";
  if (mealType === "breakfast") {
    steps.push("Preheat your pan or griddle over medium heat and lightly grease with oil or butter.");
    if (ing.some(i => i.name.toLowerCase().includes("egg")))
      steps.push("Crack eggs into a bowl, whisk until smooth, and season with salt and pepper.");
    steps.push("Cook on medium heat for 3-4 minutes, stirring gently for scrambled or leaving undisturbed for fried.");
  } else if (mealType === "lunch") {
    steps.push("Wash and chop all vegetables into bite-sized pieces.");
    steps.push("Combine ingredients in a large bowl. If cooking, heat a skillet over medium-high heat with 1 tbsp oil.");
    steps.push("Sauté or toss ingredients together for 5-7 minutes until cooked through or well combined.");
  } else if (mealType === "dinner") {
    steps.push("Preheat oven to 180°C (350°F) or prepare your stovetop on medium heat.");
    steps.push("Season the main protein with salt, pepper, and any desired spices. Sear in a hot pan for 2-3 minutes per side.");
    steps.push("Add remaining ingredients, reduce heat, and simmer or roast for 20-25 minutes until fully cooked.");
  } else {
    steps.push("Wash and prepare all fresh ingredients thoroughly.");
    steps.push("Combine or arrange ingredients as desired. No cooking required for raw snacks.");
  }
  if (ing.length > 3) {
    const remaining = ing.slice(3).map(i => `${i.quantity} ${i.unit} ${i.name}`).join(", ");
    steps.push(`Add remaining ingredients: ${remaining}. Mix or fold gently to combine.`);
  }
  if (recipe.description && recipe.description.trim().length > 0) {
    steps.push(recipe.description.trim());
  } else {
    steps.push("Taste and adjust seasoning. Serve immediately while fresh and enjoy!");
  }
  return steps;
}

/* ════════════════════════════════════════════════════════════
   MAIN SCREEN
════════════════════════════════════════════════════════════ */
export default function RecipesScreen() {
  const router = useRouter();
  const fetchAllRecipes = useRecipeStore(s => s.fetchAllRecipes);
  const rawRecipes      = useRecipeStore(s => s.recipes);
  const loading         = useRecipeStore(s => s.loading);

  const grouped = rawRecipes as unknown as Record<MealType, (Recipe & { mealType: MealType })[]>;

  const [activeCategory, setActiveCategory] = useState<MealType>("breakfast");
  const [selectedRecipe, setSelectedRecipe] = useState<(Recipe & { mealType: MealType }) | null>(null);

  /* ── Reactive dimensions ── */
  const { width } = useWindowDimensions();
  const isWide  = width >= 640;
  const maxW    = Math.min(width, 720);
  /* Overview grid: 2 cols on mobile, 4 cols on wide */
  const tileW   = isWide
    ? (Math.min(width, 720) - 32 - 30) / 4
    : (width - 32 - 10) / 2;

  useEffect(() => { fetchAllRecipes(); }, []);

  const currentRecipes: (Recipe & { mealType: MealType })[] = Array.isArray(grouped[activeCategory])
    ? grouped[activeCategory] : [];

  const activeCat = CATEGORIES.find(c => c.key === activeCategory)!;

  const totalCount = CATEGORIES.reduce((sum, cat) => {
    const arr = Array.isArray(grouped[cat.key]) ? grouped[cat.key] : [];
    return sum + arr.length;
  }, 0);

  if (selectedRecipe) {
    return (
      <RecipeDetailView
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
      />
    );
  }

  return (
    <LinearGradient
      colors={["#b2afb1","#f7f7f7","#ffffff","#f7f7f7","#b2afb1"]}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
      style={s.container}
    >
      {/* ── TOP BAR ── */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.pageTitle}>Recipes</Text>
        <View style={s.countBadge}>
          <Text style={s.countBadgeText}>{totalCount}</Text>
        </View>
      </View>

      {/* ── HERO BANNER ── */}
      <View style={[s.heroBanner, { marginHorizontal: isWide ? 0 : 16 }]}>
        <Image source={{ uri: activeCat.img }} style={s.heroImg} blurRadius={2} />
        <LinearGradient
          colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.55)"]}
          style={s.heroOverlay}
        >
          <Text style={s.heroEmoji}>{activeCat.emoji}</Text>
          <Text style={s.heroLabel}>{activeCat.label}</Text>
          <Text style={s.heroCount}>
            {currentRecipes.length} recipe{currentRecipes.length !== 1 ? "s" : ""}
          </Text>
        </LinearGradient>
      </View>

      {/* ── CATEGORY TABS ── */}
      <View style={s.catTabsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.catTabs}
        >
          {CATEGORIES.map(cat => {
            const count = Array.isArray(grouped[cat.key]) ? grouped[cat.key].length : 0;
            const isActive = activeCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[s.catTab, isActive && s.catTabActive]}
                onPress={() => setActiveCategory(cat.key)}
                activeOpacity={0.8}
              >
                <Text style={s.catTabEmoji}>{cat.emoji}</Text>
                <Text style={[s.catTabLabel, isActive && s.catTabLabelActive]}>
                  {cat.label}
                </Text>
                <View style={[s.catTabCount, isActive && s.catTabCountActive]}>
                  <Text style={[s.catTabCountText, isActive && s.catTabCountTextActive]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── CONTENT ── */}
      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#ec4899" />
          <Text style={s.loadingText}>Loading recipes…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.scrollContent, { alignItems: isWide ? "center" : undefined }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Constrained inner wrapper */}
          <View style={{ width: "100%", maxWidth: maxW }}>

            {/* Category overview tiles */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>All Categories</Text>
            </View>
            <View style={s.overviewGrid}>
              {CATEGORIES.map(cat => {
                const count = Array.isArray(grouped[cat.key]) ? grouped[cat.key].length : 0;
                const isActive = activeCategory === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      s.overviewTile,
                      isActive && s.overviewTileActive,
                      { backgroundColor: cat.color, width: tileW },
                    ]}
                    onPress={() => setActiveCategory(cat.key)}
                    activeOpacity={0.85}
                  >
                    <Text style={s.overviewTileEmoji}>{cat.emoji}</Text>
                    <Text style={s.overviewTileLabel}>{cat.label}</Text>
                    <Text style={s.overviewTileCount}>{count} recipes</Text>
                    {isActive && <View style={s.overviewTileActiveDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Recipes for active category */}
            <View style={[s.sectionHeader, { marginTop: 24 }]}>
              <Text style={s.sectionTitle}>
                {activeCat.emoji} {activeCat.label}
              </Text>
              <Text style={s.sectionSub}>{currentRecipes.length} recipes</Text>
            </View>

            {currentRecipes.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={s.emptyEmoji}>{activeCat.emoji}</Text>
                <Text style={s.emptyTitle}>No {activeCat.label.toLowerCase()} recipes yet</Text>
                <Text style={s.emptySub}>Your coach hasn't added any yet. Check back soon!</Text>
              </View>
            ) : (
              currentRecipes.map((recipe, idx) => (
                <RecipeCard
                  key={recipe._id}
                  recipe={recipe}
                  index={idx}
                  category={activeCat}
                  onPress={() => setSelectedRecipe(recipe)}
                />
              ))
            )}

            <View style={{ height: 80 }} />
          </View>
        </ScrollView>
      )}
    </LinearGradient>
  );
}

/* ════════════════════════════════════════════════════════════
   RECIPE CARD
════════════════════════════════════════════════════════════ */
function RecipeCard({
  recipe, index, category, onPress,
}: {
  recipe: Recipe & { mealType: MealType };
  index: number;
  category: typeof CATEGORIES[number];
  onPress: () => void;
}) {
  const images = RECIPE_CARD_IMAGES[recipe.mealType] || RECIPE_CARD_IMAGES.breakfast;
  const imgUri = images[index % images.length];

  return (
    <TouchableOpacity style={s.recipeCard} onPress={onPress} activeOpacity={0.88}>
      <Image source={{ uri: imgUri }} style={s.recipeCardImg} />
      <View style={s.recipeCardBody}>
        <View style={[s.recipeCardBadge, { backgroundColor: category.color }]}>
          <Text style={s.recipeCardBadgeText}>
            {category.emoji} {category.label}
          </Text>
        </View>
        <Text style={s.recipeCardTitle} numberOfLines={2}>{recipe.dishName}</Text>
        {recipe.description ? (
          <Text style={s.recipeCardDesc} numberOfLines={2}>{recipe.description}</Text>
        ) : null}
        <View style={s.recipeCardMeta}>
          <Text style={s.recipeCardIngCount}>
            🧂 {recipe.ingredients?.length || 0} ingredients
          </Text>
          {recipe.coach?.name ? (
            <Text style={s.recipeCardCoach}>by {recipe.coach.name}</Text>
          ) : null}
        </View>
      </View>
      <View style={s.recipeCardArrow}>
        <Text style={s.recipeCardArrowText}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

/* ════════════════════════════════════════════════════════════
   RECIPE DETAIL VIEW
════════════════════════════════════════════════════════════ */
function RecipeDetailView({
  recipe,
  onClose,
}: {
  recipe: Recipe & { mealType?: MealType };
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"ingredients" | "steps">("ingredients");

  /* Reactive dimensions inside detail view */
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const maxW   = Math.min(width, 720);
  const heroH  = isWide ? 320 : 260;

  const cat  = CATEGORIES.find(c => c.key === recipe.mealType) || CATEGORIES[0];
  const imgs = RECIPE_CARD_IMAGES[recipe.mealType || "breakfast"];
  const heroImg = imgs[Math.floor(Math.random() * imgs.length)];
  const steps = generateCookingSteps(recipe as any);

  return (
    <LinearGradient
      colors={["#f9a8d4","#fce7f3","#ffffff","#fce7f3","#f9a8d4"]}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
      style={s.container}
    >
      {/* Hero image */}
      <View style={[d.heroWrap, { height: heroH }]}>
        <Image source={{ uri: heroImg }} style={d.heroImg} />
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.65)"]}
          style={d.heroGrad}
        />
        <TouchableOpacity style={d.backBtn} onPress={onClose}>
          <Text style={d.backBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={[d.heroCatBadge, { backgroundColor: cat.color + "ee" }]}>
          <Text style={d.heroCatText}>{cat.emoji} {cat.label}</Text>
        </View>
        <View style={d.heroTitleWrap}>
          <Text style={d.heroTitle}>{recipe.dishName}</Text>
          {recipe.coach?.name ? (
            <Text style={d.heroCoach}>by {recipe.coach.name}</Text>
          ) : null}
        </View>
      </View>

      {/* Content sheet */}
      <View style={[d.sheet, isWide && { alignItems: "center" }]}>
        <View style={{ width: "100%", maxWidth: maxW }}>

          {/* Quick stats */}
          <View style={d.statsRow}>
            <View style={d.statItem}>
              <Text style={d.statValue}>{recipe.ingredients?.length || 0}</Text>
              <Text style={d.statLabel}>Ingredients</Text>
            </View>
            <View style={d.statDivider} />
            <View style={d.statItem}>
              <Text style={d.statValue}>{steps.length}</Text>
              <Text style={d.statLabel}>Steps</Text>
            </View>
            <View style={d.statDivider} />
            <View style={d.statItem}>
              <Text style={d.statValue}>
                {recipe.mealType === "breakfast" ? "15" :
                 recipe.mealType === "snacks"    ? "5"  :
                 recipe.mealType === "lunch"     ? "20" : "35"}
              </Text>
              <Text style={d.statLabel}>Min</Text>
            </View>
          </View>

          {/* Description */}
          {recipe.description ? (
            <Text style={d.description}>{recipe.description}</Text>
          ) : null}

          {/* Tabs */}
          <View style={d.tabRow}>
            {(["ingredients", "steps"] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[d.tabBtn, activeTab === tab && d.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
              >
                <Text style={[d.tabText, activeTab === tab && d.tabTextActive]}>
                  {tab === "ingredients" ? "🧂 Ingredients" : "👨‍🍳 How to Cook"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
            {activeTab === "ingredients" ? (
              <View style={d.ingredientsList}>
                {(recipe.ingredients || []).length === 0 ? (
                  <Text style={d.emptyText}>No ingredients listed.</Text>
                ) : (
                  recipe.ingredients.map((ing, i) => (
                    <View key={i} style={d.ingredientRow}>
                      <View style={d.ingredientBullet}>
                        <Text style={d.ingredientBulletText}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={d.ingredientName}>{ing.name}</Text>
                        <Text style={d.ingredientQty}>{ing.quantity} {ing.unit}</Text>
                      </View>
                      <View style={d.amountBarWrap}>
                        <View style={[d.amountBar, {
                          width: Math.min(Math.max(ing.quantity * 6, 16), 60),
                          backgroundColor: cat.color,
                        }]} />
                      </View>
                    </View>
                  ))
                )}
              </View>
            ) : (
              <View style={d.stepsList}>
                {steps.map((step, i) => (
                  <View key={i} style={d.stepRow}>
                    <View style={d.stepNumWrap}>
                      <Text style={d.stepNum}>{i + 1}</Text>
                    </View>
                    {i < steps.length - 1 && <View style={d.stepConnector} />}
                    <View style={d.stepContent}>
                      <Text style={d.stepTitle}>
                        {i === 0 ? "Prepare" : i === steps.length - 1 ? "Serve" : `Step ${i + 1}`}
                      </Text>
                      <Text style={d.stepText}>{step}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
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
const PINK    = "#b2afb1";

/* ─── main screen styles ─────────────────────────────────────── */
const s = StyleSheet.create({
  container: { flex: 1 },

  topBar: {
    flexDirection: "row", alignItems: "center",
    paddingTop: 54, paddingBottom: 10, paddingHorizontal: 16,
  },
  backBtn:     { width: 36, height: 36, justifyContent: "center" },
  backBtnText: { fontSize: 28, color: BLACK, fontWeight: "300", lineHeight: 34 },
  pageTitle:   { flex: 1, textAlign: "center", fontSize: 24, fontWeight: "800", color: BLACK, fontFamily: "System", letterSpacing: -0.4 },
  countBadge:  { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.9)", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  countBadgeText: { fontSize: 13, fontWeight: "800", color: BLACK },

  heroBanner: {
    /* marginHorizontal set inline */
    borderRadius: 20, overflow: "hidden",
    height: 140, marginBottom: 16,
    shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 14, elevation: 4,
  },
  heroImg:     { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%", resizeMode: "cover" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", padding: 16 },
  heroEmoji:   { fontSize: 28, marginBottom: 2 },
  heroLabel:   { fontSize: 22, fontWeight: "800", color: WHITE, fontFamily: "System" },
  heroCount:   { fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: "System" },

  catTabsWrap: { marginBottom: 4 },
  catTabs: { paddingHorizontal: 16, gap: 8 },
  catTab: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 9, paddingHorizontal: 14, borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.7)",
  },
  catTabActive: {
    backgroundColor: WHITE,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
    borderColor: "transparent",
  },
  catTabEmoji: { fontSize: 15 },
  catTabLabel: { fontSize: 13, fontWeight: "600", color: GRAY500, fontFamily: "System" },
  catTabLabelActive: { color: BLACK, fontWeight: "800" },
  catTabCount: { backgroundColor: GRAY100, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  catTabCountActive:    { backgroundColor: "#111" },
  catTabCountText:      { fontSize: 11, color: GRAY500, fontWeight: "700" },
  catTabCountTextActive:{ color: WHITE },

  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },
  loadingWrap:   { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText:   { fontSize: 14, color: GRAY500, fontFamily: "System" },

  sectionHeader:{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 19, fontWeight: "800", color: BLACK, fontFamily: "System" },
  sectionSub:   { fontSize: 13, color: GRAY500, fontFamily: "System" },

  /* overview grid — tiles sized inline via tileW */
  overviewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  overviewTile: {
    /* width set inline */
    borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    position: "relative",
  },
  overviewTileActive: {
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
    borderWidth: 2, borderColor: "rgba(0,0,0,0.1)",
  },
  overviewTileEmoji:     { fontSize: 28, marginBottom: 6 },
  overviewTileLabel:     { fontSize: 15, fontWeight: "800", color: BLACK, fontFamily: "System", marginBottom: 2 },
  overviewTileCount:     { fontSize: 12, color: GRAY500, fontFamily: "System" },
  overviewTileActiveDot: { position: "absolute", top: 12, right: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: BLACK },

  recipeCard: {
    backgroundColor: "rgba(255,255,255,0.93)",
    borderRadius: 18, marginBottom: 12,
    flexDirection: "row", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, elevation: 2,
    overflow: "hidden",
  },
  recipeCardImg:  { width: 96, height: 96, resizeMode: "cover" },
  recipeCardBody: { flex: 1, padding: 12 },
  recipeCardBadge:{ alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 5 },
  recipeCardBadgeText: { fontSize: 11, fontWeight: "700", color: BLACK },
  recipeCardTitle:     { fontSize: 15, fontWeight: "800", color: BLACK, fontFamily: "System", marginBottom: 3, lineHeight: 20 },
  recipeCardDesc:      { fontSize: 12, color: GRAY500, fontFamily: "System", lineHeight: 17, marginBottom: 6 },
  recipeCardMeta:      { flexDirection: "row", alignItems: "center", gap: 10 },
  recipeCardIngCount:  { fontSize: 11, color: GRAY500 },
  recipeCardCoach:     { fontSize: 11, color: GRAY500, flex: 1, textAlign: "right" },
  recipeCardArrow:     { paddingRight: 12 },
  recipeCardArrowText: { fontSize: 22, color: GRAY300, fontWeight: "300" },

  emptyCard: { backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 20, padding: 36, alignItems: "center", gap: 8, marginTop: 8 },
  emptyEmoji: { fontSize: 48, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: BLACK, fontFamily: "System" },
  emptySub:   { fontSize: 13, color: GRAY500, textAlign: "center", fontFamily: "System" },
});

/* ─── detail view styles ─────────────────────────────────────── */
const d = StyleSheet.create({
  /* heroWrap height set inline */
  heroWrap: { position: "relative" },
  heroImg:  { width: "100%", height: "100%", resizeMode: "cover" },
  heroGrad: { ...StyleSheet.absoluteFillObject },

  backBtn: {
    position: "absolute", top: 52, left: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  backBtnText: { fontSize: 26, color: BLACK, fontWeight: "300", lineHeight: 30, marginTop: -2 },

  heroCatBadge: { position: "absolute", top: 56, right: 16, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  heroCatText:  { fontSize: 12, fontWeight: "700", color: BLACK },

  heroTitleWrap: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 24 },
  heroTitle:  { fontSize: 26, fontWeight: "800", color: WHITE, fontFamily: "System", letterSpacing: -0.5, lineHeight: 30 },
  heroCoach:  { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 },

  sheet: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.0)",
    paddingHorizontal: 16,
    paddingTop: 0,
    marginTop: -20,
  },

  statsRow: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 18, padding: 16, marginBottom: 14,
    flexDirection: "row", justifyContent: "space-around", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  statItem:   { alignItems: "center" },
  statValue:  { fontSize: 22, fontWeight: "800", color: BLACK, fontFamily: "System" },
  statLabel:  { fontSize: 11, color: WHITE, marginTop: 2, fontFamily: "System" },
  statDivider:{ width: 1, height: 32, backgroundColor: WHITE },

  description: {
    fontSize: 14, color: WHITE, lineHeight: 21,
    fontFamily: "System", marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 14, padding: 14,
  },

  tabRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  tabBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.7)",
  },
  tabBtnActive: {
    backgroundColor: WHITE,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
    borderColor: "transparent",
  },
  tabText:       { fontSize: 14, fontWeight: "600", color: GRAY500, fontFamily: "System" },
  tabTextActive: { color: BLACK, fontWeight: "800" },

  ingredientsList: { gap: 8 },
  ingredientRow: {
    backgroundColor: "rgba(255,255,255,0.93)",
    borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  ingredientBullet: { width: 32, height: 32, borderRadius: 16, backgroundColor: BLACK, justifyContent: "center", alignItems: "center" },
  ingredientBulletText: { color: WHITE, fontWeight: "800", fontSize: 13 },
  ingredientName:       { fontSize: 14, fontWeight: "700", color: BLACK, fontFamily: "System", marginBottom: 2 },
  ingredientQty:        { fontSize: 12, color: GRAY500, fontFamily: "System" },
  amountBarWrap: { width: 64, height: 6, backgroundColor: GRAY200, borderRadius: 3, overflow: "hidden" },
  amountBar:     { height: 6, borderRadius: 3 },

  stepsList: { gap: 0, paddingTop: 4 },
  stepRow:   { flexDirection: "row", gap: 14, marginBottom: 0, position: "relative" },
  stepNumWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: BLACK,
    justifyContent: "center", alignItems: "center",
    zIndex: 2, flexShrink: 0,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4, elevation: 2,
  },
  stepNum: { color: WHITE, fontWeight: "800", fontSize: 14 },
  stepConnector: { position: "absolute", left: 17, top: 36, width: 2, height: 32, backgroundColor: GRAY200, zIndex: 1 },
  stepContent: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.93)",
    borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  stepTitle: { fontSize: 11, fontWeight: "800", color: GRAY500, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 5 },
  stepText:  { fontSize: 14, color: BLACK, fontFamily: "System", lineHeight: 20 },
  emptyText: { fontSize: 14, color: GRAY500, textAlign: "center", paddingVertical: 24 },
});