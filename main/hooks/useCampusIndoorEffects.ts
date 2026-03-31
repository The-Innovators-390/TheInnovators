import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import type { Building } from "@/components/Buildings/types";

type NavForIndoorEffects = {
  isRouteMode: boolean;
  setIsRouteMode: (isRouteMode: boolean) => void;
  setRouteStart: (building: Building) => void;
  routeStart: Building | null;
  routeDest: Building | null;
};

type RouteNavigationForIndoorEffects = {
  isNavigating: boolean;
};

type UseCampusIndoorEffectsProps = {
  nav: NavForIndoorEffects;
  routeNavigation: RouteNavigationForIndoorEffects;
  indoorStartBuilding: Building | null;
  indoorStartLabel?: string;
  normalizedExternalDestRoomNodeId?: string;
  normalizedExternalDestRoomLabel?: string;
  normalizedExternalDestBuildingCode?: string;
  setStartText: (text: string) => void;
  setSelected: (building: Building | null) => void;
  setPopupIndex: (index: number) => void;
  setShowIndoorArrivalConfirm: (show: boolean) => void;
};

export function useCampusIndoorEffects({
  nav,
  routeNavigation,
  indoorStartBuilding,
  indoorStartLabel,
  normalizedExternalDestRoomNodeId,
  normalizedExternalDestRoomLabel,
  normalizedExternalDestBuildingCode,
  setStartText,
  setSelected,
  setPopupIndex,
  setShowIndoorArrivalConfirm,
}: Readonly<UseCampusIndoorEffectsProps>) {
  const router = useRouter();
  const hasOpenedIndoorDestinationRef = useRef(false);
  const appliedIndoorStartSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!indoorStartBuilding) return;
    const signature = `${indoorStartBuilding.id}|${indoorStartLabel ?? ""}`;
    if (appliedIndoorStartSignatureRef.current === signature) return;
    appliedIndoorStartSignatureRef.current = signature;

    if (!nav.isRouteMode) {
      nav.setIsRouteMode(true);
    }

    nav.setRouteStart(indoorStartBuilding);

    setStartText(
      indoorStartLabel
        ? `${indoorStartLabel} (${indoorStartBuilding.code})`
        : `${indoorStartBuilding.code} - ${indoorStartBuilding.name}`,
    );

    setSelected(null);
    setPopupIndex(-1);
  }, [indoorStartBuilding, indoorStartLabel, nav, setPopupIndex, setSelected]);

  useEffect(() => {
    const shouldShowArrivalConfirm =
      routeNavigation.isNavigating &&
      !!nav.routeDest &&
      !!normalizedExternalDestRoomNodeId &&
      !!normalizedExternalDestBuildingCode &&
      nav.routeDest.code === normalizedExternalDestBuildingCode &&
      !hasOpenedIndoorDestinationRef.current;

    setShowIndoorArrivalConfirm(shouldShowArrivalConfirm);
  }, [
    routeNavigation.isNavigating,
    nav.routeDest,
    normalizedExternalDestRoomNodeId,
    normalizedExternalDestBuildingCode,
    setShowIndoorArrivalConfirm,
  ]);

  useEffect(() => {
    hasOpenedIndoorDestinationRef.current = false;
    setShowIndoorArrivalConfirm(false);
  }, [
    nav.routeStart?.id,
    nav.routeDest?.id,
    normalizedExternalDestRoomNodeId,
    normalizedExternalDestBuildingCode,
    setShowIndoorArrivalConfirm,
  ]);

  const markIndoorDestinationOpened = useCallback(() => {
    hasOpenedIndoorDestinationRef.current = true;
    setShowIndoorArrivalConfirm(false);
  }, [setShowIndoorArrivalConfirm]);

  const resetIndoorDestinationState = useCallback(() => {
    hasOpenedIndoorDestinationRef.current = false;
    setShowIndoorArrivalConfirm(false);
  }, [setShowIndoorArrivalConfirm]);

  const handleContinueIndoors = useCallback(() => {
    if (
      !nav.routeDest ||
      !normalizedExternalDestRoomNodeId ||
      !normalizedExternalDestBuildingCode ||
      nav.routeDest.code !== normalizedExternalDestBuildingCode
    ) {
      return;
    }

    markIndoorDestinationOpened();

    router.push({
      pathname: "/(tabs)/indoorscreen",
      params: {
        buildingCode: nav.routeDest.code,
        destinationNodeId: normalizedExternalDestRoomNodeId,
        destinationLabel: normalizedExternalDestRoomLabel,
      },
    });
  }, [
    nav.routeDest,
    normalizedExternalDestRoomNodeId,
    normalizedExternalDestRoomLabel,
    normalizedExternalDestBuildingCode,
    markIndoorDestinationOpened,
    router,
  ]);

  return {
    handleContinueIndoors,
    resetIndoorDestinationState,
  };
}
