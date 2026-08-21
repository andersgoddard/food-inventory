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

### V0.9 — Shopping Domain, Meal Requirements, and Inventory Matching (Phases 2-6)
**Status:** Implementation complete for V0.9 scope.

**Delivered**
- explicit deterministic `MealRequirement` model and derivation module (`src/services/meal-requirements.ts`), aggregating equivalent ingredients by identity (not identity+unit) and converting compatible units (g/kg, ml/l) into a single combined requirement
- each `MealRequirement` and `ShoppingItem` carries a `quantityConfidence` of `exact`/`approximate`/`unknown`; `ShoppingService.generateList` only treats a requirement as fully covered when confidence is `exact`, so approximate/unknown-quantity items are never silently dropped
- `ingredient-matcher.ts` (`matchIngredient`) excludes expired Inventory stock from available quantity while still reporting it via `matchedInventoryItemIds` for traceability
- `matchIngredient` now also records `incompatibleUnitInventoryItemIds`: name-matching Inventory rows whose unit couldn't be reconciled with the requirement's unit are never folded into `availableQuantity` or silently dropped - they're tracked separately. Surfaced on `ShoppingItem.hasIncompatibleUnitInventory` and shown in the Shopping UI ("Some matching inventory uses a different unit and couldn't be compared automatically - check manually"). **Invariant:** availability is never guessed at across incompatible units.
- `ShoppingItem.hasUseSoonInventory` surfaces `matchIngredient`'s existing `useSoonInventoryItemIds` in the Shopping UI ("Some of what you already have is expiring soon - use that up before buying more") - previously computed but only used internally by meal-plan candidate scoring
- Shopping generation consumes the Meal Requirements boundary rather than duplicating aggregation logic, and never mutates Inventory
- Shopping regeneration preserves manual items and matching meal-derived items' IDs, purchased/skipped state, and price observations, both within a session and across app restarts (`ShoppingRepository.getListForMealPlan` fallback when no in-memory list is held)
- `ShoppingItem` records originating meal titles (`sourceMealTitles`), shown in the Shopping UI alongside a required/available/buy quantity breakdown and a confidence explanation for approximate/unknown items
- manual Shopping items support a unit (`UnitSelector` in the Shopping screen) and can be removed entirely via `ShoppingService.removeItem`, not just marked "skipped" forever
- `ShoppingService.detachFromMealPlan(mealPlanId)`: when a saved meal plan is deleted (`useMealPlanner.deleteSavedPlan`), any Shopping list still linked to it has its `mealPlanId` set to `null` rather than left as a dangling reference to a nonexistent plan. This reuses the existing nullable-`mealPlanId` state (already used by manually-created lists) instead of a new lifecycle framework. **Invariant:** manual items and all purchased/skipped/needed state are preserved unchanged; the list simply stops being regenerable against that plan and surfaces under "Saved shopping lists".
- end-to-end tested through the real `MealPlanRepository` + `ShoppingService.generateListForPlanId` path (editing a saved plan's meal correctly recalculates Shopping without losing manual items), not only pure-function tests

**Tests added/updated:** `shopping.service.test.ts` (incompatible-unit/use-soon flags, `confirmItemPurchased` found/not-found, `detachFromMealPlan` found/not-found preserving items), `meal-planning.engine.test.ts` (mixed compatible+incompatible unit matches), `shopping.repository.test.ts`, `use-meal-planner.test.ts` (`deleteSavedPlan` calls `detachFromMealPlan`).

**Deliberately not implemented, with reasoning:**
- required-vs-optional modelling beyond a substitution-status flag - needs a food-role taxonomy, deferred to a future phase, not built speculatively
- serving-size scaling of recipe ingredient quantities - reviewed and explicitly not built: there is no existing input that mutates an existing plan's serving count (changing servings always creates a new plan), so there is nothing correct to scale against; building plan-editing/reconciliation machinery to satisfy a requirement with no mutable input would be speculative complexity
- in-place editing of an existing plan's servings/meal type/exclusions - same reasoning; the existing "new plan on change" model is preserved as correct for V0.9, not treated as a gap
- unit conversion beyond g/kg and l/ml (e.g. spoon/cup measures, count-based equivalence)

### V0.9 — Shopping -> Inventory Intake (Phase 8)
**Status:** Implementation complete for V0.9 scope.

**Delivered**
- All three intake paths described by the plan are now wired into Shopping, reusing existing infrastructure with no second import/purchasing system:
  - `Add to inventory` - opens the existing manual-add form (`/inventory/add`) prefilled with name/quantity/unit
  - `Scan food` - opens the existing food-scan flow (`/scan-food`)
  - `Scan receipt` - opens the existing receipt-scan flow (`/scan-receipt`)
  - all three pass `shoppingListId`/`shoppingItemId` route params; the Shopping screen persists (`save()`) the list before navigating, since the returning screen looks the item up from storage
- `ShoppingService.confirmItemPurchased(shoppingListId, itemId)` centralizes the "mark this Shopping item purchased" step, called identically from all three intake screens only after the existing intake confirmation (`inventoryService.addItem`) actually succeeds. Tolerates a missing/unsaved list by returning `null` rather than throwing.
- **Invariant preserved:** Shopping status is only ever updated after Inventory intake is confirmed successful - a failed scan, failed validation, or failed storage write leaves the Shopping item's status untouched, and marking an item purchased via the pre-existing status buttons (without going through intake) still never touches Inventory
- The user can freely edit prefilled/scanned name, quantity, unit, category, and location before confirming, which is what supports over-purchase, under-purchase, substitution, and the scanner identifying a different product - none of these needed special-case handling
- Confirmed intake without an originating Shopping item continues to work via the existing unmodified add/scan flows

**Tests added/updated:** `shopping.service.test.ts` (`confirmItemPurchased`). Screen-level wiring (`scan-food.tsx`, `scan-receipt.tsx`, `inventory/add.tsx`, `shopping.tsx`) has no dedicated tests, consistent with this repo's existing convention of not unit-testing screens directly - covered by the service-level tests plus the planned UAT pass.

**Deliberately not implemented:** none within V0.9 scope for this phase.

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
- V0.9: implementation complete (Phases 2-8 of the roadmap) - Shopping domain, Meal Requirements, deterministic Inventory matching (including incompatible-unit and use-soon surfacing), Shopping Requirements, Shopping UX, meal-planning integration, and all three Shopping->Inventory intake paths (manual, food scan, receipt scan). Serving-size scaling and in-place plan editing were reviewed and deliberately not built - see [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for reasoning and the phase-by-phase status
- Next: dedicated V0.9 UAT pass, then a corrective implementation pass based on its findings
- Nutrition / Deeper Intelligence: deferred until the household workflow is validated
