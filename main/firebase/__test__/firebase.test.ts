/**
 * Tests for firebase/firebase.ts initialization logic.
 *
 * The module runs auth setup at import time, so each test uses
 * jest.isolateModules() + jest.doMock() to load a fresh copy with
 * controlled mocks and verify the try/catch auth-persistence paths.
 */

describe("firebase/firebase.ts – auth initialization", () => {
  afterEach(() => {
    jest.resetModules();
  });

  it("exports auth obtained from initializeAuth (happy path)", () => {
    let capturedAuth: any;

    jest.isolateModules(() => {
      const mockAuthInstance = { _type: "initializeAuth-instance" };

      jest.doMock("firebase/app", () => ({
        initializeApp: jest.fn().mockReturnValue({}),
        getApps: jest.fn().mockReturnValue([]), // no existing app → initializeApp called
        getApp: jest.fn(),
      }));

      jest.doMock("firebase/auth", () => ({
        initializeAuth: jest.fn().mockReturnValue(mockAuthInstance),
        getAuth: jest.fn(),
        // The module imports types only; nothing else from firebase/auth is called
      }));

      jest.doMock("@firebase/auth", () => ({
        getReactNativePersistence: jest
          .fn()
          .mockReturnValue("mock-rn-persistence"),
      }));

      jest.doMock("firebase/firestore", () => ({
        getFirestore: jest.fn().mockReturnValue({}),
      }));

      jest.doMock("@react-native-async-storage/async-storage", () => ({
        default: "MockAsyncStorage",
        __esModule: true,
      }));

      jest.doMock("expo-constants", () => ({
        default: { expoConfig: { extra: {} } },
        __esModule: true,
      }));

      const firebaseModule = require("@/firebase/firebase");
      capturedAuth = firebaseModule.auth;
    });

    expect(capturedAuth).toEqual({ _type: "initializeAuth-instance" });
  });

  it("falls back to getAuth when initializeAuth throws (already-initialized path)", () => {
    let capturedAuth: any;

    jest.isolateModules(() => {
      const mockFallbackAuth = { _type: "getAuth-fallback" };

      jest.doMock("firebase/app", () => ({
        initializeApp: jest.fn().mockReturnValue({}),
        getApps: jest.fn().mockReturnValue([]),
        getApp: jest.fn(),
      }));

      jest.doMock("firebase/auth", () => ({
        initializeAuth: jest.fn().mockImplementation(() => {
          throw new Error("Auth already initialized for this app");
        }),
        getAuth: jest.fn().mockReturnValue(mockFallbackAuth),
      }));

      jest.doMock("@firebase/auth", () => ({
        getReactNativePersistence: jest
          .fn()
          .mockReturnValue("mock-rn-persistence"),
      }));

      jest.doMock("firebase/firestore", () => ({
        getFirestore: jest.fn().mockReturnValue({}),
      }));

      jest.doMock("@react-native-async-storage/async-storage", () => ({
        default: "MockAsyncStorage",
        __esModule: true,
      }));

      jest.doMock("expo-constants", () => ({
        default: { expoConfig: { extra: {} } },
        __esModule: true,
      }));

      const firebaseModule = require("@/firebase/firebase");
      capturedAuth = firebaseModule.auth;
    });

    expect(capturedAuth).toEqual({ _type: "getAuth-fallback" });
  });

  it("uses existing Firebase app when one is already initialised", () => {
    let initializeAppCalled = false;

    jest.isolateModules(() => {
      const existingApp = { _existing: true };

      jest.doMock("firebase/app", () => ({
        initializeApp: jest.fn().mockImplementation(() => {
          initializeAppCalled = true;
          return {};
        }),
        getApps: jest.fn().mockReturnValue([existingApp]), // app already exists
        getApp: jest.fn().mockReturnValue(existingApp),
      }));

      jest.doMock("firebase/auth", () => ({
        initializeAuth: jest.fn().mockReturnValue({}),
        getAuth: jest.fn(),
      }));

      jest.doMock("@firebase/auth", () => ({
        getReactNativePersistence: jest.fn().mockReturnValue("persistence"),
      }));

      jest.doMock("firebase/firestore", () => ({
        getFirestore: jest.fn().mockReturnValue({}),
      }));

      jest.doMock("@react-native-async-storage/async-storage", () => ({
        default: "MockAsyncStorage",
        __esModule: true,
      }));

      jest.doMock("expo-constants", () => ({
        default: { expoConfig: { extra: {} } },
        __esModule: true,
      }));

      require("@/firebase/firebase");
    });

    expect(initializeAppCalled).toBe(false);
  });

  it("exports a Firestore db instance", () => {
    let capturedDb: any;

    jest.isolateModules(() => {
      const mockDb = { _type: "firestore-instance" };

      jest.doMock("firebase/app", () => ({
        initializeApp: jest.fn().mockReturnValue({}),
        getApps: jest.fn().mockReturnValue([]),
        getApp: jest.fn(),
      }));

      jest.doMock("firebase/auth", () => ({
        initializeAuth: jest.fn().mockReturnValue({}),
        getAuth: jest.fn(),
      }));

      jest.doMock("@firebase/auth", () => ({
        getReactNativePersistence: jest.fn().mockReturnValue("persistence"),
      }));

      jest.doMock("firebase/firestore", () => ({
        getFirestore: jest.fn().mockReturnValue(mockDb),
      }));

      jest.doMock("@react-native-async-storage/async-storage", () => ({
        default: "MockAsyncStorage",
        __esModule: true,
      }));

      jest.doMock("expo-constants", () => ({
        default: { expoConfig: { extra: {} } },
        __esModule: true,
      }));

      const firebaseModule = require("@/firebase/firebase");
      capturedDb = firebaseModule.db;
    });

    expect(capturedDb).toEqual({ _type: "firestore-instance" });
  });
});
