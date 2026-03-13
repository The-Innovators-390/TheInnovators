export const indoorPlan = {
    cc: {
      graph: require("../../assets/indoors/cc/cc1.json"),
      floors: {
        1: require("../../assets/indoors/cc/CC1.png"),
      },
    },
  
    hb: {
      graph: require("../../assets/indoors/hb/hall.json"),
      floors: {
        1: require("../../assets/indoors/hb/Hall-1.png"),
        2: require("../../assets/indoors/hb/Hall-2.png"),
        8: require("../../assets/indoors/hb/Hall-8.svg"),
        9: require("../../assets/indoors/hb/Hall-9.svg"),
      },
    },
  
    mb: {
      graph: require("../../assets/indoors/mb/mb merged.json"),
      floors: {
        1: require("../../assets/indoors/mb/MB-1.svg"),
        2: require("../../assets/indoors/mb/MB-S2.svg"),
      },
    },
  
    ve: {
      graph: require("../../assets/indoors/ve/ve.json"),
      floors: {
        1: require("../../assets/indoors/ve/VE-1.svg"),
        2: require("../../assets/indoors/ve/VE-2.svg"),
      },
    },
  
    vl: {
      graph: require("../../assets/indoors/vl/vl-merged together.json"),
      floors: {
        1: require("../../assets/indoors/vl/VL-1.svg"),
        2: require("../../assets/indoors/vl/VL-2.svg"),
      },
    },
  } as const;