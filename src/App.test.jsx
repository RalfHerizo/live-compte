import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { getDeleteInSpy, getInsertSpy, setMockSession, setMockTransactions } from "./test-utils/supabaseMock";

const adminSession = {
  user: {
    email: "admin@test.com",
  },
};

const viewerSession = {
  user: {
    email: "viewer@test.com",
  },
};

const baseTransactions = [
  { id: 1, date: "2026-01-01", libelle: "VENTE A", recette: 100000, depense: 0 },
  { id: 2, date: "2026-01-02", libelle: "ACHAT A", recette: 0, depense: 40000 },
  { id: 3, date: "2026-01-03", libelle: "VENTE B", recette: 25000, depense: 0 },
];

const renderDashboard = async () => {
  const result = render(<App />);
  await screen.findByText(/Gestion trésorerie en temps réel/i);
  return result;
};

describe("App - Business and critical flows", () => {
  it("displays exact final balance for +100000 and -40000 transactions", async () => {
    setMockSession(adminSession);
    setMockTransactions(baseTransactions.slice(0, 2));

    await renderDashboard();
    await screen.findByText(/VENTE A/i);

    expect(screen.getAllByText(/60[\s,\u202f]000\s*€/i).length).toBeGreaterThan(0);
  });

  it("formats local date and large numbers with thousand separators", async () => {
    setMockSession(adminSession);
    setMockTransactions([
      {
        id: 1,
        date: "2026-02-10",
        libelle: "VERY BIG ENTRY",
        recette: 1234567,
        depense: 0,
      },
    ]);

    await renderDashboard();
    await screen.findByText(/VERY BIG ENTRY/i);

    expect(screen.getByText("10/02/2026")).toBeInTheDocument();
    expect(screen.getAllByText(/1[\s,\u202f]234[\s,\u202f]567\s*€/i).length).toBeGreaterThan(0);
  });

  it("opens and closes the delete confirmation modal without deleting on cancel", async () => {
    const user = userEvent.setup();
    setMockSession(adminSession);
    setMockTransactions(baseTransactions.slice(0, 1));

    await renderDashboard();
    await screen.findByText(/VENTE A/i);

    const deleteButtons = await screen.findAllByRole("button", {
      name: /^supprimer$/i,
    });
    await user.click(deleteButtons[0]);
    expect(screen.getByText(/Confirmer la suppression/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Annuler/i }));
    await waitFor(() =>
      expect(screen.queryByText(/Confirmer la suppression/i)).not.toBeInTheDocument()
    );

    expect(getDeleteInSpy).not.toHaveBeenCalled();
  });

  it("shows add and delete actions for admin role", async () => {
    setMockSession(adminSession);
    setMockTransactions(baseTransactions);

    await renderDashboard();
    await screen.findByText(/VENTE A/i);

    expect(screen.getByText(/Nouvelle opération/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^supprimer$/i }).length).toBeGreaterThan(0);
  });

  it("hides admin actions for viewer role and expands table width", async () => {
    setMockSession(viewerSession);
    setMockTransactions(baseTransactions);

    const { container } = await renderDashboard();

    expect(screen.queryByText(/Nouvelle opération/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^supprimer$/i })).not.toBeInTheDocument();

    const mainElement = container.querySelector("main");
    expect(mainElement).not.toBeNull();
    expect(mainElement.className).toContain("lg:col-span-4");
  });

  it("submits add transaction form and calls Supabase insert with normalized values", async () => {
    const user = userEvent.setup();
    setMockSession(adminSession);
    setMockTransactions(baseTransactions);

    await renderDashboard();
    await screen.findByText(/VENTE A/i);

    await user.type(screen.getByPlaceholderText(/Vente de marchandise/i), "vente test");
    await user.type(screen.getAllByPlaceholderText("0")[0], "100000");
    await user.click(screen.getByRole("button", { name: /Ajouter/i }));

    await waitFor(() => expect(getInsertSpy).toHaveBeenCalledTimes(1));

    const insertedPayload = getInsertSpy.mock.calls[0][0][0];
    expect(insertedPayload).toMatchObject({
      libelle: "VENTE TEST",
      recette: 100000,
      depense: 0,
    });
  });

  it("shows bulk delete count when three rows are selected", async () => {
    const user = userEvent.setup();
    setMockSession(adminSession);
    setMockTransactions(baseTransactions);

    await renderDashboard();
    await screen.findByText(/VENTE A/i);

    await user.click(screen.getByLabelText(/Sélectionner VENTE A/i));
    await user.click(screen.getByLabelText(/Sélectionner ACHAT A/i));
    await user.click(screen.getByLabelText(/Sélectionner VENTE B/i));

    expect(screen.getByRole("button", { name: /Supprimer \(3\)/i })).toBeInTheDocument();
  });

  it("does not crash when deleting a row after confirmation", async () => {
    const user = userEvent.setup();
    setMockSession(adminSession);
    setMockTransactions(baseTransactions.slice(0, 1));

    await renderDashboard();
    await screen.findByText(/VENTE A/i);

    const deleteButtons = await screen.findAllByRole("button", {
      name: /^supprimer$/i,
    });
    await user.click(deleteButtons[0]);
    const modalTitle = await screen.findByText(/Confirmer la suppression/i);
    const modalRoot = modalTitle.closest(".w-full.max-w-md");
    expect(modalRoot).not.toBeNull();
    await user.click(within(modalRoot).getByRole("button", { name: /^Supprimer$/i }));

    await waitFor(() => expect(getDeleteInSpy).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Confirmer la suppression/i)).not.toBeInTheDocument();
  });
});
