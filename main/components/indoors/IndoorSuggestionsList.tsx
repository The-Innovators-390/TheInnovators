import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { IndoorNode } from "./types";

type SuggestionItem =
  | IndoorNode
  | {
      type: "outdoor_building";
      label: string;
      building: { id?: string; code?: string };
    }
  | {
      type: "external_room";
      label: string;
      building: { id?: string; code?: string };
      roomNode: IndoorNode;
    };

function suggestionKey(item: SuggestionItem, index: number): string {
  if ("roomNode" in item) {
    const b = item.building;
    return `external-${item.roomNode.id}-${b?.id ?? b?.code ?? index}`;
  }
  if ("building" in item) {
    const b = item.building;
    return `outdoor-${b?.id ?? b?.code ?? index}`;
  }
  return `${item.id}-${index}`;
}

function suggestionTestId(item: SuggestionItem, index: number): string {
  if ("building" in item) {
    return suggestionKey(item, index);
  }
  return item.id;
}

interface IndoorSuggestionsListProps {
  suggestions: SuggestionItem[];
  onPick: (node: SuggestionItem) => void;
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
        {suggestions.map((node, index) => (
          <Pressable
            key={suggestionKey(node, index)}
            style={styles.item}
            onPress={() => onPick(node)}
            testID={`indoorSuggestion-${suggestionTestId(node, index)}`}
          >
            <Text style={styles.title}>
              {(node as IndoorNode).label ?? (node as IndoorNode).id}
            </Text>
            <Text style={styles.subtitle}>
              Floor {(node as IndoorNode).floor} • {(node as IndoorNode).buildingId}
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
