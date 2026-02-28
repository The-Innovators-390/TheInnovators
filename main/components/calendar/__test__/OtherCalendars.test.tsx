import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import OtherCalendars from "@/components/calendar/OtherCalendars";

const styles = {
  otherTitle: {},
  emptyText: {},

  dropdown: {},
  dropdownText: {},
  dropdownChevron: {},

  selectCalendarBtn: {},
  selectCalendarBtnDisabled: {},
  selectCalendarBtnText: {},

  modalBackdrop: {},
  modalCard: {},
  modalTitle: {},
  modalItem: {},
  modalItemSelected: {},
  modalItemText: {},
};

describe("OtherCalendars", () => {
  it("renders loading state", () => {
    const { getByText, UNSAFE_getByType } = render(
      <OtherCalendars
        calendarsLoading={true}
        calendarsError={null}
        calendars={[]}
        pickerOpen={false}
        setPickerOpen={jest.fn()}
        pendingCalendarId="primary"
        setPendingCalendarId={jest.fn()}
        pendingCalendarName="Primary"
        activeCalendarId="primary"
        onSelectCalendar={jest.fn()}
        styles={styles}
      />,
    );

    expect(getByText("Other Calendars")).toBeTruthy();

    const { ActivityIndicator } = require("react-native");
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it("renders error state", () => {
    const { getByText } = render(
      <OtherCalendars
        calendarsLoading={false}
        calendarsError="cal fail"
        calendars={[]}
        pickerOpen={false}
        setPickerOpen={jest.fn()}
        pendingCalendarId="primary"
        setPendingCalendarId={jest.fn()}
        pendingCalendarName="Primary"
        activeCalendarId="primary"
        onSelectCalendar={jest.fn()}
        styles={styles}
      />,
    );

    expect(getByText("Other Calendars")).toBeTruthy();
    expect(getByText("cal fail")).toBeTruthy();
  });

  it("renders empty state when no calendars", () => {
    const { getByText } = render(
      <OtherCalendars
        calendarsLoading={false}
        calendarsError={null}
        calendars={[]}
        pickerOpen={false}
        setPickerOpen={jest.fn()}
        pendingCalendarId="primary"
        setPendingCalendarId={jest.fn()}
        pendingCalendarName="Primary"
        activeCalendarId="primary"
        onSelectCalendar={jest.fn()}
        styles={styles}
      />,
    );

    expect(getByText("Other Calendars")).toBeTruthy();
    expect(getByText("No other calendars found.")).toBeTruthy();
  });

  it("opens picker when dropdown is pressed", () => {
    const setPickerOpen = jest.fn();

    const { getByText } = render(
      <OtherCalendars
        calendarsLoading={false}
        calendarsError={null}
        calendars={[
          { id: "primary", summary: "Primary", primary: true },
          { id: "work", summary: "Work" },
        ]}
        pickerOpen={false}
        setPickerOpen={setPickerOpen}
        pendingCalendarId="primary"
        setPendingCalendarId={jest.fn()}
        pendingCalendarName="Primary"
        activeCalendarId="primary"
        onSelectCalendar={jest.fn()}
        styles={styles}
      />,
    );

    // Press the dropdown text (inside the Pressable)
    fireEvent.press(getByText("Primary"));
    expect(setPickerOpen).toHaveBeenCalledWith(true);
  });

  it("calls onSelectCalendar when Select button is enabled (pending != active)", () => {
    const onSelectCalendar = jest.fn();

    const { getByText } = render(
      <OtherCalendars
        calendarsLoading={false}
        calendarsError={null}
        calendars={[
          { id: "primary", summary: "Primary", primary: true },
          { id: "work", summary: "Work" },
        ]}
        pickerOpen={false}
        setPickerOpen={jest.fn()}
        pendingCalendarId="work" // different -> enabled
        setPendingCalendarId={jest.fn()}
        pendingCalendarName="Work"
        activeCalendarId="primary"
        onSelectCalendar={onSelectCalendar}
        styles={styles}
      />,
    );

    fireEvent.press(getByText("Select this calendar"));
    expect(onSelectCalendar).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onSelectCalendar when Select button is disabled (pending == active)", () => {
    const onSelectCalendar = jest.fn();

    const { getByText } = render(
      <OtherCalendars
        calendarsLoading={false}
        calendarsError={null}
        calendars={[{ id: "primary", summary: "Primary", primary: true }]}
        pickerOpen={false}
        setPickerOpen={jest.fn()}
        pendingCalendarId="primary" // same -> disabled
        setPendingCalendarId={jest.fn()}
        pendingCalendarName="Primary"
        activeCalendarId="primary"
        onSelectCalendar={onSelectCalendar}
        styles={styles}
      />,
    );

    fireEvent.press(getByText("Select this calendar"));
    expect(onSelectCalendar).not.toHaveBeenCalled();
  });

  it("when pickerOpen=true, selecting an item sets pending id and closes picker", () => {
    const setPickerOpen = jest.fn();
    const setPendingCalendarId = jest.fn();

    const { getByText } = render(
      <OtherCalendars
        calendarsLoading={false}
        calendarsError={null}
        calendars={[
          { id: "primary", summary: "Primary", primary: true },
          { id: "work", summary: "Work" },
        ]}
        pickerOpen={true} // modal visible
        setPickerOpen={setPickerOpen}
        pendingCalendarId="primary"
        setPendingCalendarId={setPendingCalendarId}
        pendingCalendarName="Primary"
        activeCalendarId="primary"
        onSelectCalendar={jest.fn()}
        styles={styles}
      />,
    );

    // Modal content exists
    expect(getByText("Choose a calendar")).toBeTruthy();

    // Press Work (text inside Pressable)
    fireEvent.press(getByText("Work"));

    expect(setPendingCalendarId).toHaveBeenCalledWith("work");
    expect(setPickerOpen).toHaveBeenCalledWith(false);
  });
});
