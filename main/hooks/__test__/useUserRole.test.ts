// Unmock the global stub set in jest.setup.js so we can test the real hook.
jest.unmock("@/hooks/useUserRole");

// Mock firebase dependencies to avoid ESM parse errors in Jest.
jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn().mockReturnValue({}),
  onSnapshot: jest.fn(),
}));

jest.mock("@/firebase/firebase", () => ({
  auth: {},
  db: {},
}));

import { renderHook, act } from "@testing-library/react-native";
import { onAuthStateChanged } from "firebase/auth";
import { onSnapshot } from "firebase/firestore";
import { useUserRole, isShuttleEligible } from "@/hooks/useUserRole";

// ─── isShuttleEligible ────────────────────────────────────────────────────────

describe("isShuttleEligible", () => {
  it("returns true for 'student'", () => {
    expect(isShuttleEligible("student")).toBe(true);
  });

  it("returns true for 'staff'", () => {
    expect(isShuttleEligible("staff")).toBe(true);
  });

  it("returns false for 'visitor'", () => {
    expect(isShuttleEligible("visitor")).toBe(false);
  });
});

// ─── useUserRole ──────────────────────────────────────────────────────────────

describe("useUserRole", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (onAuthStateChanged as jest.Mock).mockReturnValue(jest.fn()); // default unsub
    (onSnapshot as jest.Mock).mockReturnValue(jest.fn()); // default unsub
  });

  it("starts with role='visitor' and loading=true", () => {
    // Keep auth callback pending
    (onAuthStateChanged as jest.Mock).mockImplementation(() => jest.fn());

    const { result } = renderHook(() => useUserRole());

    expect(result.current.role).toBe("visitor");
    expect(result.current.loading).toBe(true);
  });

  it("sets role='visitor' and loading=false when not signed in", () => {
    (onAuthStateChanged as jest.Mock).mockImplementation((_, cb) => {
      cb(null); // not signed in
      return jest.fn();
    });

    const { result } = renderHook(() => useUserRole());

    expect(result.current.role).toBe("visitor");
    expect(result.current.loading).toBe(false);
  });

  it("sets role='student' from Firestore when signed in", () => {
    (onAuthStateChanged as jest.Mock).mockImplementation((_, cb) => {
      cb({ uid: "user-123" });
      return jest.fn();
    });

    (onSnapshot as jest.Mock).mockImplementation((_, onNext) => {
      onNext({ data: () => ({ role: "student" }) });
      return jest.fn();
    });

    const { result } = renderHook(() => useUserRole());

    expect(result.current.role).toBe("student");
    expect(result.current.loading).toBe(false);
  });

  it("sets role='staff' from Firestore when signed in", () => {
    (onAuthStateChanged as jest.Mock).mockImplementation((_, cb) => {
      cb({ uid: "user-456" });
      return jest.fn();
    });

    (onSnapshot as jest.Mock).mockImplementation((_, onNext) => {
      onNext({ data: () => ({ role: "staff" }) });
      return jest.fn();
    });

    const { result } = renderHook(() => useUserRole());

    expect(result.current.role).toBe("staff");
    expect(result.current.loading).toBe(false);
  });

  it("normalises role case-insensitively (STUDENT → student)", () => {
    (onAuthStateChanged as jest.Mock).mockImplementation((_, cb) => {
      cb({ uid: "user-789" });
      return jest.fn();
    });

    (onSnapshot as jest.Mock).mockImplementation((_, onNext) => {
      onNext({ data: () => ({ role: "STUDENT" }) });
      return jest.fn();
    });

    const { result } = renderHook(() => useUserRole());

    expect(result.current.role).toBe("student");
  });

  it("normalises role case-insensitively (Staff → staff)", () => {
    (onAuthStateChanged as jest.Mock).mockImplementation((_, cb) => {
      cb({ uid: "user-abc" });
      return jest.fn();
    });

    (onSnapshot as jest.Mock).mockImplementation((_, onNext) => {
      onNext({ data: () => ({ role: "Staff" }) });
      return jest.fn();
    });

    const { result } = renderHook(() => useUserRole());

    expect(result.current.role).toBe("staff");
  });

  it("falls back to 'visitor' for unknown role values", () => {
    (onAuthStateChanged as jest.Mock).mockImplementation((_, cb) => {
      cb({ uid: "user-unknown" });
      return jest.fn();
    });

    (onSnapshot as jest.Mock).mockImplementation((_, onNext) => {
      onNext({ data: () => ({ role: "admin" }) });
      return jest.fn();
    });

    const { result } = renderHook(() => useUserRole());

    expect(result.current.role).toBe("visitor");
    expect(result.current.loading).toBe(false);
  });

  it("falls back to 'visitor' when role field is missing from Firestore doc", () => {
    (onAuthStateChanged as jest.Mock).mockImplementation((_, cb) => {
      cb({ uid: "user-nf" });
      return jest.fn();
    });

    (onSnapshot as jest.Mock).mockImplementation((_, onNext) => {
      onNext({ data: () => ({}) }); // no role field
      return jest.fn();
    });

    const { result } = renderHook(() => useUserRole());

    expect(result.current.role).toBe("visitor");
  });

  it("falls back to 'visitor' when Firestore snapshot fails", () => {
    (onAuthStateChanged as jest.Mock).mockImplementation((_, cb) => {
      cb({ uid: "user-err" });
      return jest.fn();
    });

    (onSnapshot as jest.Mock).mockImplementation((_, _onNext, onError) => {
      onError(new Error("Firestore unreachable"));
      return jest.fn();
    });

    const { result } = renderHook(() => useUserRole());

    expect(result.current.role).toBe("visitor");
    expect(result.current.loading).toBe(false);
  });

  it("cleans up Firestore listener when user signs out", () => {
    const unsubDoc = jest.fn();
    const unsubAuth = jest.fn();
    let authCallback: ((user: any) => void) | null = null;

    (onAuthStateChanged as jest.Mock).mockImplementation((_, cb) => {
      authCallback = cb;
      return unsubAuth;
    });

    (onSnapshot as jest.Mock).mockReturnValue(unsubDoc);

    const { result } = renderHook(() => useUserRole());

    // Sign in
    act(() => {
      authCallback!({ uid: "user-cleanup" });
    });

    // Now sign out — a second call to the auth callback with null
    act(() => {
      authCallback!(null);
    });

    // The Firestore listener from the sign-in should have been cleaned up
    expect(unsubDoc).toHaveBeenCalled();
    expect(result.current.role).toBe("visitor");
  });

  it("unsubscribes both auth and Firestore listeners on unmount", () => {
    const unsubDoc = jest.fn();
    const unsubAuth = jest.fn();

    (onAuthStateChanged as jest.Mock).mockImplementation((_, cb) => {
      cb({ uid: "user-mount" });
      return unsubAuth;
    });

    (onSnapshot as jest.Mock).mockReturnValue(unsubDoc);

    const { unmount } = renderHook(() => useUserRole());

    unmount();

    expect(unsubAuth).toHaveBeenCalled();
    expect(unsubDoc).toHaveBeenCalled();
  });
});
