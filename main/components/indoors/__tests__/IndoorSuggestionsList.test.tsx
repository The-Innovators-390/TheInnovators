import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import IndoorSuggestionsList from "../IndoorSuggestionsList";
import type { IndoorNode } from "../types";

describe("IndoorSuggestionsList", () => {
  it("returns null when suggestions is empty", () => {
    const { queryByTestId } = render(
      <IndoorSuggestionsList suggestions={[]} onPick={jest.fn()} />,
    );

    expect(queryByTestId("indoor-route-suggestions")).toBeNull();
  });

  it("renders suggestions with stable testIDs and calls onPick", () => {
    const onPick = jest.fn();

    const indoorNode: IndoorNode = {
      id: "n1",
      type: "room",
      buildingId: "H",
      floor: 2,
      label: "Room 101",
    };

    const outdoorBuilding = {
      type: "outdoor_building" as const,
      label: "Hall Building",
      building: { code: "H" },
    };

    const externalRoom = {
      type: "external_room" as const,
      label: "H-101",
      building: { id: "HALL" },
      roomNode: indoorNode,
    };

    const { getByTestId, getByText } = render(
      <IndoorSuggestionsList
        suggestions={[indoorNode, outdoorBuilding, externalRoom]}
        onPick={onPick}
      />,
    );

    expect(getByTestId("indoor-route-suggestions")).toBeTruthy();
    expect(getByText("Room 101")).toBeTruthy();
    expect(getByText("Floor 2 • H")).toBeTruthy();

    fireEvent.press(getByTestId("indoorSuggestion-n1"));
    fireEvent.press(getByTestId("indoorSuggestion-outdoor-H"));
    fireEvent.press(getByTestId("indoorSuggestion-external-n1-HALL"));

    expect(onPick).toHaveBeenCalledTimes(3);
    expect(onPick.mock.calls[0][0]).toEqual(indoorNode);
    expect(onPick.mock.calls[1][0]).toEqual(outdoorBuilding);
    expect(onPick.mock.calls[2][0]).toEqual(externalRoom);
  });

  it("falls back to node id when label is missing", () => {
    const onPick = jest.fn();
    const indoorNode: IndoorNode = {
      id: "n2",
      type: "room",
      buildingId: "MB",
      floor: 1,
    };

    const { getByText } = render(
      <IndoorSuggestionsList suggestions={[indoorNode]} onPick={onPick} />,
    );

    expect(getByText("n2")).toBeTruthy();
    expect(getByText("Floor 1 • MB")).toBeTruthy();
  });
});
