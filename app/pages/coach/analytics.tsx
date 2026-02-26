import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { BarChart } from "react-native-chart-kit";
import { useAnalyticsStore } from "../../../store/useAnalyticsStore";

type ViewType = "weekly" | "monthly" | "yearly";

export default function CoachAnalytics() {
  const { fetchCoachAnalytics, week, month, year, loading } = useAnalyticsStore();
  const [activeView, setActiveView] = useState<ViewType>("weekly");

  useEffect(() => {
    fetchCoachAnalytics();
  }, [fetchCoachAnalytics]);

  if (loading)
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={styles.tokens.accent} />
      </View>
    );

  const getChartData = () => {
    switch (activeView) {
      case "weekly":
        return {
          labels: ["Plans"],
          datasets: [
            { data: [week?.plans?.monthly || 0], label: "Monthly Plans", color: () => styles.tokens.primary },
            { data: [week?.plans?.yearly || 0], label: "Yearly Plans", color: () => styles.tokens.accent },
          ],
        };
      case "monthly":
        return {
          labels: ["Plans"],
          datasets: [
            { data: [month?.plans?.monthly || 0], label: "Monthly Plans", color: () => styles.tokens.primary },
            { data: [month?.plans?.yearly || 0], label: "Yearly Plans", color: () => styles.tokens.accent },
          ],
        };
      case "yearly":
        return {
          labels: ["Plans"],
          datasets: [
            { data: [year?.plans?.monthly || 0], label: "Monthly Plans", color: () => styles.tokens.primary },
            { data: [year?.plans?.yearly || 0], label: "Yearly Plans", color: () => styles.tokens.accent },
          ],
        };
      default:
        return { labels: [], datasets: [] };
    }
  };

  const screenWidth = Dimensions.get("window").width;
  const chartData = getChartData();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Growth & Analytics</Text>
      <Text style={styles.subtitle}>Trends & key metrics for your coaching business</Text>

      {/* Stat cards */}
      <View style={styles.cardsRow}>
        <StatCard title="Clients (7 days)" value={week?.totalClientsAdded} />
        <StatCard title="Clients (30 days)" value={month?.totalClientsAdded} />
        <StatCard title="Clients (1 year)" value={year?.totalClientsAdded} />
      </View>

      <View style={styles.cardsRow}>
        <StatCard title="Paid Clients (Week)" value={week?.paidClients} />
        <StatCard title="Paid Clients (Month)" value={month?.paidClients} />
        <StatCard title="Paid Clients (Year)" value={year?.paidClients} />
      </View>

      {/* View selector */}
      <View style={styles.viewButtonsContainer}>
        {(["weekly", "monthly", "yearly"] as ViewType[]).map((view) => (
          <TouchableOpacity
            key={view}
            style={[styles.viewButton, activeView === view && styles.viewButtonActive]}
            onPress={() => setActiveView(view)}
            activeOpacity={0.85}
          >
            <Text style={[styles.viewButtonText, activeView === view && styles.viewButtonTextActive]}>
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart */}
      <View style={styles.chartCard}>
        <BarChart
          data={{
            labels: chartData.labels,
            datasets: chartData.datasets.map((d) => ({ data: d.data })),
          }}
          width={Math.max(300, screenWidth - 40)}
          height={320}
          fromZero
          showValuesOnTopOfBars
          withHorizontalLabels={false}
          chartConfig={{
            backgroundGradientFrom: styles.tokens.surface,
            backgroundGradientTo: styles.tokens.surfaceAlt,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
            barRadius: 8,
            propsForBackgroundLines: {
              strokeDasharray: "",
              stroke: "#0b0b0b",
            },
          }}
          style={styles.chartStyle}
        />
      </View>
    </ScrollView>
  );
}

function StatCard({ title, value }: { title: string; value?: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value ?? 0}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tokens: {
    bg: "#000000",
    surface: "#0b0b0b",
    surfaceAlt: "#111111",
    border: "#151515",
    muted: "#9a9a9a",
    text: "#ffffff",
    accent: "#4ade80",
    primary: "#7c3aed",
  },

  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 40,
  },

  title: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    color: "#9a9a9a",
    marginBottom: 16,
  },

  cardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    marginRight: 12,
    backgroundColor: "#0f0f0f",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#151515",
    alignItems: "flex-start",
  },
  // ensure last card in row doesn't have extra right margin
  statCardLast: {
    marginRight: 0,
  },
  statTitle: {
    fontSize: 12,
    color: "#bfbfbf",
    marginBottom: 8,
    fontWeight: "700",
  },
  statValue: {
    fontSize: 28,
    color: "#ffffff",
    fontWeight: "900",
  },

  viewButtonsContainer: {
    flexDirection: "row",
    marginBottom: 18,
  },
  viewButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#0f0f0f",
    borderWidth: 1,
    borderColor: "#151515",
    marginRight: 10,
  },
  viewButtonActive: {
    backgroundColor: "#1b1b1b",
    borderColor: "#2b2b2b",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  viewButtonText: {
    fontWeight: "700",
    color: "#bfbfbf",
  },
  viewButtonTextActive: {
    color: "#ffffff",
  },

  chartCard: {
    marginTop: 6,
    backgroundColor: "#0b0b0b",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#151515",
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 4,
  },
  chartStyle: {
    borderRadius: 12,
  },
});