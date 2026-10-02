import { describe, expect, it } from "vitest";
import {
  broadcastStatusConfig,
  getBroadcastStatus,
  getRecipientStatus,
  recipientStatusConfig,
  isPausedError,
  isPausedRecipient,
} from "./broadcast-status";

describe("getBroadcastStatus", () => {
  it("returns the matching config for known statuses", () => {
    expect(getBroadcastStatus("sending")).toBe(broadcastStatusConfig.sending);
    expect(getBroadcastStatus("sent")).toBe(broadcastStatusConfig.sent);
    expect(getBroadcastStatus("failed")).toBe(broadcastStatusConfig.failed);
    expect(getBroadcastStatus("paused")).toBe(broadcastStatusConfig.paused);
  });

  it("flags `sending` as a live/pulsing state", () => {
    expect(getBroadcastStatus("sending").pulse).toBe(true);
    expect(getBroadcastStatus("sent").pulse).toBeFalsy();
    expect(getBroadcastStatus("paused").pulse).toBeFalsy();
  });

  it("falls back to draft on an unknown status string", () => {
    expect(getBroadcastStatus("not-a-real-status")).toBe(
      broadcastStatusConfig.draft,
    );
    expect(getBroadcastStatus("")).toBe(broadcastStatusConfig.draft);
  });

  it("each variant has the dark-theme class triple", () => {
    // Accept both fixed-shade Tailwind names (bg-red-500/10) and
    // token-backed names without a shade number (bg-primary/10) since
    // the brand-accent statuses now ride the active color theme.
    for (const v of Object.values(broadcastStatusConfig)) {
      expect(v.classes).toMatch(/bg-[a-z]+(-\d+)?\/10/);
      expect(v.classes).toMatch(/text-[a-z]+(-\d+)?/);
      expect(v.classes).toMatch(/border-[a-z]+(-\d+)?\/20/);
    }
  });
});

describe("getRecipientStatus", () => {
  it("returns the matching config for known statuses", () => {
    expect(getRecipientStatus("delivered")).toBe(
      recipientStatusConfig.delivered,
    );
    expect(getRecipientStatus("read")).toBe(recipientStatusConfig.read);
    expect(getRecipientStatus("paused")).toBe(recipientStatusConfig.paused);
  });

  it("falls back to pending on an unknown status string", () => {
    expect(getRecipientStatus("???")).toBe(recipientStatusConfig.pending);
  });
});

describe("isPausedError", () => {
  it("detects paused error phrases and codes", () => {
    expect(isPausedError("Template is paused by Meta")).toBe(true);
    expect(isPausedError("template was paused")).toBe(true);
    expect(isPausedError("Meta error: 132015")).toBe(true);
    expect(isPausedError("Campaign paused by user")).toBe(true);
  });

  it("returns false for non-paused errors or missing values", () => {
    expect(isPausedError("Invalid phone number")).toBe(false);
    expect(isPausedError("Payment required")).toBe(false);
    expect(isPausedError(null)).toBe(false);
    expect(isPausedError(undefined)).toBe(false);
    expect(isPausedError("")).toBe(false);
  });
});

describe("isPausedRecipient", () => {
  it("returns true for status = 'paused'", () => {
    expect(isPausedRecipient({ status: "paused" })).toBe(true);
  });

  it("returns true for status = 'failed' with pause error", () => {
    expect(
      isPausedRecipient({
        status: "failed",
        error_message: "Template is paused",
      }),
    ).toBe(true);
    expect(
      isPausedRecipient({
        status: "failed",
        error_message: "Error code 132015",
      }),
    ).toBe(true);
  });

  it("returns false for non-paused recipients", () => {
    expect(
      isPausedRecipient({
        status: "failed",
        error_message: "Invalid recipient",
      }),
    ).toBe(false);
    expect(isPausedRecipient({ status: "sent" })).toBe(false);
    expect(isPausedRecipient({ status: "delivered" })).toBe(false);
    expect(isPausedRecipient(null)).toBe(false);
    expect(isPausedRecipient({})).toBe(false);
  });
});

