import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import IndoorScreen from "../IndoorScreen";

const mockFindShortestIndoorPath = jest.fn();
const mockIndoorMapViewer = jest.fn();

jest.mock("react-native-safe-area-context", () => {
  const { View } = jest.requireActual("react-native");

  const MockSafeAreaView = ({
    children,
  }: {
    children: React.ReactNode;
  }): React.JSX.Element => <View>{children}</View>;

  MockSafeAreaView.displayName = "MockSafeAreaView";

  return {
    SafeAreaView: MockSafeAreaView,
  };
});

jest.mock("../../ui/HeaderBackButton", () => {
  const { Text } = jest.requireActual("react-native");

  const MockHeaderBackButton = ({
    color,
  }: {
    color: string;
  }): React.JSX.Element => <Text>{`BackButton-${color}`}</Text>;

  MockHeaderBackButton.displayName = "MockHeaderBackButton";

  return {
    HeaderBackButton: MockHeaderBackButton,
  };
});

jest.mock("../pathfinding", () => ({
  findShortestIndoorPath: (...args: unknown[]) =>
    mockFindShortestIndoorPath(...args),
  findShortestIndoorPathWithSteps: (...args: unknown[]) => {
    const base = mockFindShortestIndoorPath(...args);
    if (!base) return null;
    return { ...base, steps: [] };
  },
}));

jest.mock("../IndoorMapViewer", () => {
  const { View, Text } = jest.requireActual("react-native");

  const MockIndoorMapViewer = (props: unknown): React.JSX.Element => {
    mockIndoorMapViewer(props);
    return (
      <View>
        <Text>IndoorMapViewerMock</Text>
      </View>
    );
  };

  MockIndoorMapViewer.displayName = "MockIndoorMapViewer";

  return MockIndoorMapViewer;
});

jest.mock("../IndoorRouteInput", () => {
  const React = jest.requireActual("react");
  const { View, Text, TextInput, Pressable } =
    jest.requireActual("react-native");

  const MockIndoorRouteInput = (props: any): React.JSX.Element => (
    <View>
      <Text testID="active-field">{props.activeField}</Text>

      <TextInput
        testID="start-input"
        value={props.startText}
        onChangeText={props.onChangeStartText}
      />

      <TextInput
        testID="dest-input"
        value={props.destText}
        onChangeText={props.onChangeDestText}
      />

      <Pressable
        testID="focus-start"
        onPress={() => props.onFocusField("start")}
      >
        <Text>Focus Start</Text>
      </Pressable>

      <Pressable
        testID="focus-destination"
        onPress={() => props.onFocusField("destination")}
      >
        <Text>Focus Destination</Text>
      </Pressable>

      <Pressable testID="swap-button" onPress={props.onSwap}>
        <Text>Swap</Text>
      </Pressable>

      <Pressable testID="clear-start" onPress={props.onClearStart}>
        <Text>Clear Start</Text>
      </Pressable>

      <Pressable testID="clear-destination" onPress={props.onClearDestination}>
        <Text>Clear Destination</Text>
      </Pressable>
    </View>
  );

  MockIndoorRouteInput.displayName = "MockIndoorRouteInput";

  return MockIndoorRouteInput;
});

jest.mock("../IndoorSuggestionsList", () => {
  const React = jest.requireActual("react");
  const { View, Text, Pressable } = jest.requireActual("react-native");

  const MockIndoorSuggestionsList = ({
    suggestions,
    onPick,
  }: {
    suggestions: Array<{ id: string; label?: string }>;
    onPick: (node: { id: string; label?: string }) => void;
  }): React.JSX.Element => (
    <View>
      <Text testID="suggestions-count">{String(suggestions.length)}</Text>

      {suggestions.map((node) => (
        <Pressable
          key={node.id}
          testID={`suggestion-${node.id}`}
          onPress={() => onPick(node)}
        >
          <Text>{node.label ?? node.id}</Text>
        </Pressable>
      ))}
    </View>
  );

  MockIndoorSuggestionsList.displayName = "MockIndoorSuggestionsList";

  return MockIndoorSuggestionsList;
});

jest.mock("../floorMaps", () => ({
  floorMaps: {
    H: {
      "1": "hall-floor-1",
      "2": "hall-floor-2",
    },
  },
}));

jest.mock("../indoorData", () => ({
  indoorData: {
    H: {
      meta: { buildingId: "H" },
      nodes: [
        {
          id: "n1",
          type: "room",
          buildingId: "H",
          floor: 1,
          x: 10,
          y: 20,
          label: "Room A",
        },
        {
          id: "n2",
          type: "room",
          buildingId: "H",
          floor: 1,
          x: 30,
          y: 40,
          label: "Room B",
        },
        {
          id: "n3",
          type: "hallway",
          buildingId: "H",
          floor: 1,
          x: 50,
          y: 60,
        },
        {
          id: "n4",
          type: "room",
          buildingId: "H",
          floor: 2,
          x: 70,
          y: 80,
          label: "Room C",
        },
      ],
      edges: [
        {
          source: "n1",
          target: "n2",
          type: "path",
          weight: 5,
        },
        {
          source: "n2",
          target: "n3",
          type: "path",
          weight: 2,
        },
        {
          source: "n4",
          target: "n4",
          type: "path",
          weight: 1,
        },
      ],
    },
  },
}));

jest.mock("../../Buildings/SGW/SGWBuildings", () => ({
  SGW_BUILDINGS: [{ code: "H", name: "Hall Building", campus: "SGW" }],
}));

jest.mock("../../Buildings/Loyola/LoyolaBuildings", () => ({
  LOYOLA_BUILDINGS: [{ code: "CC", name: "CC Building", campus: "LOY" }],
}));

describe("IndoorScreen route panel", () => {
  beforeEach(() => {
    mockFindShortestIndoorPath.mockReset();
    mockIndoorMapViewer.mockClear();

    mockFindShortestIndoorPath.mockReturnValue({
      path: [
        {
          id: "n1",
          type: "room",
          buildingId: "H",
          floor: 1,
          x: 10,
          y: 20,
          label: "Room A",
        },
        {
          id: "n2",
          type: "room",
          buildingId: "H",
          floor: 1,
          x: 30,
          y: 40,
          label: "Room B",
        },
      ],
      distance: 5,
    });
  });

  it("shows start suggestions from the current floor when typing", () => {
    const { getByTestId, queryByTestId } = render(
      <IndoorScreen buildingId="H" />,
    );

    fireEvent.changeText(getByTestId("start-input"), "room");

    expect(getByTestId("suggestions-count").props.children).toBe("3");
    expect(queryByTestId("suggestion-n1")).toBeTruthy();
    expect(queryByTestId("suggestion-n2")).toBeTruthy();
    expect(queryByTestId("suggestion-n4")).toBeTruthy();
    expect(queryByTestId("suggestion-n3")).toBeNull();
  });

  it("returns no suggestions when the query is empty", () => {
    const { getByTestId, queryByTestId } = render(
      <IndoorScreen buildingId="H" />,
    );

    fireEvent.changeText(getByTestId("start-input"), "");

    expect(queryByTestId("suggestions-count")).toBeNull();
  });

  it("picking a start suggestion fills start and switches focus to destination", () => {
    const { getByTestId, queryByTestId } = render(
      <IndoorScreen buildingId="H" />,
    );

    fireEvent.changeText(getByTestId("start-input"), "Room A");
    fireEvent.press(getByTestId("suggestion-n1"));

    expect(getByTestId("start-input").props.value).toBe("Room A");
    expect(getByTestId("active-field").props.children).toBe("destination");
    expect(queryByTestId("suggestions-count")).toBeNull();
    expect(mockFindShortestIndoorPath).not.toHaveBeenCalled();
  });

  it("picking a destination suggestion triggers pathfinding", () => {
    const { getByTestId } = render(<IndoorScreen buildingId="H" />);

    fireEvent.changeText(getByTestId("start-input"), "Room A");
    fireEvent.press(getByTestId("suggestion-n1"));

    fireEvent.changeText(getByTestId("dest-input"), "Room B");
    fireEvent.press(getByTestId("suggestion-n2"));

    expect(getByTestId("dest-input").props.value).toBe("Room B");
    expect(mockFindShortestIndoorPath).toHaveBeenCalledTimes(1);
    expect(mockFindShortestIndoorPath).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "n1" }),
        expect.objectContaining({ id: "n2" }),
        expect.objectContaining({ id: "n3" }),
        expect.objectContaining({ id: "n4" }),
      ]),
      expect.arrayContaining([
        expect.objectContaining({ source: "n1", target: "n2" }),
        expect.objectContaining({ source: "n2", target: "n3" }),
        expect.objectContaining({ source: "n4", target: "n4" }),
      ]),
      "n1",
      "n2",
      { accessible: false },
    );
  });

  it("clearing start resets the text and active field", () => {
    const { getByTestId } = render(<IndoorScreen buildingId="H" />);

    fireEvent.changeText(getByTestId("start-input"), "Room A");
    fireEvent.press(getByTestId("suggestion-n1"));
    fireEvent.press(getByTestId("clear-start"));

    expect(getByTestId("start-input").props.value).toBe("");
    expect(getByTestId("active-field").props.children).toBe("start");
  });

  it("clearing destination resets the text and active field", () => {
    const { getByTestId } = render(<IndoorScreen buildingId="H" />);

    fireEvent.changeText(getByTestId("start-input"), "Room A");
    fireEvent.press(getByTestId("suggestion-n1"));
    fireEvent.changeText(getByTestId("dest-input"), "Room B");
    fireEvent.press(getByTestId("suggestion-n2"));

    fireEvent.press(getByTestId("clear-destination"));

    expect(getByTestId("dest-input").props.value).toBe("");
    expect(getByTestId("active-field").props.children).toBe("destination");
  });

  it("swaps selected start and destination", () => {
    const { getByTestId } = render(<IndoorScreen buildingId="H" />);

    fireEvent.changeText(getByTestId("start-input"), "Room A");
    fireEvent.press(getByTestId("suggestion-n1"));

    fireEvent.changeText(getByTestId("dest-input"), "Room B");
    fireEvent.press(getByTestId("suggestion-n2"));

    fireEvent.press(getByTestId("swap-button"));

    expect(getByTestId("start-input").props.value).toBe("Room B");
    expect(getByTestId("dest-input").props.value).toBe("Room A");
  });

  it("editing start text after selecting a node clears the selected start node and shows suggestions again", () => {
    const { getByTestId } = render(<IndoorScreen buildingId="H" />);

    fireEvent.changeText(getByTestId("start-input"), "Room A");
    fireEvent.press(getByTestId("suggestion-n1"));

    mockFindShortestIndoorPath.mockClear();

    fireEvent.changeText(getByTestId("start-input"), "room");

    expect(getByTestId("active-field").props.children).toBe("start");
    expect(getByTestId("suggestions-count").props.children).toBe("3");
    expect(mockFindShortestIndoorPath).not.toHaveBeenCalled();
  });

  it("editing destination text after selecting a node clears the selected destination node", () => {
    const { getByTestId } = render(<IndoorScreen buildingId="H" />);

    fireEvent.changeText(getByTestId("start-input"), "Room A");
    fireEvent.press(getByTestId("suggestion-n1"));

    fireEvent.changeText(getByTestId("dest-input"), "Room B");
    fireEvent.press(getByTestId("suggestion-n2"));

    mockFindShortestIndoorPath.mockClear();

    fireEvent.changeText(getByTestId("dest-input"), "room");

    expect(getByTestId("active-field").props.children).toBe("destination");
    expect(getByTestId("suggestions-count").props.children).toBe("3");
    expect(mockFindShortestIndoorPath).not.toHaveBeenCalled();
  });

  it("picking a destination suggestion on a different floor triggers pathfinding", () => {
    const { getByTestId } = render(<IndoorScreen buildingId="H" />);

    // Start on floor 1
    fireEvent.changeText(getByTestId("start-input"), "Room A");
    fireEvent.press(getByTestId("suggestion-n1"));

    // Destination on floor 2
    fireEvent.changeText(getByTestId("dest-input"), "Room C");
    fireEvent.press(getByTestId("suggestion-n4"));

    expect(getByTestId("dest-input").props.value).toBe("Room C");
    expect(mockFindShortestIndoorPath).toHaveBeenCalledTimes(1);
    expect(mockFindShortestIndoorPath).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "n1",
      "n4",
      { accessible: false },
    );
  });
});
