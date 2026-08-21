# Implementation Plan

## Purpose

This document is the authoritative forward-looking product and engineering roadmap. It describes what remains to be built, refined, validated, or decided. It is not a historical implementation record; completed work belongs in [IMPLEMENTED.md](IMPLEMENTED.md).

The repository was inspected before this plan was rewritten. The current codebase already contains local-first inventory, food scan, receipt scan, recipe generation, meal planning, an AI gateway, provider boundaries, deterministic planning logic, and a partial Shopping MVP. Shopping is therefore not absent, but it is not yet the complete household workflow required by V0.9.

## Current Position

**Execution strategy:** V0.9 implementation (Phases 2-8) is complete. V0.8 real-world validation remains a separate, parallel validation activity that informs prioritisation and the dedicated V0.9 UAT pass described below - it was never a gate that implementation waited behind, and V0.9 was completed regardless of its state.

**V0.9 implementation status: COMPLETE.** All Phase 2-8 "Remaining implementation work" items have either been implemented or explicitly, reasonedly deferred outside V0.9 scope (see each phase's **Implementation status** annotation below and its "Deliberately deferred" list). In particular: the Shopping domain persists and reconciles manual/completed items across sessions and meal-plan edits, and now also handles meal-plan deletion by detaching the linked list rather than leaving a dangling reference; Meal Requirements aggregate deterministically with quantity confidence and cross-unit conversion; Inventory matching excludes expired stock and explicitly flags (rather than silently drops) incompatible-unit matches, with use-soon status now surfaced in the Shopping UI; all three intake paths (manual addition, food scan, receipt scan) are wired into the Shopping -> Inventory loop through existing infrastructure, with Shopping status only ever updated after Inventory intake is actually confirmed. Serving-size scaling and in-place plan editing (servings/meal type/exclusions) were deliberately not built, since no mutable input exists to scale/reconcile against - building that would have been speculative complexity outside V0.9's scope, not a gap.

A dedicated V0.9 UAT pass (see below) is the next step, not further V0.9 implementation.

## Product North Star

The product is evolving from a collection of inventory and AI features into a household food-management workflow:

**Inventory -> Meals -> Shopping -> Inventory**

The application should help a household answer:

1. What food do we have?
2. What should we eat?
3. What do we need to buy?
4. What food has subsequently entered or left the household?

The product proposition is:

> The app knows what food a household has, helps them decide what to eat, tells them what they need to buy, and keeps the inventory up to date as food enters and leaves the household.

Everything in the next milestone must support this loop. Do not allow unrelated AI, analytics, nutrition, retailer, account, or synchronisation work to displace it.

## V0.8 — AI MVP Validation

**Status:** Initial TestFlight/physical-device milestone achieved; real-world household validation outstanding.

V0.8 is a validation activity that runs in parallel with, and informs, the V0.9 UAT pass described below. It is **not** a gate on completing V0.9 implementation - do not defer or leave V0.9 phases incomplete pending V0.8 validation. Existing AI implementation should still be exercised in real household conditions; its findings feed into prioritisation and the corrective pass after V0.9 implementation is complete.

### Validation Scope

#### Food scanning

- food identification
- product identity
- quantity
- multiple products
- ambiguous products
- incorrect recognition
- confidence
- correction and confirmation workflow

#### Receipt scanning

- merchant
- receipt line extraction
- product identity
- quantity
- price
- discounts where visible
- ambiguous lines
- incorrect extraction
- correction and confirmation

#### Recipes

- recipe usefulness
- ingredient accuracy
- sensible combinations
- inventory-aware suggestions
- missing ingredients
- substitutions where supported
- distinction between available, partial, missing, and substituted ingredients

#### Meal planning

- practical meal suggestions
- household relevance
- variety and repetition
- inventory usage
- use-soon relevance
- exclusions and allergies
- saved recipes
- selected meal types
- serving requirements
- preparation effort where supported

#### AI safety and quality

- inappropriate combinations
- hallucinated ingredients
- unsupported assumptions
- failure to respect inventory
- failure to respect exclusions
- structured-output failures
- API failures
- timeout behaviour
- degraded or unavailable gateway behaviour

#### Product behaviour

- persistence
- navigation
- camera
- photo library
- offline/degraded behaviour
- error recovery
- latency
- user trust

#### Economics

Measure where practical:

- AI calls per user action
- approximate tokens per request
- cost per food scan
- cost per receipt
- cost per recipe generation
- cost per meal-plan generation
- approximate cost per active household
- latency
- failure rate

Record opportunities where deterministic logic should replace AI.

### V0.8 Constraints

- Inventory remains the source of truth for actual household food state.
- AI proposes; the application validates, scores, ranks, and controls persistence.
- AI never directly mutates Inventory, Meals, Shopping, or other persisted state.
- The app remains local-first.
- OpenAI-specific behaviour remains behind provider-neutral boundaries and the small server-side gateway.
- AI responses must be structurally validated before application use.
- User confirmation remains required for consequential mutations.
- Deterministic/mock providers remain available for tests and failure-mode validation.
- No database, accounts, cloud synchronisation, or general backend migration is required for this milestone.

### V0.8 Exit Criteria

V0.8 validation is a parallel, ongoing activity rather than a prerequisite gate for V0.9 implementation. It is sufficient to meaningfully inform prioritisation and the post-V0.9 corrective pass when:

- the initial TestFlight build can be exercised on a physical iPhone
- food scan, receipt scan, recipes, meal planning, and Shopping have been exercised in representative workflows
- major quality and trust failures are recorded rather than guessed at
- AI cost, latency, and failure behaviour are understood well enough to prioritise work
- the minimum failures blocking the household loop are identified

V0.8 is not complete merely because code exists or API calls return JSON. V0.9 implementation proceeds regardless of V0.8's completion state.

## V0.9 — Household Food Workflow

### Objective

Establish and validate the complete:

**Inventory -> Meals -> Shopping -> Inventory**

workflow.

This is a domain and product milestone, not primarily a navigation redesign. The repository already has a partial Shopping MVP; V0.9 must complete its contracts and connect it reliably to Meals and Inventory without rebuilding working foundations.

### Target Workflow

```text
Inventory
   -> discover or plan Meals
   -> derive structured meal requirements
   -> compare requirements with Inventory
   -> generate and manage Shopping requirements
   -> purchase food
   -> scan receipt, scan food, or add manually
   -> confirm intake
   -> update Inventory
   -> recalculate future Shopping and Meals decisions
```

### Phase 1 — V0.8 Validation

**Reclassified:** this phase is now a parallel validation activity, not a prerequisite blocking Phases 2-8. V0.9 implementation proceeds regardless of its state; its findings feed the post-V0.9 UAT/corrective pass instead.

Record actual failures, observations, quality gaps, trust concerns, cost, latency, and device issues as they're found. Use that evidence, alongside the dedicated V0.9 UAT pass, to prioritise corrective work after V0.9 implementation is complete.

Do not start with Today, four-tab navigation, or cosmetic Meals work simply because those are visible.

### Phase 2 — Shopping Domain

Inspect and extend the existing Shopping MVP rather than rebuilding it.

**Implementation status:** COMPLETE (within V0.9 scope; food-role/optional modelling explicitly deferred to Phase 10)

**Implemented:**
- `ShoppingList`/`ShoppingItem` models cover item/product identity, required/available/missing quantity, unit, quantity confidence, source meal IDs and titles, meal-generated vs manual distinction, priority, and purchased/skipped/needed status
- Persistence via `ShoppingRepository` with Zod-validated storage
- Regeneration preserves manual items and meal-derived item completion/price state when regenerating the same plan
- Regeneration falls back to the most recently saved list for a plan id (not only an in-memory reference), so this survives navigation and app restarts, not just same-session regeneration
- Manual items can be given a unit and removed entirely (not just marked "skipped" forever)
- Deleting a meal plan (`useMealPlanner.deleteSavedPlan`) now calls `ShoppingService.detachFromMealPlan`, which sets the linked list's `mealPlanId` to `null` (an already-supported state used by manually-created lists) rather than leaving a dangling reference to a deleted plan. Manual items and all completion/purchase/skip state are preserved unchanged; the list simply stops being regenerable and surfaces under "Saved shopping lists" instead.

**Remaining implementation work:** none within V0.9 scope.

**Deliberately deferred (outside V0.9):**
- Required vs optional priority is a coarse binary driven only by whether an ingredient was flagged as a substitution; there is no food-role/staple/optional-suggestion model. Deferred to Phase 10 by design.
- Reconciliation behaviour for "serving-size changes" or "exclusion/preference changes" against partially-completed Shopping items is **not applicable**: there is no in-place editing of an existing plan's servings, meal type, or exclusions anywhere in the app (see Phase 7), and V0.9 deliberately preserves that model rather than inventing plan-editing to satisfy a theoretical requirement. Changing any of those today always creates a brand-new plan with a new id, which correctly gets its own independent Shopping list.

**UAT / validation only:**
- Real-device persistence across app restarts (covered by repository-level tests, not yet exercised on a physical device)
- Whether manual vs meal-generated distinction is clear enough to real users
- Whether a detached ("plan deleted") Shopping list is understandable to users without further UI treatment

Define the minimum stable meaning of a Shopping List and Shopping List Item. Existing code already supports several of these concepts; V0.9 should verify and complete them.

Potential information includes:

- item, product, or ingredient identity
- required quantity
- unit
- quantity already available
- quantity still required
- source meal or meals
- meal-generated versus manually added source
- required versus optional priority
- quantity confidence
- purchased/completed/skipped state
- relationship to the originating meal requirements

Do not introduce retailer-specific concepts, supermarket APIs, ordering, accounts, or synchronisation.

A meal-generated item and a manual household item must remain distinguishable. Changing a meal plan must not destroy unrelated manual Shopping items.

### Phase 3 — Meal Requirements

Introduce or formalise the structured application concept of Meal Requirements:

**Implementation status:** COMPLETE (within V0.9 scope)

**Implemented:**
- `deriveMealRequirements` aggregates equivalent ingredients across meals by identity alone, converting compatible units (g/kg, ml/l) into a single combined requirement instead of fragmenting by unit
- Records source meal IDs and titles for each requirement
- Each requirement carries a `quantityConfidence` of `exact`, `approximate`, or `unknown` depending on whether every contributing meal's quantity could be reconciled; `ShoppingService` consumes this directly
- Deterministic, pure, and covered by tests including cross-unit aggregation and confidence edge cases

**Remaining implementation work:** none within V0.9 scope.

**Deliberately deferred (outside V0.9), with explicit reasoning:**
- Serving-size scaling was reviewed and deliberately not built: the app has no in-place way to change an existing plan's serving count - servings are fixed at generation time and are immutable thereafter (changing them creates an entirely new plan and a new Shopping context). Since there is no existing serving-count input that mutates an existing plan, there is nothing correct to scale against, and building a plan-editing/reconciliation system solely to satisfy this would be exactly the kind of speculative complexity V0.9 should avoid. This model is preserved as-is for V0.9.
- Product/ingredient identity matching remains name-normalization plus a substring heuristic only - no product catalogue or fuzzy-identity engine, by design (explicitly out of scope per the plan's guardrails).

**UAT / validation only:**
- Whether name-normalization matching holds up against real AI-generated ingredient name variation

```text
Meal
  -> recipe ingredients
  -> required quantities
  -> meal requirements
```

The recipe source does not need to be deterministic. AI may generate or interpret recipe information, or the source may be a saved recipe or another structured source. The application must convert and validate that information into structured recipe data before deriving requirements.

The intended pipeline is:

```text
AI / existing recipe source
  ↓
structured recipe
  ↓
validated recipe ingredients
  ↓
Meal Requirements
  ↓
Inventory matching
  ↓
Shopping Requirements
```

Meal Requirements themselves are deterministically calculated from validated structured meal/recipe data, regardless of whether that source data originated from AI, a saved recipe, or another source.

The application must own:

- quantities
- units
- servings
- ingredient identity and matching
- available quantity
- missing quantity
- source meal references
- confidence when the data is uncertain

AI may generate a recipe, interpret an unstructured recipe, identify likely ingredients, suggest quantities, suggest substitutions, or suggest candidate meals. AI must not own final inventory accounting.

For example:

```text
AI-generated/interpreted recipe:
Chicken fajitas
- chicken: 500g
- peppers: 2
- tortillas: 8

Application:
Meal Requirements:
- chicken: 500g
- peppers: 2
- tortillas: 8

Inventory:
- chicken: 300g
- peppers: 1
- tortillas: 8

Deterministic result:
Shopping Requirements:
- chicken: 200g
- peppers: 1
```

### Phase 4 — Deterministic Inventory Matching

Implement and test deterministic matching:

**Implementation status:** COMPLETE (within V0.9 scope)

**Implemented:**
- `matchIngredient` subtracts compatible-unit Inventory quantities without mutating Inventory
- Expired stock is excluded from available quantity (still reported via `matchedInventoryItemIds` for traceability), so expired fridge items no longer silently mask a real shopping need
- Duplicate inventory rows of the same compatible unit are summed correctly; duplicate requirements are pre-aggregated by Phase 3 before matching
- Use-soon status is computed per matched inventory item (`useSoonInventoryItemIds`) and now surfaced on `ShoppingItem.hasUseSoonInventory`, shown in the Shopping UI as "Some of what you already have is expiring soon - use that up before buying more."
- Multiple inventory rows matching the same ingredient with mutually incompatible units are handled explicitly and conservatively: `IngredientMatch.incompatibleUnitInventoryItemIds` records them separately from the compatible ones, they are never guessed at or folded into `availableQuantity`, and this is surfaced on `ShoppingItem.hasIncompatibleUnitInventory` with a UI note ("Some matching inventory uses a different unit and couldn't be compared automatically - check manually") instead of pretending the quantities were comparable
- Fully deterministic; no LLM involved in arithmetic, subtraction, aggregation, or state transitions

**Remaining implementation work:** none within V0.9 scope.

**Deliberately deferred (outside V0.9):**
- Unit conversion is limited to g/kg and l/ml - no count-based equivalence or spoon/cup measures. Broader unit conversion needs a larger unit-taxonomy decision and is deferred rather than guessed at.

**UAT / validation only:**
- Real household inventory naming conventions vs AI-generated ingredient names
- Whether the new incompatible-unit and use-soon notes are clear to real users

**Required food - available inventory = missing food**

For example, if meals require 500g chicken and Inventory contains 300g, the required purchase is 200g. If Inventory contains three onions and the meal requires one, the required purchase is zero.

The calculation must respect the existing quantity/unit model and remain conservative when conversion or product identity is uncertain.

Address, with the minimum necessary changes:

- exact matches
- partial coverage
- incompatible units
- unknown quantities
- duplicate ingredients
- expired versus usable stock
- use-soon prioritisation
- conservative product identity

Do not use an LLM for arithmetic, subtraction, aggregation, or state transitions.

### Phase 5 — Shopping Requirements

Generate Shopping requirements from structured Meal Requirements and matched Inventory.

**Implementation status:** COMPLETE (within current scope; optional-item modelling intentionally deferred to Phase 10)

**Implemented:**
- Requirements are aggregated deterministically (Phase 3) before Inventory subtraction
- Covered requirements are only omitted when quantity confidence is `exact` and Inventory genuinely covers the full amount - approximate/unknown-quantity requirements are always kept on the list rather than silently dropped just because some inventory happens to match by name
- Required vs recommended items are separated; manual items are distinguished from meal-generated ones
- End-to-end tested through the real `MealPlanRepository`/`ShoppingService.generateListForPlanId` path, not only the pure aggregation function

**Remaining implementation work:**
- No explicit "optional/good-to-buy suggestion" category beyond the substitution-based `recommended` signal - this needs the food-role taxonomy from Phase 10 and is deliberately deferred, not an oversight

**UAT / validation only:**
- Whether the required/recommended split feels correct against real recipes and real households

Aggregate before subtracting Inventory:

```text
Monday requires 250g chicken
Tuesday requires 400g chicken
Combined requirement = 650g chicken
Inventory = 300g chicken
Shopping requirement = 350g chicken
```

Requirements must be deduplicated and aggregated deterministically. Required purchases must be clearly separated from optional or good-to-buy suggestions.

Required means necessary to execute a planned meal and insufficiently covered by Inventory. Optional items may include toppings, substitutions, or useful staples, but must not overwhelm required purchases.

### Phase 6 — Shopping UX

Only after the domain contracts and deterministic calculations are stable, refine the Shopping UI.

The first useful Shopping experience should answer:

**What do I need to buy?**

**Implementation status:** COMPLETE (against the plan's explicit checklist)

**Implemented:**
- Items grouped into required/recommended/manual
- Quantity and unit shown, with a required/available/buy breakdown when Inventory partially covers an item
- Originating meal(s) shown by recipe title (`sourceMealTitles`)
- Manual items: add with name, quantity, unit, and priority; remove entirely (not just "skip")
- Completion state: needed/purchased/skipped
- Confidence explanation shown when quantity confidence is `approximate` or `unknown`, instead of silently showing a number that might understate real need
- Persistence ("Save shopping list") and regeneration (via the meal-plan link)
- Loading state, error banner, and empty states (no items on the list / no saved lists)
- "Add to inventory" per item, connecting into the Phase 8 intake loop, without ever mutating Inventory itself

**Remaining implementation work:**
- No inline editing of a meal-derived item's own quantity/unit (the plan's checklist doesn't explicitly require this; it would need product-identity decisions from Phase 4 to do safely)

**UAT / validation only:**
- Confidence-note wording and required/recommended/manual grouping ergonomics with real households

It should expose, without unnecessary supermarket complexity:

- required items
- quantity and unit
- available and missing quantities where meaningful
- originating meal or meals
- manual items
- optional items
- completion state
- conservative confidence or explanation where useful

Do not add retailer integration, online ordering, delivery, product-marketplace infrastructure, or supermarket APIs in V0.9.

### Phase 7 — Meal Planning Integration

Connect existing meal planning to the completed Shopping domain.

A saved or draft meal plan should produce structured Meal Requirements and then Shopping Requirements. Changing meals, serving sizes, meal types, or exclusions should recalculate meal-derived requirements without destroying manual Shopping items.

**Implementation status:** COMPLETE (within V0.9 scope)

**Implemented:**
- Draft and saved plans both link to Shopping via `Create shopping list`
- In-memory edits (e.g. an unsaved meal replacement) are bridged via a draft store so Shopping generation reflects the current edited state, not a stale persisted one
- End-to-end tested through the real `MealPlanRepository` + `ShoppingService.generateListForPlanId` (not only the pure `generateList` function): editing a saved plan's meal correctly updates meal-derived items to the new ingredients, drops stale ones, and preserves manual items
- Deleting a saved plan now detaches (rather than orphans) any linked Shopping list via `ShoppingService.detachFromMealPlan` (see Phase 2), tested through `useMealPlanner.deleteSavedPlan`

**Remaining implementation work:** none within V0.9 scope.

**Deliberately deferred (outside V0.9), with explicit reasoning:**
- In-place editing of an existing plan's servings, meal type, or exclusions does not exist anywhere in the app, and V0.9 deliberately does not build it. Changing any of those today always produces a brand-new plan with a new id, which is treated as an entirely new Shopping context - this is the correct, existing model, not a gap to close. Building plan-editing/reconciliation machinery solely to satisfy a requirement that has no corresponding mutable input would be speculative complexity outside V0.9's scope; it belongs with Phase 9 (Meal Intelligence) if and when in-place plan editing is introduced as a product decision.

**UAT / validation only:**
- Meal-replacement-driven Shopping recalculation in real day-to-day use

Maintain the hybrid architecture:

```text
Inventory facts
  -> suitable candidate inputs
  -> AI assistance where useful
  -> structured validation
  -> deterministic scoring/ranking
  -> plan optimisation
  -> user review
  -> persistence
```

Do not send the entire raw Inventory to an LLM and ask it to combine everything.

### Phase 8 — Shopping -> Inventory Loop

Connect post-purchase intake to existing Inventory workflows:

```text
Shopping list
  -> user purchases food
  -> receipt scan, food scan, or manual addition
  -> user confirms intake
  -> Inventory changes
```

**Implementation status:** COMPLETE (within V0.9 scope)

**Implemented:**
- Each Shopping item has three intake actions, all reusing existing infrastructure with no second import/purchasing system: `Add to inventory` (existing manual-add form, prefilled with name/quantity/unit), `Scan food` (existing food-scan flow), and `Scan receipt` (existing receipt-scan flow) - all navigate with `shoppingListId`/`shoppingItemId` route params
- The Shopping list is saved before navigating to any intake screen, since the returning screen looks the item up from persisted storage (not in-memory state) via `ShoppingService.confirmItemPurchased`
- The user explicitly reviews and can freely change prefilled/scanned values (name/quantity/unit/category/location) before anything becomes Inventory state, which naturally supports over-purchase, under-purchase, substitution, and the scanner identifying a different product, without special-casing any of them
- All three flows share one method, `ShoppingService.confirmItemPurchased(shoppingListId, itemId)`, called only after the existing intake confirmation (`inventoryService.addItem`) actually succeeds - Shopping status still never establishes Inventory state on its own, and a missing/unsaved list is tolerated (returns `null`, doesn't throw)
- Marking an item purchased without going through intake still works and correctly leaves Inventory untouched (pre-existing status buttons)
- Confirmed intake without an originating Shopping item still works via the existing unmodified add/scan flows
- A failed scan or failed intake (AI failure, validation failure, storage failure) leaves the Shopping item's status untouched, since `confirmItemPurchased` is only reached after `confirm()` returns success
- Because Shopping generation always re-reads current Inventory, future Shopping regeneration automatically reflects newly confirmed intake - no special recalculation code was needed for this
- Meal-plan deletion no longer leaves a dangling reference (see Phase 2's `detachFromMealPlan`)

**Remaining implementation work:** none within V0.9 scope.

**UAT / validation only:**
- The "Add to inventory"/"Scan food"/"Scan receipt" flows' real-world usability with actual purchased quantities/units, and whether users understand which to pick
- Whether households mark items purchased before or after confirming intake in practice

Marking a Shopping item purchased must not automatically add it to Inventory. Purchased food becomes actual household stock only through explicit intake and confirmation.

The application must treat these as related but separate states:

1. **Planned requirement:** what a meal requires, such as Tuesday's meal requiring 500g chicken.
2. **Shopping state:** what the household intends to buy or has marked as purchased. This records Shopping workflow state, not proof of what was bought or owned.
3. **Inventory state:** what the household actually has, established by confirmed intake.

**Shopping is not Inventory.** A purchased or completed Shopping state must not itself establish product identity, actual purchased quantity, actual Inventory quantity, or Inventory ownership. The authoritative transition into Inventory remains receipt scanning, food scanning, manual addition, or user confirmation of identified intake.

The system must tolerate differences between planned quantity, Shopping quantity, actual purchased quantity, and actual Inventory quantity:

```text
Meal requirement:       500g chicken
Shopping requirement:   500g chicken
User purchases:         750g chicken
Confirmed intake:       750g chicken
Inventory:              750g chicken
```

It must also tolerate a user marking an item purchased when no purchase is confirmed; in that case Shopping records the user's state but Inventory receives no new chicken. The same applies when the user buys more, buys less, buys a substitute, receipt scanning identifies a different product, the meal is cancelled, or the purchase happens later. Exact handling should be decided during implementation against the existing Shopping code rather than by inventing a new persistence architecture.

Reuse the existing receipt, food-scan, manual-addition, validation, and persistence infrastructure. Do not build a second purchasing/import system.

### Phase 9 — Meal Intelligence Improvements

Only after Shopping exists and the V0.9 loop exposes real failures, improve Meals.

Keep these distinct:

- Recipe discovery: “What could I cook?”
- Use What I Have: “What can I make with my current Inventory?”
- Meal planning: “What should the household eat over the coming days?”

Improve only what validation supports:

- meal relevance
- inventory use
- exclusions and allergies
- saved recipes
- use-soon items
- variety and repetition
- serving requirements
- preparation time
- missing ingredients
- Shopping implications

### Phase 10 — Food Role and Meal Suitability

Introduce the minimum structured model needed to avoid obviously inappropriate combinations. Do not implement a taxonomy for its own sake.

Potential signals include:

- main/protein
- staple/carbohydrate
- vegetable
- fruit
- breakfast item
- snack
- sauce/base
- condiment
- dairy/cheese
- other

Treat these as signals, not absolute rules. Fruit may be more relevant to breakfast or snacks; protein, staple, sauce, and vegetables may form a dinner candidate. Do not force every Inventory item into one meal.

### Phase 11 — Today

Build Today only after the underlying Inventory, Meals, and Shopping state is reliable.

Today should answer:

**What is useful for me to know or do today?**

Potential content:

- tonight's meal
- tomorrow's meal where useful
- Shopping status
- use-soon items
- important Inventory alerts
- whether meals are planned
- contextually useful actions

Today must not become an analytics dashboard, generic feature launcher, or over-engineered AI assistant.

Navigation follows the domain workflow; it does not drive it.

### V0.9 Validation

A household should be able to:

1. represent food in Inventory;
2. discover meals using that Inventory;
3. create or select a meal plan;
4. derive structured Meal Requirements;
5. compare requirements with Inventory;
6. generate a sensible Shopping list;
7. add manual Shopping items;
8. distinguish required and optional purchases;
9. change the meal plan without corrupting manual Shopping items;
10. purchase food;
11. scan the receipt or food;
12. confirm intake;
13. see Inventory update;
14. see Shopping requirements recalculate;
15. continue planning future meals.

Test edge cases including:

- insufficient and excess quantity
- duplicate ingredients
- different or incompatible units
- multiple meals requiring the same ingredient
- partial Inventory coverage
- manual Shopping items
- removed or changed meals
- changed serving sizes
- expired/use-soon items
- unavailable ingredients
- AI failure
- receipt-scan failure
- offline/degraded behaviour

### V0.9 UAT Pass (next step)

V0.9 implementation (Phases 2-8) is complete. The next step is a dedicated V0.9 UAT/validation pass, distinct from ongoing V0.8 validation:

- exercise the full Inventory -> Meals -> Shopping -> Inventory loop on a physical device with real recipes and real inventory, including all three intake paths (manual addition, food scan, receipt scan)
- specifically probe the "UAT / validation only" items called out under each phase above
- record findings as concrete failures, not impressions
- use findings to scope a subsequent corrective implementation pass - do not treat UAT findings as new scope creep beyond fixing what V0.9 already claims to do

No further V0.9 implementation work is planned unless the UAT pass surfaces a genuine defect in what's described as COMPLETE above. Do not start Phase 9, Phase 10, Phase 11, navigation redesign, or any out-of-scope work (retailer integrations, accounts, synchronisation, nutrition, chatbot, autonomous purchasing, in-house LLM) until that UAT pass and any resulting corrective work are done.

### V0.9 Exit Criteria

V0.9 is complete only when:

- Inventory represents household food reliably enough for decisions.
- Meals can produce or select useful meals under household constraints.
- AI output is never treated as authoritative household state.
- Structured recipes and meals produce Meal Requirements deterministically, whether their source was AI, a saved recipe, or another source.
- Inventory matching and Shopping Requirements are deterministic wherever the underlying data is structured.
- Shopping requirements are deterministically calculated after Inventory matching.
- Required, optional, and manual Shopping items are understandable and manageable.
- Shopping completion does not silently mutate Inventory.
- The workflow distinguishes Planned Requirements, Shopping state, and Inventory state.
- Existing intake workflows can update Inventory after purchases.
- The end-to-end data flow is:

  ```text
  Structured recipe / meal
    ↓
  Meal Requirements
    ↓
  Inventory matching
    ↓
  Shopping Requirements
    ↓
  Shopping state
    ↓
  Confirmed intake
    ↓
  Inventory
  ```

- The full **Inventory -> Meals -> Shopping -> Inventory** loop works end to end.
- AI failures do not corrupt application state.
- Users understand what is known, inferred, proposed, and awaiting confirmation.

### V0.9 Out of Scope

Unless repository inspection later shows an existing implementation only needs maintenance, V0.9 excludes:

- user accounts
- cloud or multi-device synchronisation
- supermarket or retailer integrations
- online ordering or grocery delivery
- autonomous purchasing
- product marketplace or large catalogue infrastructure
- nutrition, calories, macros, or advanced health features
- general-purpose chatbot
- custom in-house LLM
- major backend expansion
- social/community features

## V1.0 — Intelligent Household Assistant

After V0.9 validates the workflow, improve the quality of household decisions rather than simply adding features.

Potential areas:

- stronger meal-plan optimisation
- better preferences and substitutions
- improved use-soon prioritisation
- better variety and product identity
- cost-aware planning
- smarter recommendations
- clearer AI/deterministic division of labour

## Nutrition / Later Intelligence

Nutrition remains deferred until the core workflow is validated:

- meal logging
- calories
- macros
- portions
- nutrition-aware recipes and meal planning

## Longer-Term Possibilities

These are possibilities, not commitments:

- Rehabit integration
- retailer/marketplace integrations
- supermarket ordering
- product catalogue improvements
- basket and inflation intelligence
- accounts, synchronisation, and multi-device support

## Product and UX Workstreams

- Shopping UX and meal-to-shopping visibility
- Inventory/Add to inventory refinement
- Meals information architecture
- Today information architecture
- eventual Today | Inventory | Meals | Shopping navigation
- required/optional/manual Shopping states
- clear review, confirmation, loading, error, and degraded states

Navigation redesign follows establishment of the underlying household workflow. Four tidy tabs must not drive the domain model.

## Domain and Intelligence Workstreams

- Shopping domain completion
- Meal Requirement model
- ingredient identity and matching
- unit conversion and quantity confidence
- deterministic aggregation and Inventory subtraction
- manual versus meal-generated Shopping items
- required versus optional prioritisation
- meal suitability and food-role signals
- constrained AI candidate generation
- deterministic scoring, variety, exclusions, and optimisation
- meal-plan and Shopping contracts

## Validation Workstreams

- household meal relevance and trust
- inappropriate combinations and unsupported assumptions
- food and receipt extraction quality
- Shopping usefulness
- meal-plan changes and manual Shopping preservation
- device UX and failure recovery
- latency, cost, and reliability
- where deterministic logic outperforms AI

## Architectural Principles

- Inventory is the source of truth for actual household food state.
- Proposed and derived information is separate from authoritative household state: AI recipe information is proposed until validated, Meal Requirements and Shopping Requirements are derived application data, Shopping purchase/completion is workflow state, and Inventory is actual household food state.
- AI output is an input to application logic, not application state.
- AI never directly mutates persisted state.
- Structured AI output must be validated.
- Consequential mutations require user confirmation.
- The app remains local-first.
- Provider-specific behaviour remains behind provider-neutral boundaries.
- OpenAI-specific behaviour remains behind the server-side gateway.
- Deterministic/mock providers remain available for tests.
- Services own application and domain behaviour.
- Providers own external integrations.
- Shopping does not silently mutate Inventory.
- Meal planning and recipe generation do not silently mutate Inventory.
- Product identity remains conservative.
- Observed price, reference price, historical movement, volatility, and inflation remain distinct.
- Prefer deterministic logic wherever it is reliable and cheap.
- Avoid unnecessary prompts, image storage, provider-response storage, and infrastructure.

## AI Economics and Scaling

- avoid unnecessary LLM calls and repeated large context
- use deterministic logic for accounting and state transitions
- batch or cache stable derived information where appropriate
- use smaller/cheaper models when quality permits
- reserve stronger reasoning for difficult cases
- measure cost and latency by workflow
- monitor failure rates
- distinguish image processing, OCR/document understanding, vision, and textual meal reasoning
- do not prematurely bring an LLM in-house

In-house inference is a later economic decision based on volume, API cost, infrastructure cost, latency, utilisation, quality, engineering capacity, and operational complexity.

## Implementation Order

1. Complete V0.8 real-world validation.
2. Record actual product failures and identify minimum changes.
3. Define the minimum Shopping domain, extending existing Shopping MVP code rather than rebuilding it.
4. Define structured Meal Requirements.
5. Implement deterministic requirement aggregation and Inventory matching.
6. Implement deterministic Shopping Requirement generation.
7. Implement the initial Shopping experience.
8. Connect Meal Planning to Shopping.
9. Connect post-purchase intake back to Inventory through existing receipt, food, and manual workflows.
10. Validate the complete Inventory -> Meals -> Shopping -> Inventory loop.
11. Improve Meals intelligence from observed failures.
12. Add only the minimum food-role/meal-suitability model required.
13. Improve deterministic scoring, variety, and plan optimisation.
14. Build/refine Today using reliable household state.
15. Perform the end-to-end V0.9 validation pass.

Do not reorder this sequence simply because a navigation or screen change is easier to build. The sequence is:

**Domain -> deterministic contracts -> workflow -> UX -> navigation refinement**

## Decisions to Make During Implementation

- exact Shopping List and Shopping List Item models
- exact Meal Requirement model
- ingredient identity and matching rules
- unit conversion rules and quantity confidence
- partial Inventory coverage behaviour
- duplicate requirement aggregation
- manual versus meal-generated Shopping items
- required versus optional items
- meal-plan change behaviour
- Shopping completion behaviour and visibility of completed items
- receipt interaction with completed Shopping items
- Inventory intake recalculation behaviour
- minimum food-role model
- household exclusions, allergies, and preferences
- saved recipe representation
- exact meal-plan-to-Shopping contract
- deterministic versus AI responsibilities
- caching strategy
- cost, latency, and validation thresholds
- final Today information architecture
- final navigation structure
