import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import IndoorScreen from "../IndoorScreen";

const mockFindShortestIndoorPath = jest.fn();
const mockFindShortestIndoorPathWithSteps = jest.fn();
const mockFindShortestPathToBuildingExitWithSteps = jest.fn();
const mockIndoorMapViewer = jest.fn();
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
let mockLocalSearchParams: Record<string, string | string[] | undefined> = {};

/** When non-null, `useIndoorSuggestions` returns this instead of real suggestions. */
let mockIndoorSuggestionsForcedReturn: unknown[] | null = null;

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockLocalSearchParams,
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
}));

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
  findShortestIndoorPathWithSteps: (...args: unknown[]) =>
    mockFindShortestIndoorPathWithSteps(...args),
  findShortestPathToBuildingExitWithSteps: (...args: unknown[]) =>
    mockFindShortestPathToBuildingExitWithSteps(...args),
}));

jest.mock("../hooks/useIndoorSuggestions", () => {
  const actual = jest.requireActual(
    "../hooks/useIndoorSuggestions",
  ) as typeof import("../hooks/useIndoorSuggestions");

  return {
    useIndoorSuggestions: (
      params: Parameters<typeof actual.useIndoorSuggestions>[0],
    ) => {
      if (mockIndoorSuggestionsForcedReturn !== null) {
        return mockIndoorSuggestionsForcedReturn;
      }
      return actual.useIndoorSuggestions(params);
    },
  };
});

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
  const { View, Text, Pressable } = jest.requireActual("react-native");

  const MockIndoorSuggestionsList = ({
    suggestions,
    onPick,
  }: {
    suggestions: Array<{ id?: string; label?: string }>;
    onPick: (node: { id?: string; label?: string }) => void;
  }): React.JSX.Element => (
    <View>
      <Text testID="suggestions-count">{String(suggestions.length)}</Text>

      {suggestions.map((node) => (
        <Pressable
          key={node.id ?? node.label}
          testID={`suggestion-${node.id ?? node.label}`}
          onPress={() => onPick(node)}
        >
          <Text>{node.label ?? node.id ?? "Suggestion"}</Text>
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
    ZART: {
      "1": "zart-floor-1",
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
    CC: {
      meta: { buildingId: "CC" },
      nodes: [
        {
          id: "cc1",
          type: "room",
          buildingId: "CC",
          floor: 1,
          x: 12,
          y: 24,
          label: "CC Room 10",
        },
      ],
      edges: [],
    },
    ZART: {
      meta: { buildingId: "ZART" },
      nodes: [
        {
          id: "z1",
          type: "room",
          buildingId: "ZART",
          floor: 1,
          x: 1,
          y: 1,
          label: "Z Annex A",
        },
        {
          id: "z2",
          type: "room",
          buildingId: "ZART",
          floor: 1,
          x: 2,
          y: 2,
          label: "Z Annex B",
        },
      ],
      edges: [
        {
          source: "z1",
          target: "z2",
          type: "path",
          weight: 1,
        },
      ],
    },
  },
}));

jest.mock("../../Buildings/SGW/SGWBuildings", () => ({
  SGW_BUILDINGS: [
    { code: "H", id: "hall-id", name: "Hall Building", campus: "SGW" },
  ],
}));

jest.mock("../../Buildings/Loyola/LoyolaBuildings", () => ({
  LOYOLA_BUILDINGS: [
    {
      code: "CC",
      id: "cc-id",
      name: "CC Building",
      address: "7141 Sherbrooke St W",
      campus: "LOY",
    },
    {
      code: "ZART",
      id: "zart-id",
      name: "Zart Building",
      address: "",
    },
  ],
}));

describe("IndoorScreen route panel", () => {
  beforeEach(() => {
    mockLocalSearchParams = {};
    mockIndoorSuggestionsForcedReturn = null;
    delete process.env.INDOOR_EXIT_BTN_TEST_PRESSED;
    mockRouterPush.mockReset();
    mockRouterReplace.mockReset();
    mockFindShortestIndoorPath.mockReset();
    mockFindShortestIndoorPathWithSteps.mockReset();
    mockFindShortestPathToBuildingExitWithSteps.mockReset();
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

    mockFindShortestIndoorPathWithSteps.mockReturnValue({
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
      steps: [],
    });

    mockFindShortestPathToBuildingExitWithSteps.mockReturnValue(null);
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
    expect(mockFindShortestIndoorPathWithSteps).toHaveBeenCalledTimes(1);
    expect(mockFindShortestIndoorPathWithSteps).toHaveBeenCalledWith(
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

    mockFindShortestIndoorPathWithSteps.mockClear();

    fireEvent.changeText(getByTestId("start-input"), "room");

    expect(getByTestId("active-field").props.children).toBe("start");
    expect(getByTestId("suggestions-count").props.children).toBe("3");
    expect(mockFindShortestIndoorPathWithSteps).not.toHaveBeenCalled();
  });

  it("editing destination text after selecting a node clears the selected destination node", () => {
    const { getByTestId } = render(<IndoorScreen buildingId="H" />);

    fireEvent.changeText(getByTestId("start-input"), "Room A");
    fireEvent.press(getByTestId("suggestion-n1"));

    fireEvent.changeText(getByTestId("dest-input"), "Room B");
    fireEvent.press(getByTestId("suggestion-n2"));

    mockFindShortestIndoorPathWithSteps.mockClear();

    fireEvent.changeText(getByTestId("dest-input"), "room");

    expect(getByTestId("active-field").props.children).toBe("destination");
    expect(getByTestId("suggestions-count").props.children).toBe("4");
    expect(mockFindShortestIndoorPathWithSteps).not.toHaveBeenCalled();
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
    expect(mockFindShortestIndoorPathWithSteps).toHaveBeenCalledTimes(1);
    expect(mockFindShortestIndoorPathWithSteps).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "n1",
      "n4",
      { accessible: false },
    );
  });

  it("uses deep-link destination params when node id matches", () => {
    mockLocalSearchParams = {
      destinationNodeId: "n2",
      destinationLabel: "Deep linked room",
    };

    const { getByTestId } = render(<IndoorScreen buildingId="H" />);

    expect(getByTestId("dest-input").props.value).toBe("Deep linked room");
    expect(getByTestId("active-field").props.children).toBe("destination");
  });

  it("uses deep-link destination params when room label matches", () => {
    mockLocalSearchParams = {
      destinationNodeId: "some-invalid-id",
      destinationLabel: "Room A",
    };

    const { getByTestId } = render(<IndoorScreen buildingId="H" />);

    expect(getByTestId("dest-input").props.value).toBe("Room A");
    // Should still pick n1 because its label "Room A" matches (case-insensitive)
    // Actually the mock data has nodes with labels like "Room A"
  });

  it("advances through route steps and updates floor after transport step", () => {
    const prevExitPressedEnv = process.env.INDOOR_EXIT_BTN_TEST_PRESSED;
    process.env.INDOOR_EXIT_BTN_TEST_PRESSED = "1";

    try {
      mockFindShortestIndoorPathWithSteps.mockReturnValue({
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
            id: "n4",
            type: "room",
            buildingId: "H",
            floor: 2,
            x: 70,
            y: 80,
            label: "Room C",
          },
        ],
        distance: 10,
        steps: [
          {
            kind: "elevator",
            instruction: "Take the elevator to 2nd floor",
            floor: 1,
            fromNodeId: "n1",
            toNodeId: "n4",
            distance: 5,
          },
          {
            kind: "walk",
            instruction: "Proceed to Room C",
            floor: 2,
            fromNodeId: "n4",
            toNodeId: "n4",
            distance: 1,
          },
        ],
      });

      const { getByTestId, getByText } = render(<IndoorScreen buildingId="H" />);

      fireEvent.changeText(getByTestId("start-input"), "Room A");
      fireEvent.press(getByTestId("suggestion-n1"));
      fireEvent.changeText(getByTestId("dest-input"), "Room C");
      fireEvent.press(getByTestId("suggestion-n4"));

      expect(getByText("Step 1 of 2")).toBeTruthy();
      fireEvent.press(getByTestId("indoorNextStepButton"));
      expect(
        getByTestId("indoor-current-floor").props.children.join(""),
      ).toContain("2");
      expect(getByText("You have reached this step")).toBeTruthy();
      expect(getByTestId("indoorExitToCampusButton")).toBeTruthy();

      const overlay = getByTestId("indoor-route-step-overlay");
      expect(overlay.props.style[1]).toBeNull();

      expect(
        StyleSheet.flatten(getByTestId("indoorExitToCampusButton").props.style)
          .opacity,
      ).toBeCloseTo(0.92);

      fireEvent.press(getByTestId("indoorExitToCampusButton"));
      expect(mockRouterReplace).toHaveBeenCalledWith({
        pathname: "/(tabs)/map",
        params: { exitMapCampus: "SGW" },
      });
    } finally {
      if (prevExitPressedEnv === undefined) {
        delete process.env.INDOOR_EXIT_BTN_TEST_PRESSED;
      } else {
        process.env.INDOOR_EXIT_BTN_TEST_PRESSED = prevExitPressedEnv;
      }
    }
  });

  it("exit to campus uses LOY when the Loyola listing omits campus", () => {
    mockFindShortestIndoorPathWithSteps.mockReturnValue({
      path: [
        {
          id: "z1",
          type: "room",
          buildingId: "ZART",
          floor: 1,
          x: 1,
          y: 1,
          label: "Z Annex A",
        },
        {
          id: "z2",
          type: "room",
          buildingId: "ZART",
          floor: 1,
          x: 2,
          y: 2,
          label: "Z Annex B",
        },
      ],
      distance: 2,
      steps: [
        {
          kind: "walk",
          instruction: "Walk toward annex B",
          floor: 1,
          fromNodeId: "z1",
          toNodeId: "z2",
          distance: 1,
        },
        {
          kind: "walk",
          instruction: "Arrive at Z Annex B",
          floor: 1,
          fromNodeId: "z2",
          toNodeId: "z2",
          distance: 0,
        },
      ],
    });

    const { getByTestId, getByText } = render(
      <IndoorScreen buildingId="ZART" />,
    );

    fireEvent.changeText(getByTestId("start-input"), "Z Annex A");
    fireEvent.press(getByTestId("suggestion-z1"));
    fireEvent.changeText(getByTestId("dest-input"), "Z Annex B");
    fireEvent.press(getByTestId("suggestion-z2"));

    expect(getByText("Step 1 of 2")).toBeTruthy();
    fireEvent.press(getByTestId("indoorNextStepButton"));
    expect(getByTestId("indoorExitToCampusButton")).toBeTruthy();
    fireEvent.press(getByTestId("indoorExitToCampusButton"));

    expect(mockRouterReplace).toHaveBeenCalledWith({
      pathname: "/(tabs)/map",
      params: { exitMapCampus: "LOY" },
    });
  });

  it("supports outdoor handoff and continues to campus route", () => {
    mockFindShortestPathToBuildingExitWithSteps.mockReturnValue({
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
      ],
      distance: 1,
      steps: [
        {
          kind: "exit",
          instruction: "Exit the building",
          floor: 1,
          fromNodeId: "n1",
          toNodeId: "n1",
          distance: 1,
        },
      ],
    });

    const { getByTestId } = render(<IndoorScreen buildingId="H" />);

    fireEvent.changeText(getByTestId("start-input"), "Room A");
    fireEvent.press(getByTestId("suggestion-n1"));
    fireEvent.changeText(getByTestId("dest-input"), "cc");
    fireEvent.press(getByTestId("suggestion-CC - CC Building"));
    fireEvent.press(getByTestId("confirmExitBuildingButton"));

    expect(mockRouterPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "/(tabs)/map",
        params: expect.objectContaining({
          indoorStartBuildingCode: "H",
          destBuildingId: "cc-id",
        }),
      }),
    );
  });

  it("normalizes array deep-link params for destination id and label", () => {
    mockLocalSearchParams = {
      destinationNodeId: ["n2", "ignored"],
      destinationLabel: ["From array label", "ignored"],
    };

    const { getByTestId } = render(<IndoorScreen buildingId="H" />);

    expect(getByTestId("dest-input").props.value).toBe("From array label");
    expect(getByTestId("active-field").props.children).toBe("destination");
  });

  it("does not change floor when the first path node has no numeric floor", () => {
    mockFindShortestIndoorPathWithSteps.mockReturnValue({
      path: [
        {
          id: "n1",
          type: "room",
          buildingId: "H",
          x: 10,
          y: 20,
          label: "Room A",
        } as import("../types").IndoorNode,
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
      steps: [
        {
          kind: "walk",
          instruction: "Walk",
          floor: 1,
          fromNodeId: "n1",
          toNodeId: "n2",
          distance: 1,
        },
      ],
    });

    const { getByTestId } = render(<IndoorScreen buildingId="H" />);

    fireEvent.changeText(getByTestId("start-input"), "Room A");
    fireEvent.press(getByTestId("suggestion-n1"));
    fireEvent.changeText(getByTestId("dest-input"), "Room B");
    fireEvent.press(getByTestId("suggestion-n2"));

    expect(
      getByTestId("indoor-current-floor").props.children.join(""),
    ).toContain("1");
  });

  it("adds stepOverlayWithSuggestions when the suggestions hook reports items on the last step", () => {
    mockIndoorSuggestionsForcedReturn = [
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
    ];

    mockFindShortestIndoorPathWithSteps.mockReturnValue({
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
      steps: [
        {
          kind: "walk",
          instruction: "First",
          floor: 1,
          fromNodeId: "n1",
          toNodeId: "n2",
          distance: 1,
        },
        {
          kind: "walk",
          instruction: "Last",
          floor: 1,
          fromNodeId: "n2",
          toNodeId: "n2",
          distance: 0,
        },
      ],
    });

    const { getByTestId } = render(<IndoorScreen buildingId="H" />);

    fireEvent.changeText(getByTestId("start-input"), "Room A");
    fireEvent.press(getByTestId("suggestion-n1"));
    fireEvent.changeText(getByTestId("dest-input"), "Room B");
    fireEvent.press(getByTestId("suggestion-n2"));

    fireEvent.press(getByTestId("indoorNextStepButton"));

    const overlay = getByTestId("indoor-route-step-overlay");
    expect(overlay.props.style[1]).not.toBeNull();
  });
});
