import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import { describe, it, expect, vi } from "vitest";
import App from "../../src/client/App";

// Mock apiRequest to avoid network calls during test
vi.mock("../../src/client/utils/api", () => ({
  apiRequest: vi.fn().mockResolvedValue({ authenticated: false })
}));

describe("App Router Setup", () => {
  it("should render without throwing router errors", () => {
    const root = document.createElement("div");
    
    expect(() => {
      render(
        () => (
          <Router>
            <Route path="" component={App}>
               <Route path="/" component={() => <div>Home</div>} />
            </Route>
          </Router>
        ),
        root
      );
    }).not.toThrow();
  });
});
