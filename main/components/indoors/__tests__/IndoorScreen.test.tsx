import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import IndoorScreen from "../IndoorScreen";

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

jest.mock("../floorMaps", () => ({
  floorMaps: {
    H: {
      "1": "hall-floor-1",
      "2": "hall-floor-2",
    },
    MB: {
      "-2": "mb-floor-s2",
      "1": "mb-floor-1",
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
        },
        {
          id: "n2",
          type: "room",
          buildingId: "H",
          floor: 2,
          x: 30,
          y: 40,
        },
      ],
      edges: [
        {
          source: "n1",
          target: "n1",
          type: "path",
          weight: 1,
        },
        {
          source: "n2",
          target: "n2",
          type: "path",
          weight: 2,
        },
      ],
    },
    MB: {
      meta: { buildingId: "MB" },
      nodes: [
        {
          id: "mbs2",
          type: "room",
          buildingId: "MB",
          floor: -2,
          x: 1,
          y: 2,
        },
        {
          id: "mb1",
          type: "room",
          buildingId: "MB",
          floor: 1,
          x: 3,
          y: 4,
        },
      ],
      edges: [
        {
          source: "mbs2",
          target: "mbs2",
          type: "path",
          weight: 1,
        },
        {
          source: "mb1",
          target: "mb1",
          type: "path",
          weight: 1,
        },
      ],
    },
  },
}));
jest.mock("../../Buildings/SGW/SGWBuildings", () => ({
  SGW_BUILDINGS: [
    { code: "H", name: "Hall Building", campus: "SGW" },
    { code: "MB", name: "John Molson Building", campus: "SGW" },
  ],
}));

jest.mock("../../Buildings/Loyola/LoyolaBuildings", () => ({
  LOYOLA_BUILDINGS: [{ code: "CC", name: "CC Building", campus: "LOY" }],
}));

describe("IndoorScreen", () => {
  beforeEach(() => {
    mockIndoorMapViewer.mockClear();
  });

  it("renders not found state when graph data is missing", () => {
    const { getByText, queryByText } = render(
      <IndoorScreen buildingId="UNKNOWN" />,
    );

    expect(getByText("Building Not Found")).toBeTruthy();
    expect(getByText("Indoor map coming soon for UNKNOWN.")).toBeTruthy();
    expect(queryByText("IndoorMapViewerMock")).toBeNull();
  });

  it("renders building name and default first floor for a normal building", () => {
    const { getByText } = render(<IndoorScreen buildingId="H" />);

    expect(getByText("Hall Building")).toBeTruthy();
    expect(getByText("IndoorMapViewerMock")).toBeTruthy();
    expect(getByText("1")).toBeTruthy();
    expect(getByText("2")).toBeTruthy();

    const lastCall =
      mockIndoorMapViewer.mock.calls[
        mockIndoorMapViewer.mock.calls.length - 1
      ][0];

    expect(lastCall.imageSource).toBe("hall-floor-1");
    expect(lastCall.nodes).toEqual([
      {
        id: "n1",
        type: "room",
        buildingId: "H",
        floor: 1,
        x: 10,
        y: 20,
      },
    ]);
    expect(lastCall.edges).toEqual([
      {
        source: "n1",
        target: "n1",
        type: "path",
        weight: 1,
      },
    ]);
  });

  it("trims buildingId before lookup", () => {
    render(<IndoorScreen buildingId="  H  " />);

    const lastCall =
      mockIndoorMapViewer.mock.calls[
        mockIndoorMapViewer.mock.calls.length - 1
      ][0];

    expect(lastCall.imageSource).toBe("hall-floor-1");
  });

  it("changes floor when a floor button is pressed", () => {
    const { getByText } = render(<IndoorScreen buildingId="H" />);

    fireEvent.press(getByText("2"));

    const lastCall =
      mockIndoorMapViewer.mock.calls[
        mockIndoorMapViewer.mock.calls.length - 1
      ][0];

    expect(lastCall.imageSource).toBe("hall-floor-2");
    expect(lastCall.nodes).toEqual([
      {
        id: "n2",
        type: "room",
        buildingId: "H",
        floor: 2,
        x: 30,
        y: 40,
      },
    ]);
    expect(lastCall.edges).toEqual([
      {
        source: "n2",
        target: "n2",
        type: "path",
        weight: 2,
      },
    ]);
  });

  it("uses MB special floors and displays S2", () => {
    const { getByText } = render(<IndoorScreen buildingId="MB" />);

    expect(getByText("John Molson Building")).toBeTruthy();
    expect(getByText("S2")).toBeTruthy();
    expect(getByText("1")).toBeTruthy();

    const lastCall =
      mockIndoorMapViewer.mock.calls[
        mockIndoorMapViewer.mock.calls.length - 1
      ][0];

    expect(lastCall.imageSource).toBe("mb-floor-s2");
    expect(lastCall.nodes).toEqual([
      {
        id: "mbs2",
        type: "room",
        buildingId: "MB",
        floor: -2,
        x: 1,
        y: 2,
      },
    ]);
  });
});
