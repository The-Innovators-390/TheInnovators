import { findRoomNode } from "../indoorNavigationMapping";
import { indoorData } from "@/components/indoors/indoorData";

jest.mock("@/components/indoors/indoorData", () => ({
  indoorData: {
    H: {
      nodes: [
        { id: "h1", type: "room", label: "820" },
        { id: "h2", type: "room", label: "H-821" },
        { id: "h3", type: "stairs", label: "Stairs" },
      ],
    },
  },
}));

describe("indoorNavigationMapping", () => {
  describe("findRoomNode", () => {
    it("returns null if building data is missing", () => {
      expect(findRoomNode("INVALID", "820")).toBeNull();
    });

    it("returns null if building has no nodes", () => {
      (indoorData as any).EMPTY = { nodes: [] };
      expect(findRoomNode("EMPTY", "820")).toBeNull();
    });

    it("finds an exact match", () => {
      const node = findRoomNode("H", "820");
      expect(node).not.toBeNull();
      expect(node?.id).toBe("h1");
    });

    it("finds a case-insensitive exact match", () => {
      const node = findRoomNode("H", " 820 ");
      expect(node).not.toBeNull();
      expect(node?.id).toBe("h1");
    });

    it("finds a partial match", () => {
      const node = findRoomNode("H", "821");
      expect(node).not.toBeNull();
      expect(node?.id).toBe("h2");
    });

    it("prefers exact match over partial match", () => {
      (indoorData as any).H.nodes.push({ id: "h4", type: "room", label: "82" });
      // "82" is an exact match for "82", while "820" and "H-821" are partial.
      const node = findRoomNode("H", "82");
      expect(node?.id).toBe("h4");
    });

    it("returns null if no matching room is found", () => {
      expect(findRoomNode("H", "999")).toBeNull();
    });

    it("ignores non-room nodes even if label matches", () => {
      expect(findRoomNode("H", "Stairs")).toBeNull();
    });
  });
});
