import { FloorSVGMapping } from "./types";

import Hall1 from "../../assets/indoor_floors/hall/H1.png";
import Hall2 from "../../assets/indoor_floors/hall/H2.png";
import Hall8 from "../../assets/indoor_floors/hall/H8.png";
import Hall9 from "../../assets/indoor_floors/hall/H9.png";
import CC1 from "../../assets/indoor_floors/cc/CC1.png";

import MB1 from "../../assets/indoor_floors/mb/mb_1.png";
import MBS2 from "../../assets/indoor_floors/mb/mb_s2.png";

import VE1 from "../../assets/indoor_floors/ve/ve1.png";
import VE2 from "../../assets/indoor_floors/ve/ve2.png";

import VL1 from "../../assets/indoor_floors/vl/vl_1.png";
import VL2 from "../../assets/indoor_floors/vl/vl_2.png";

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
