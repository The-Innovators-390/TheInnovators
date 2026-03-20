import { getCampusTheme, CAMPUS_THEMES } from "../campusTheme";

describe("campusTheme", () => {
  test("getCampusTheme returns SGW theme for SGW campus", () => {
    const theme = getCampusTheme("SGW");
    expect(theme).toEqual(CAMPUS_THEMES.SGW);
  });

  test("getCampusTheme returns LOY theme for LOY campus", () => {
    const theme = getCampusTheme("LOY");
    expect(theme).toEqual(CAMPUS_THEMES.LOY);
  });

  test("getCampusTheme returns default theme for unknown campus", () => {
    const theme = getCampusTheme("UNKNOWN");
    expect(theme).toEqual(CAMPUS_THEMES.default);
  });

  test("getCampusTheme returns default theme for undefined campus", () => {
    const theme = getCampusTheme(undefined);
    expect(theme).toEqual(CAMPUS_THEMES.default);
  });
});
