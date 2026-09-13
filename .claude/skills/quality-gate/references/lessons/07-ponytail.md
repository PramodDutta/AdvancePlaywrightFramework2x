# Lesson 07 - The ponytail gate

Builds: `rules/ponytail.rules.mjs`

This repo keeps two copies of one API lifecycle test on purpose:
`booking-crud.e2e.spec.ts` at 73 lines and
`booking-crud-end-to-end.ponytail.spec.ts` at 33. Same assertions, both green.
Every cut answered one question: **does anything else in the run already record
this?**

| Cut | What already records it |
|:--|:--|
| `test.step` around a single call | the trace lists every request, with timings |
| `testInfo.attach` of a response body | the same trace already holds it |
| Ten `log.info` lines | each restated its own step name, which is in the report |
| `Date.now()` timing | the trace timeline has every duration |

**The precondition:** all of it rests on `trace: 'on'` for every test, not just
retries. Turn tracing off and this pack must be turned off with it.

## The metric that was wrong

Detecting a comment that says what the code says started here:

```js
return shared / Math.min(a.size, b.size);   // the bug
```

Dividing by the smaller set means a short code line whose two identifiers both
appear in a long comment scores 1.0. So the rule reported the best line in the
file:

```ts
// No token argument: BookingApi re-auths on a 403 and retries. Passing one opts out.
const updated = await bookingApi.updateBooking(bookingId, payload);
```

The question is not "do these share words", it is **"does the comment add
anything the code does not have"**. That makes the comment the denominator:

```js
function coverage(prose, code) {
    let shared = 0;
    for (const w of prose) if (code.has(w)) shared += 1;
    return prose.size === 0 ? 0 : shared / prose.size;
}
```

Scores: narration 1.00, that explanatory comment 0.14.

One more correction: compare against the **raw** neighbour line, not the masked
one, because masking blanks the literal the comment is echoing.

## What this gate never touches

Every `expect` survived the rewrite, and three tests stayed three tests because
`describe.serial` reports each stage as its own pass or fail. That is a decision
about reporting, not machinery. This pack removes scaffolding, never checks.

Scoped to specs and page objects: the trace records page actions and HTTP
traffic, not what a helper does internally. Applied to `UtilElementLocator`,
whose job is logging every action, the rule inverts into nonsense.

---

Exercise and checker: `exercises/07-ponytail/TASK.md`, `node exercises/check.mjs 07`.
