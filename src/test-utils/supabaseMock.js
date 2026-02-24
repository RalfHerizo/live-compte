import { vi } from "vitest";

const state = {
  session: null,
  transactions: [],
  signInError: null,
  updateUserError: null,
  selectError: null,
  insertError: null,
  deleteError: null,
  idCounter: 1000,
};

const listeners = new Set();

export const getOrderSpy = vi.fn(async () => {
  if (state.selectError) return { data: null, error: state.selectError };
  return { data: [...state.transactions], error: null };
});

export const getInsertSpy = vi.fn((rows) => {
  if (state.insertError) {
    return {
      select: vi.fn(async () => ({ data: null, error: state.insertError })),
    };
  }

  const insertedRows = rows.map((row) => ({
    id: state.idCounter++,
    ...row,
  }));
  state.transactions = [...state.transactions, ...insertedRows];

  return {
    select: vi.fn(async () => ({ data: insertedRows, error: null })),
  };
});

export const getDeleteInSpy = vi.fn(async (_column, ids) => {
  if (state.deleteError) return { error: state.deleteError };
  const idsToDelete = new Set(ids);
  state.transactions = state.transactions.filter((row) => !idsToDelete.has(row.id));
  return { error: null };
});

const fromSpy = vi.fn((table) => {
  if (table !== "transactions") {
    throw new Error(`Unexpected table access in tests: ${table}`);
  }

  return {
    select: vi.fn(() => ({
      order: getOrderSpy,
    })),
    insert: getInsertSpy,
    delete: vi.fn(() => ({
      in: getDeleteInSpy,
    })),
  };
});

export const mockSupabase = {
  auth: {
    getSession: vi.fn(async () => ({ data: { session: state.session } })),
    onAuthStateChange: vi.fn((callback) => {
      listeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => listeners.delete(callback),
          },
        },
      };
    }),
    signOut: vi.fn(async () => {
      state.session = null;
      listeners.forEach((callback) => callback("SIGNED_OUT", null));
      return { error: null };
    }),
    signInWithPassword: vi.fn(async () => ({ error: state.signInError })),
    updateUser: vi.fn(async () => ({ error: state.updateUserError })),
  },
  from: fromSpy,
};

export const setMockSession = (session) => {
  state.session = session;
};

export const setMockTransactions = (transactions) => {
  state.transactions = [...transactions];
};

export const setMockSignInError = (message) => {
  state.signInError = message ? { message } : null;
};

export const setMockUpdateUserError = (message) => {
  state.updateUserError = message ? { message } : null;
};

export const resetMockSupabase = () => {
  state.session = null;
  state.transactions = [];
  state.signInError = null;
  state.updateUserError = null;
  state.selectError = null;
  state.insertError = null;
  state.deleteError = null;
  state.idCounter = 1000;
  listeners.clear();
  vi.clearAllMocks();
};
