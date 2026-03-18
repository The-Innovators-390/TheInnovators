import { FloorSVGMapping } from "./types";

import Hall1 from "../../assets/indoor_floors/hall/Hall-1.svg";
import Hall2 from "../../assets/indoor_floors/hall/Hall-2.svg";
import Hall8 from "../../assets/indoor_floors/hall/Hall-8.svg";
import Hall9 from "../../assets/indoor_floors/hall/Hall-9.svg";
import CC1 from "../../assets/indoor_floors/cc/CC1.svg";

import MB1 from "../../assets/indoor_floors/mb/MB-1.svg";
import MBS2 from "../../assets/indoor_floors/mb/MB-S2.svg";

import VE1 from "../../assets/indoor_floors/ve/VE-1.svg";
import VE2 from "../../assets/indoor_floors/ve/VE-2.svg";

import VL1 from "../../assets/indoor_floors/vl/VL-1.svg";
import VL2 from "../../assets/indoor_floors/vl/VL-2.svg";

export const floorMaps: FloorSVGMapping = {
  H: {
    1: Hall1,
    2: Hall2,
    8: Hall8,
    9: Hall9,
  },
  CC: {
    1: CC1,
  },
  MB: {
    "-2": MBS2,
    "1": MB1,
  },
  VE: {
    1: VE1,
    2: VE2,
  },
  VL: {
    1: VL1,
    2: VL2,
  },
};
