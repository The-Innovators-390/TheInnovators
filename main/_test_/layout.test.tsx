/* eslint-disable import/first */
import React from "react";
import { View } from "react-native";
import { render } from "@testing-library/react-native";
import { describe, it, expect, jest } from "@jest/globals";

// ✅ Jest allows out-of-scope vars if prefixed with "mock"
const mockReact = React;
const mockView = View;

const mockUseColorScheme = jest.fn(() => "light");

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => mockUseColorScheme(),
}));

jest.mock("@react-navigation/native", () => {
  const ThemeProviderMock = function ThemeProviderMock({ children }: any) {
    return children;
  };
  ThemeProviderMock.displayName = "ThemeProviderMock";

  return {
    __esModule: true,
    DarkTheme: { dark: true, colors: { background: "black" } },
    DefaultTheme: { dark: false, colors: { background: "white" } },
    ThemeProvider: ThemeProviderMock,
  };
});

jest.mock("expo-router", () => {
  const StackMock: any = function StackMock({ children }: any) {
    return mockReact.createElement(mockView, { testID: "stack" }, children);
  };

  // ✅ RootLayout often uses <Stack.Screen />, so we must mock it too
  const ScreenMock = function ScreenMock() {
    return null;
  };
  ScreenMock.displayName = "ScreenMock";
  StackMock.Screen = ScreenMock;

  StackMock.displayName = "StackMock";

  return {
    __esModule: true,
    Stack: StackMock,
  };
});

jest.mock("react-native-gesture-handler", () => {
  const GestureHandlerRootView = function GestureHandlerRootViewMock({
    children,
  }: any) {
    return children;
  };
  GestureHandlerRootView.displayName = "GestureHandlerRootViewMock";

  return {
    __esModule: true,
    GestureHandlerRootView,
  };
});

jest.mock("react-native-smartlook-analytics", () => ({
  __esModule: true,
  default: {
    instance: {
      preferences: {
        setProjectKey: jest.fn(),
      },
      start: jest.fn(),
      stop: jest.fn(),
    },
  },
}));

// ✅ test file is at main/_test_/ so app is one level up
import Layout from "../app/_layout";

describe("Root layout", () => {
  it("renders", () => {
    const { getByTestId } = render(<Layout />);
    expect(getByTestId("stack")).toBeTruthy();
  });
});
