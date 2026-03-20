export interface CampusTheme {
  headerBackgroundColor: string;
  headerTextColor: string;
  selectedButtonColor: string;
}

export const CAMPUS_THEMES: Record<string, CampusTheme> = {
  SGW: {
    headerBackgroundColor: "#912338",
    headerTextColor: "#fff",
    selectedButtonColor: "#912338",
  },
  LOY: {
    headerBackgroundColor: "#e3ac20",
    headerTextColor: "#fff",
    selectedButtonColor: "#e3ac20",
  },
  default: {
    headerBackgroundColor: "#fff",
    headerTextColor: "#000",
    selectedButtonColor: "#007AFF",
  },
};

export const getCampusTheme = (campus?: string): CampusTheme => {
  return CAMPUS_THEMES[campus ?? "default"] || CAMPUS_THEMES.default;
};
