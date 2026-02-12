import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import { describe, it, expect, vi, beforeAll } from "vitest";
import App from "../../src/client/App";

// Mock apiRequest to avoid network calls during test
vi.mock("../../src/client/utils/api", () => ({
  apiRequest: vi.fn().mockResolvedValue({ authenticated: false })
}));

// Mock Three.js to avoid WebGL errors
vi.mock("three", async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    WebGLRenderer: function(this: any) {
      this.setSize = vi.fn();
      this.setPixelRatio = vi.fn();
      this.setClearColor = vi.fn();
      this.render = vi.fn();
      this.domElement = document.createElement("canvas");
      this.dispose = vi.fn();
      this.shadowMap = { enabled: false };
      return new Proxy(this, {
        get: (target, prop) => {
          if (prop in target) return (target as any)[prop];
          return vi.fn();
        }
      });
    },
    Clock: function(this: any) {
      this.getDelta = vi.fn().mockReturnValue(0.016);
      this.getElapsedTime = vi.fn().mockReturnValue(0);
      this.start = vi.fn();
      this.stop = vi.fn();
    },
  };
});

describe("App Router Setup", () => {
  beforeAll(() => {
    // Mock localStorage
    const storageMock = (() => {
      let store: any = {};
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value.toString(); },
        clear: () => { store = {}; },
        removeItem: (key: string) => { delete store[key]; }
      };
    })();
    Object.defineProperty(window, 'localStorage', { value: storageMock });

    // Mock EventSource for JSDOM
    global.EventSource = class {
      addEventListener = vi.fn();
      close = vi.fn();
    } as any;
  });

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
