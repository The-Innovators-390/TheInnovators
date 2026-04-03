import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/firebase/firebase";

export type UserRole = "student" | "staff" | "visitor";

type State = {
  role: UserRole;
  /** true while the initial auth + Firestore read is in flight */
  loading: boolean;
};

const ELIGIBLE_ROLES = new Set<UserRole>(["student", "staff"]);

export function isShuttleEligible(role: UserRole): boolean {
  return ELIGIBLE_ROLES.has(role);
}

/**
 * Resolves the signed-in user's role from `users/{uid}` in Firestore.
 *
 * - Not signed in → "visitor"
 * - Document missing or no `role` field → "visitor"
 * - Firestore unavailable → "visitor" (fail-safe)
 * - role === "student" | "staff" → returned as-is (case-insensitive)
 *
 * Uses onSnapshot so Firestore role changes propagate in real time without
 * requiring an app reload.
 */
export function useUserRole(): State {
  const [state, setState] = useState<State>({ role: "visitor", loading: true });

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Clean up any existing Firestore listener when auth state changes
      unsubscribeDoc?.();
      unsubscribeDoc = null;

      if (!user) {
        setState({ role: "visitor", loading: false });
        return;
      }

      unsubscribeDoc = onSnapshot(
        doc(db, "users", user.uid),
        (snap) => {
          const raw = snap.data()?.role;
          const normalized =
            typeof raw === "string" ? raw.toLowerCase().trim() : "";
          const role: UserRole =
            normalized === "student" || normalized === "staff"
              ? (normalized as UserRole)
              : "visitor";
          setState({ role, loading: false });
        },
        () => {
          // Firestore unreachable — default to visitor so the app never crashes
          setState({ role: "visitor", loading: false });
        },
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDoc?.();
    };
  }, []);

  return state;
}
