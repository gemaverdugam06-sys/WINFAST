import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { validateSupportTicketInput, sanitizeSupportText } from "../src/lib/support-validation.ts";

describe("support validation", () => {
  it("rejects empty required fields", () => {
    const result = validateSupportTicketInput({
      userId: "123e4567-e89b-12d3-a456-426614174000",
      name: "",
      email: "",
      category: "problema_tecnico",
      subject: "",
      description: "",
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 4);
  });

  it("sanitizes malicious text before submission", () => {
    const sanitized = sanitizeSupportText("<script>alert(1)</script> Necesito ayuda <b>rápido</b>");
    assert.equal(sanitized, "Necesito ayuda rápido");
  });

  it("accepts a valid ticket payload", () => {
    const result = validateSupportTicketInput({
      userId: "123e4567-e89b-12d3-a456-426614174000",
      name: "Ana López",
      email: "ana@example.com",
      category: "cuenta",
      subject: "Problema con acceso",
      description: "No puedo entrar a mi cuenta desde el móvil.",
    });

    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });
});
