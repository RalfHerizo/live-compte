import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { mockSupabase, resetMockSupabase } from "./test-utils/supabaseMock";

vi.mock("/src/lib/supabaseClient.js", () => ({
  supabase: mockSupabase,
}));

beforeEach(() => {
  resetMockSupabase();
  sessionStorage.clear();
  vi.stubEnv("VITE_APP_TITLE", "Raoelison Compte");
  vi.stubEnv("VITE_ADMIN_EMAILS", "admin@test.com");
  vi.stubEnv("VITE_LOGIN_LOGO_URL", "/raoelison-logo.png");

  window.matchMedia = window.matchMedia || function matchMedia() {
    return {
      matches: false,
      media: "",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});
