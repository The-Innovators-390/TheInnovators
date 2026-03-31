import IndoorScreen from "../../components/indoors/IndoorScreen";
import { useLocalSearchParams } from "expo-router";

export default function IndoorScreenRoute() {
  const {
    buildingCode,
    destinationNodeId,
    destinationLabel,
  } = useLocalSearchParams<{
    buildingCode?: string;
    destinationNodeId?: string;
    destinationLabel?: string;
  }>();

  if (!buildingCode) return null;

  return (
    <IndoorScreen
      buildingId={buildingCode}
    />
  );
}