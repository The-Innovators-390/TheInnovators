const FLOATING_BOTTOM_POSITIONS = {
  BASE: 120,
  PEEK: 280,
  EXPANDED: 440,
} as const;

export const computeFloatingBottom = (
  selectedExists: boolean,
  popupIndex: number,
) => {
  if (!selectedExists || popupIndex === -1) {
    return FLOATING_BOTTOM_POSITIONS.BASE;
  }
  return popupIndex === 0
    ? FLOATING_BOTTOM_POSITIONS.PEEK
    : FLOATING_BOTTOM_POSITIONS.EXPANDED;
};

export function getFloatingUiState(params: {
  isRouteMode: boolean;
  selected: unknown;
  isNavigating: boolean;
  travelPopupVisible: boolean;
  popupIndex: number;
  windowHeight: number;
}) {
  const {
    isRouteMode,
    selected,
    isNavigating,
    travelPopupVisible,
    popupIndex,
    windowHeight,
  } = params;

  const hasBuildingPopup = !isRouteMode && !!selected;
  const hasTravelPopup = isRouteMode && !isNavigating && travelPopupVisible;

  const collapsedBuildingPopupHeight = Math.round(windowHeight * 0.19);
  const collapsedTravelPopupHeight = Math.max(
    260,
    Math.round(windowHeight * 0.28),
  );

  let floatingBottom = 120;
  if (hasBuildingPopup) {
    floatingBottom = collapsedBuildingPopupHeight;
  } else if (hasTravelPopup) {
    floatingBottom = collapsedTravelPopupHeight;
  }

  const shouldShowCompass =
    isNavigating || !(popupIndex > 0 && (hasBuildingPopup || hasTravelPopup));

  const shouldHideFloatingButtons =
    popupIndex > 0 && (hasBuildingPopup || hasTravelPopup);

  return {
    hasBuildingPopup,
    hasTravelPopup,
    floatingBottom,
    shouldShowCompass,
    shouldHideFloatingButtons,
  };
}
