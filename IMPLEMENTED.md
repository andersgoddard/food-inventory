# Implemented History

This is the concise historical record of functionality that exists and has been verified in the codebase.

## V0.1 — Household Inventory Foundation

**Status:** Substantially implemented; final manual and native verification outstanding.

### Delivered
- add, edit, delete, search and filter inventory items
- category, location, quantity, unit, purchase date and expiry handling
- dashboard and use-soon/expiry views
- local persistence and validation feedback

### Verification
- inventory CRUD and validation tests
- inventory filtering and expiry tests
- Jest coverage for local inventory behaviour

## V0.2 — Food Scan Intake

**Status:** Mock workflow implemented historically; the current app uses the OpenAI-backed provider.

### Delivered
- photo selection from the camera or library
- reviewable candidate flows
- edit/reject/confirm behaviour before adding items to inventory

### Architecture
- provider boundary remains separate from the inventory service
- current implementation uses the AI-backed food-scan provider in the app hook

### Verification
- mock provider tests existed historically
- current OpenAI food-scan provider tests pass

## V0.3 — Receipt Scan and Purchase Intake

**Status:** Mock workflow implemented historically.

### Delivered
- receipt photo intake and review flow
- metadata and line review
- acceptance of receipt-derived inventory additions

### Verification
- receipt provider tests and related validation tests

## V0.4 — Recipe Suggestions

**Status:** Mock workflow implemented historically; the current app uses the OpenAI-backed provider.

### Delivered
- inventory-aware recipe suggestion flow
- saved-recipe behaviour
- deterministic mock provider for the prior implementation

### Verification
- mock recipe provider tests existed historically
- current OpenAI recipe provider tests pass

## V0.5 — Smart Weekly Meal Planner

**Status:** Implemented and web-accepted.

### Delivered
- validated meal-planning preferences
- deterministic meal-plan generation from inventory snapshots
- saved plans, replacement logic and stale-plan detection
- persistence and replacement flow

### Verification
- meal-planning service and persistence tests
- presentation and lifecycle tests

## V0.6 — Smart Shopping List

**Status:** Implemented MVP.

### Delivered
- inventory-aware shopping list generation
- needed/purchased/skipped states
- shopping-list persistence and reopening
- conservative inventory matching and price awareness

## V0.7 — Price Intelligence

**Status:** Implemented MVP.

### Delivered
- supported-unit price normalization
- comparison-based buy/wait guidance
- stored observations and recommendation flow

## V0.8 — AI Integration & Real-World MVP

**Status:** Phases A–E implemented/achieved for the initial TestFlight milestone; real-world validation outstanding.

### Phase A — Production AI Foundation
**Delivered**
- provider-neutral AI capability boundary exists
- app uses an AI gateway/client rather than coupling domain logic directly to OpenAI
- server-side AI gateway exists
- gateway supports managed-host `PORT` configuration and local `.env` startup
- `/v1/ai` is protected by a server-side bearer token while `/health` remains public
- browser CORS is restricted to configured origins with preflight handling
- OpenAI credentials are kept server-side
- model/provider configuration is environment-driven
- structured AI responses are validated before returning to the application
- deterministic/mock providers remain available for tests and failure-mode validation
- gateway/provider tests exist and pass
- local gateway health check and sample AI request have been exercised successfully
- web and TestFlight clients use the deployed HTTPS gateway URL through public client configuration

### Phase B — Real Food Scan
**Delivered**
- `OpenAiFoodScanProvider` is used in the app hook
- image payloads are sent through the gateway
- structured candidate results are returned and validated
- the existing review/edit/reject/confirm workflow remains intact
- inventory mutation still happens only after explicit confirmation
- AI provider tests and gateway tests pass

### Receipt Scan — OpenAI-backed intake
**Delivered**
- receipt scanning uses `OpenAiReceiptScanProvider` instead of the historical mock provider
- receipt images flow through the authenticated gateway using `receipt_scan`
- receipt metadata and line candidates are schema-validated before review
- receipt lines retain the existing edit/skip/confirm workflow

### Phase C — Real Recipe Suggestions
**Delivered**
- `OpenAiRecipeProvider` is used in the app hook
- inventory context is passed through the gateway
- structured recipe results are validated before use
- existing application/domain validation remains in control of the result
- deterministic/mock recipe providers remain available
- OpenAI recipe provider tests pass
- generated recipe titles can be opened to review the full method and ingredient availability

### Phase D — AI-Assisted Meal Planning
**Status:** Complete in code; exercised in the initial TestFlight milestone

**Delivered**
- planner hook uses the gateway's dedicated `meal_planning` capability
- planning requests include people, days, meal type, expiry prioritisation, and use-soon inventory IDs
- AI candidates are validated and reconciled against local inventory before planning use
- deterministic ranking, duplicate exclusion, replacement, review, persistence, versioning, and stale-plan safeguards remain active
- malformed AI output and provider failures cannot create or mutate an invalid plan
- focused Phase D tests pass, including provider capability selection and planning-context propagation
- planner preferences support multiple meal types, include/exclude ingredients, fixed exclusions/allergies, and saved-recipe preference

### Inventory and Navigation Refinement
**Delivered**
- dashboard no longer contains inventory-specific Use soon or storage-area sections
- Inventory provides dedicated Fridge, Freezer, Store cupboard, Other, and derived Use soon routes
- storage-area pages provide local name search, close-to-expiry filtering, item review, and deletion
- web navigation uses client-side Expo Router transitions rather than full-page reloads

### V0.9 — Shopping Foundations
**Delivered**
- explicit deterministic `MealRequirement` model and derivation module
- equivalent ingredients aggregate across meals before Inventory matching
- Shopping generation consumes the Meal Requirements boundary rather than duplicating aggregation logic
- same-plan Shopping regeneration preserves manual items
- matching meal-derived Shopping items preserve IDs, purchased/skipped state, and price observations during regeneration

### Outstanding V0.8 work
- broader real-device camera/photo-library and receipt acceptance
- full end-to-end household validation of food scan, receipt scan, recipes, meal planning and shopping
- quality, latency and cost measurement under realistic conditions

## Current Overall Status

- V0.1: substantially implemented; final manual/native verification outstanding
- V0.2: historical mock flow; current app path uses AI-backed implementation
- V0.3: mock workflow implemented historically
- V0.4: historical mock flow; current app path uses AI-backed implementation
- V0.5: implemented and web-accepted
- V0.6: implemented MVP
- V0.7: implemented MVP
- V0.8: Phases A–E implemented/achieved for the initial TestFlight milestone; Phase F outstanding
- Next product milestone: Household Food Workflow / Product UX is planned but not started
- Nutrition / Deeper Intelligence: deferred until the household workflow is validated
