import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { IndoorNode } from "./types";

interface IndoorSuggestionsListProps {
  suggestions: IndoorNode[];
  onPick: (node: IndoorNode) => void;
}

export default function IndoorSuggestionsList({
  suggestions,
  onPick,
}: Readonly<IndoorSuggestionsListProps>) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} testID="indoor-route-suggestions">
      <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
        {suggestions.map((node) => (
          <Pressable
            key={node.id}
            style={styles.item}
            onPress={() => onPick(node)}
            testID={`indoorSuggestion-${node.id}`}
          >
            <Text style={styles.title}>{node.label ?? node.id}</Text>
            <Text style={styles.subtitle}>
              Floor {node.floor} • {node.buildingId}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
    maxHeight: 220,
    overflow: "hidden",
  },
  scroll: {
    maxHeight: 220,
  },
  item: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },
});
