import { ImageSourcePropType } from "react-native";

export interface IndoorNode {
  id: string;
  type: string;
  buildingId: string;
  floor: number;
  x: number;
  y: number;
  label?: string;
  accessible?: boolean;
}

export interface IndoorEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
  accessible?: boolean;
}

export interface IndoorGraphData {
  meta: {
    buildingId: string;
  };
  nodes: IndoorNode[];
  edges: IndoorEdge[];
}

export interface FloorSVGMapping {
  [buildingId: string]: {
    [floor: string]: ImageSourcePropType;
  };
}

export interface IndoorGraphMapping {
  [buildingId: string]: IndoorGraphData;
}