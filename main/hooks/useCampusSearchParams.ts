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
