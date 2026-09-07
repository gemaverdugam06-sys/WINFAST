import assert from "node:assert/strict";
import test from "node:test";

import { getSignupStatusMessage, getSignupStatusVariant } from "../src/lib/auth-email.ts";

test("signup with email confirmation required returns clear verification guidance", () => {
  const message = getSignupStatusMessage({ hasSession: false, emailConfirmed: false });
  assert.match(message, /Revisa tu correo/i);
  assert.equal(getSignupStatusVariant({ hasSession: false, emailConfirmed: false }), "email-verification-required");
});

test("signup with active session returns login success", () => {
  const message = getSignupStatusMessage({ hasSession: true, emailConfirmed: true });
  assert.match(message, /inicio de ses/i);
  assert.equal(getSignupStatusVariant({ hasSession: true, emailConfirmed: true }), "success");
});
