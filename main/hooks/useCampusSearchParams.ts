import type { Router } from "expo-router";
import { useLocalSearchParams } from "expo-router";

type CampusSearchParams = {
  destBuildingId?: string | string[];
  indoorStartBuildingCode?: string | string[];
  indoorStartBuildingId?: string | string[];
  indoorStartLabel?: string | string[];
  externalDestRoomNodeId?: string | string[];
  externalDestRoomLabel?: string | string[];
  externalDestBuildingCode?: string | string[];
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * Clears map deep-link params so stale indoor handoff / room-destination data
 * does not affect a later outdoor-only route (params otherwise persist on the tab).
 */
export function clearCampusMapRouteParams(router: Router) {
  if (typeof router.setParams !== "function") return;
  try {
    router.setParams({
      destBuildingId: undefined,
      indoorStartBuildingCode: undefined,
      indoorStartBuildingId: undefined,
      indoorStartLabel: undefined,
      externalDestRoomNodeId: undefined,
      externalDestRoomLabel: undefined,
      externalDestBuildingCode: undefined,
    });
  } catch {
    // Partial router mocks in tests (or edge navigation states) may not support setParams.
  }
}

export function useCampusSearchParams() {
  const params = useLocalSearchParams<CampusSearchParams>();

  return {
    ...params,
    destBuildingId: normalizeParam(params.destBuildingId),
    indoorStartBuildingCode: normalizeParam(params.indoorStartBuildingCode),
    indoorStartBuildingId: normalizeParam(params.indoorStartBuildingId),
    indoorStartLabel: normalizeParam(params.indoorStartLabel),
    normalizedExternalDestRoomNodeId: normalizeParam(
      params.externalDestRoomNodeId,
    ),
    normalizedExternalDestRoomLabel: normalizeParam(
      params.externalDestRoomLabel,
    ),
    normalizedExternalDestBuildingCode: normalizeParam(
      params.externalDestBuildingCode,
    ),
  };
}
