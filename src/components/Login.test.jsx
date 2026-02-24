import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import Login from "./Login";
import {
  PASSWORD_CHANGE_RELOGIN_NOTICE,
  PASSWORD_CHANGE_RELOGIN_NOTICE_KEY,
} from "../constants/auth";

describe("Login", () => {
  it("toggles password visibility when clicking the eye button", async () => {
    const user = userEvent.setup();
    render(<Login />);

    const passwordInput = screen.getByLabelText(/^mot de passe$/i, {
      selector: "input",
    });
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: /afficher le mot de passe/i }));
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: /masquer le mot de passe/i }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("shows reconnect notice when redirected after password update", () => {
    sessionStorage.setItem(
      PASSWORD_CHANGE_RELOGIN_NOTICE_KEY,
      PASSWORD_CHANGE_RELOGIN_NOTICE
    );

    render(<Login />);

    expect(
      screen.getByText(/veuillez vous reconnectez avec votre nouveau mot de passe\./i)
    ).toBeInTheDocument();
    expect(sessionStorage.getItem(PASSWORD_CHANGE_RELOGIN_NOTICE_KEY)).toBeNull();
  });
});
