# Implementation Plan

## Current Status

V0.1 through V0.7 are implemented to the levels recorded in the implementation history. V0.8 Phases A–D are implemented in code and verified in focused tests. The remaining V0.8 work is real-device acceptance, TestFlight validation, and real-world household validation. V0.9 should remain deferred until the V0.8 evidence is in hand.

## V0.8 — AI Integration & Real-World MVP

**Status:** Phases A–D complete in code; Phase E and Phase F outstanding.

### Goal

Complete the provider-neutral AI foundation and validate the end-to-end household loop in real use, while keeping inventory and persistence behaviour controlled by the application rather than by AI output.

The current strategic loop remains:

Food in the home -> understand the food -> suggest what to cook -> plan meals -> identify what needs to be bought -> assess whether prices look reasonable.

### Phase A — Production AI Foundation

**Status:** Complete.

The codebase now has a provider-neutral AI capability boundary, app-side gateway client, and server-side AI gateway. OpenAI credentials are kept server-side, configuration is environment-driven, and structured responses are validated before being returned to the application. Deterministic/mock providers remain available for development and regression protection.

### Phase B — Real Food Scan

**Status:** Complete in code; real-device acceptance outstanding.

The app uses `OpenAiFoodScanProvider` behind the food-scan provider boundary, and the request flows through the AI gateway to OpenAI. Images are sent through a structured request, food candidates are validated, and the existing review/edit/reject/confirm workflow remains in place. The AI does not directly mutate inventory; the application still confirms selected items before insertion.

Remaining work is primarily on-device validation: actual camera and photo-library acceptance, poor-image handling, user trust in candidate quality, and performance under real device conditions.

### Phase C — Real Recipe Suggestions

**Status:** Complete in code; real-world quality validation outstanding.

The app uses `OpenAiRecipeProvider` behind the recipe provider boundary, with inventory context passed through the AI gateway. Structured recipe results are validated before they are consumed by the application, and deterministic/mock recipe providers remain available for tests and fallback scenarios.

Remaining work is mainly quality and acceptance validation in realistic household usage, including whether generated recipes are useful, appropriate, and consistent with the user’s inventory and constraints.

### Phase D — AI-Assisted Meal Planning

**Status:** Complete in code; real-device acceptance outstanding.

The planner uses the gateway's dedicated `meal_planning` capability through the provider-neutral recipe boundary. The request includes serving count, planning days, meal type, expiry prioritisation, and use-soon inventory IDs. AI suggestions are still treated as candidates: the application validates them, reconciles ingredients locally, ranks them deterministically, and preserves replacement, review, persistence, versioning, and stale-plan safeguards.

Focused tests cover capability selection, planning-context propagation, malformed output rejection, deterministic ranking, replacement behaviour, persistence, and inventory immutability.

The key rule remains: AI proposes, the application validates, the user reviews, and the application persists.

### Phase E — TestFlight and Real Device

**Status:** Outstanding.

The application has not yet been proven through a physical iPhone/TestFlight workflow. This includes repeatable iOS build configuration, Apple signing and distribution, secure environment configuration for the AI gateway, camera/photo-library permissions, live connectivity from the device to the gateway, and validation of the core loop on a real device.

### Phase F — Real-World Validation

**Status:** Outstanding.

Use the application in realistic household scenarios and capture evidence on:

- food identification quality
- recipe usefulness and trust
- meal-plan coherence and variety
- shopping-list usefulness
- false assumptions and hallucinated outputs
- latency and cost
- edge cases and fallback quality
- UX confusion and user trust
- where deterministic logic is preferable to AI

### Architecture and Product Principles

- Inventory remains the source of truth for the household state.
- AI output is an input to application logic, not application state.
- The app remains local-first.
- OpenAI-specific behavior is isolated behind the provider-neutral boundary.
- Deterministic/mock providers remain available for tests and failure-mode validation.
- AI must not directly mutate inventory or persisted state.

### Later Roadmap

#### V0.9 — Nutrition / Deeper Intelligence

Future work after V0.8 validation: meal logging, calories, macro tracking, portions, and nutrition-aware recipe analysis.

#### Later features

- Rehabit integration
- retailer or marketplace integrations
- broader product catalog work
- inflation and basket intelligence
- accounts and synchronisation if justified by demand

These items remain future and should not be planned in depth until V0.8 evidence supports them.

---

## Suggested Next Step Order

1. Establish the true mobile device acceptance path through TestFlight.
2. Run the real-world validation pass against household scenarios.
3. Measure AI quality, latency, cost, and failure recovery in realistic conditions.
4. Only then decide whether to expand V0.9 or continue with V0.8 refinement.

---

## Deferred Decisions

- broader cloud/backend infrastructure is not required for the current V0.8 scope
- provider expansion beyond OpenAI is not required for the current roadmap
- account-based or cloud sync features remain out of scope unless a concrete requirement emerges
- detailed nutrition tracking remains deferred until after V0.8 validation

- AI never becomes the source of truth.
- AI output is an input to application logic, not application state.
- User confirmation remains required for consequential mutations where appropriate.
- Services remain responsible for domain and application behaviour.
- Providers remain responsible for external integrations.
- OpenAI-specific details remain behind the provider-neutral boundary.
- AI responses must be validated before use.
- Mock providers remain usable for deterministic tests and development.
- Shopping, recipe and price workflows must not silently mutate inventory.
- Product identity remains conservative and evidence-based.
- Observed price, reference price, historical movement, volatility and inflation remain distinct concepts.
- Local-first remains the default.
- A small server-side AI gateway is introduced specifically to protect credentials and provide controlled AI access, not to migrate the whole application to a backend.
- External services must be evaluated for security, privacy, reliability, cost and terms.
- Unnecessary AI prompts, images and provider responses should not be stored.
- Infrastructure that V0.8 does not need should not be built.

