import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { PublicOnly } from "./AuthGuard";

vi.mock("../lib/auth", () => ({
  useAuth: () => ({ user: { id: "user-1" }, loading: false }),
}));

function renderAtLogin() {
  render(
    <MemoryRouter
      initialEntries={[
        { pathname: "/login", state: { from: "/sessions/new" } },
      ]}
    >
      <Routes>
        <Route element={<PublicOnly />}>
          <Route path="/login" element={<p>login</p>} />
        </Route>
        <Route path="/sessions/new" element={<p>new session</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PublicOnly", () => {
  it("returns an authenticated user to the page they were sent from", () => {
    renderAtLogin();
    expect(screen.getByText("new session")).toBeInTheDocument();
  });
});
