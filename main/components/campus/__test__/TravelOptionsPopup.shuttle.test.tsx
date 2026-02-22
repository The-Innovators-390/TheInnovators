import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import type {
  DirectionRoute,
  TravelMode,
} from "@/components/campus/helper_methods/googleDirections";
import type { ShuttleInfo } from "@/components/campus/helper_methods/shuttleSchedule";

// Mock PNG requires used inside TravelOptionsPopup
jest.mock("../../../assets/icons/icon-subway.png", () => 1);
jest.mock("../../../assets/icons/icon-bus.png", () => 1);

const TravelOptionsPopup =
  require("@/components/campus/TravelOptionsPopup").default;

jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View } = require("react-native");

  const MockBottomSheet = React.forwardRef((props: any, _ref: any) => (
    <View testID="mock-bottom-sheet">
      {props.handleComponent?.({} as any)}
      {props.children}
    </View>
  ));
  MockBottomSheet.displayName = "MockBottomSheet";

  const BottomSheetScrollView = (props: any) => (
    <View testID="mock-bottom-sheet-scroll">{props.children}</View>
  );
  BottomSheetScrollView.displayName = "BottomSheetScrollView";

  return {
    __esModule: true,
    default: MockBottomSheet,
    BottomSheetScrollView,
  };
});

function makeRoute(
  durationText: string,
  distanceText: string,
  durationSec = 60,
): DirectionRoute {
  return {
    summary: "",
    polyline: "abc",
    durationSec,
    durationText,
    distanceMeters: 100,
    distanceText,
  };
}

type ModeData = { mode: TravelMode; routes: DirectionRoute[] };

function buildModesWithShuttle(): ModeData[] {
  return [
    { mode: "walking", routes: [makeRoute("10 mins", "0.8 km")] },
    { mode: "shuttle", routes: [] },
  ];
}

const operatingShuttleInfo: ShuttleInfo = {
  status: "operating",
  nextDepartures: ["10:30", "10:45", "11:00"],
  direction: "SGW_TO_LOY",
};

const noServiceShuttleInfo: ShuttleInfo = {
  status: "no-service-today",
  nextDepartures: [],
  direction: "SGW_TO_LOY",
};

const lastBusShuttleInfo: ShuttleInfo = {
  status: "last-bus-departed",
  nextDepartures: [],
  direction: "LOY_TO_SGW",
};

const baseProps = {
  campusTheme: "SGW" as const,
  visible: true,
  modes: buildModesWithShuttle(),
  selectedMode: "shuttle" as TravelMode,
  selectedRouteIndex: 0,
  onSelectMode: jest.fn(),
  onSelectRouteIndex: jest.fn(),
  onClose: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Shuttle chip label ───────────────────────────────────────────────────────

describe("TravelOptionsPopup - shuttle chip label", () => {
  it("shows next departure time when shuttle is operating", () => {
    const { getByTestId } = render(
      <TravelOptionsPopup
        {...baseProps}
        selectedMode="walking"
        shuttleInfo={operatingShuttleInfo}
      />,
    );

    expect(getByTestId("mode-shuttle-time").props.children).toBe("10:30");
  });

  it("shows 'No service' when shuttleInfo exists but not operating", () => {
    const { getByTestId } = render(
      <TravelOptionsPopup
        {...baseProps}
        selectedMode="walking"
        shuttleInfo={noServiceShuttleInfo}
      />,
    );

    expect(getByTestId("mode-shuttle-time").props.children).toBe("No service");
  });

  it("shows '--' when shuttleInfo is not provided", () => {
    const { getByTestId } = render(
      <TravelOptionsPopup
        {...baseProps}
        selectedMode="walking"
        shuttleInfo={undefined}
      />,
    );

    expect(getByTestId("mode-shuttle-time").props.children).toBe("--");
  });
});

// ─── Shuttle card: no shuttleInfo (schedule unavailable) ─────────────────────

describe("TravelOptionsPopup - shuttle card: no shuttleInfo", () => {
  it("shows 'Shuttle schedule unavailable' when shuttleInfo is missing", () => {
    const { getByText } = render(
      <TravelOptionsPopup {...baseProps} shuttleInfo={undefined} />,
    );

    getByText("Shuttle schedule unavailable");
  });

  it("shows error hint text when shuttleInfo is missing", () => {
    const { getByText } = render(
      <TravelOptionsPopup {...baseProps} shuttleInfo={undefined} />,
    );

    getByText(/Please try again later/);
  });
});

// ─── Shuttle card: operating ──────────────────────────────────────────────────

describe("TravelOptionsPopup - shuttle card: operating", () => {
  it("shows 'Shuttle in service' status", () => {
    const { getByText } = render(
      <TravelOptionsPopup {...baseProps} shuttleInfo={operatingShuttleInfo} />,
    );

    getByText("Shuttle in service");
  });

  it("shows next departures joined by ·", () => {
    const { getByTestId } = render(
      <TravelOptionsPopup {...baseProps} shuttleInfo={operatingShuttleInfo} />,
    );

    const departures = getByTestId("shuttle-departures");
    expect(departures.props.children).toContain("10:30");
    expect(departures.props.children).toContain("10:45");
    expect(departures.props.children).toContain("11:00");
  });

  it("shows multi-leg preview with correct campus labels (SGW→LOY)", () => {
    const { getByText } = render(
      <TravelOptionsPopup {...baseProps} shuttleInfo={operatingShuttleInfo} />,
    );

    // Walk leg
    getByText(/Walk to SGW shuttle stop/);
    // Departs time
    getByText(/departs 10:30/);
    // Shuttle leg
    getByText(/SGW.*Loyola/);
    // Arrival leg
    getByText(/Walk to destination at Loyola campus/);
  });

  it("shows multi-leg preview with correct campus labels (LOY→SGW)", () => {
    const loyInfo: ShuttleInfo = {
      ...operatingShuttleInfo,
      direction: "LOY_TO_SGW",
    };

    const { getByText } = render(
      <TravelOptionsPopup {...baseProps} shuttleInfo={loyInfo} />,
    );

    getByText(/Walk to Loyola shuttle stop/);
    getByText(/Walk to destination at SGW campus/);
  });

  it("GO button is enabled when operating", () => {
    const { getByTestId } = render(
      <TravelOptionsPopup {...baseProps} shuttleInfo={operatingShuttleInfo} />,
    );

    const goBtn = getByTestId("go-shuttle-0");
    expect(goBtn.props.disabled).toBeFalsy();
  });

  it("pressing GO calls onGo with ('shuttle', 0)", () => {
    const onGo = jest.fn();
    const { getByTestId } = render(
      <TravelOptionsPopup
        {...baseProps}
        shuttleInfo={operatingShuttleInfo}
        onGo={onGo}
      />,
    );

    fireEvent.press(getByTestId("go-shuttle-0"));
    expect(onGo).toHaveBeenCalledWith("shuttle", 0);
  });
});

// ─── Shuttle card: no-service-today ──────────────────────────────────────────

describe("TravelOptionsPopup - shuttle card: no-service-today", () => {
  it("shows 'No service today' status", () => {
    const { getByText } = render(
      <TravelOptionsPopup {...baseProps} shuttleInfo={noServiceShuttleInfo} />,
    );

    getByText("No service today");
  });

  it("shows 'Service runs Monday – Friday.' message", () => {
    const { getByText } = render(
      <TravelOptionsPopup {...baseProps} shuttleInfo={noServiceShuttleInfo} />,
    );

    getByText(/Service runs Monday/);
  });

  it("pressing GO does not call onGo when no service", () => {
    const onGo = jest.fn();
    const { getByTestId } = render(
      <TravelOptionsPopup
        {...baseProps}
        shuttleInfo={noServiceShuttleInfo}
        onGo={onGo}
      />,
    );

    fireEvent.press(getByTestId("go-shuttle-0"));
    expect(onGo).not.toHaveBeenCalled();
  });
});

// ─── Shuttle card: last-bus-departed ─────────────────────────────────────────

describe("TravelOptionsPopup - shuttle card: last-bus-departed", () => {
  it("shows 'No upcoming shuttles today' status", () => {
    const { getByText } = render(
      <TravelOptionsPopup {...baseProps} shuttleInfo={lastBusShuttleInfo} />,
    );

    getByText("No upcoming shuttles today");
  });

  it("shows 'Check back tomorrow' message", () => {
    const { getByText } = render(
      <TravelOptionsPopup {...baseProps} shuttleInfo={lastBusShuttleInfo} />,
    );

    getByText(/Check back tomorrow/);
  });

  it("pressing GO does not call onGo when last bus has departed", () => {
    const onGo = jest.fn();
    const { getByTestId } = render(
      <TravelOptionsPopup
        {...baseProps}
        shuttleInfo={lastBusShuttleInfo}
        onGo={onGo}
      />,
    );

    fireEvent.press(getByTestId("go-shuttle-0"));
    expect(onGo).not.toHaveBeenCalled();
  });
});
