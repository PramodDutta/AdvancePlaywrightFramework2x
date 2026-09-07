# "Cannot find module" that is really two bugs wearing one error message

## The problem

`booking-crud.e2e.spec.ts` would not run. Playwright reported
`Error: Cannot find module '@/utils/ApiHelper'`, then `No tests found`.

## The approach

1. Read the error literally. `Cannot find module` is a **resolution** failure, so the
   suspect list is the import specifier, `tsconfig.json` `paths`, and the filename on
   disk. Nothing inside the test body can cause it.
2. Grepped the whole tree for the symbol rather than opening the failing file first:
   `grep -rn "@/utils\|ApiHelper" src --include='*.ts'`. One grep showed every importer
   and the definition site together, which is what exposed that the specifiers disagreed
   with each other, not just with the filesystem.
3. Compared the specifier against the alias table in `tsconfig.json`. The project defines
   six aliases (`@api/*`, `@config/*`, `@fixtures/*`, `@pages/*`, `@testdata/*`,
   `@utils/*`). There is no `@/*`. So `@/utils/ApiHelper` could never resolve.
4. Then compared the *spelling* of every import against `ls`. The importers wrote
   `ApiHelper` and `BookingApi`; the files on disk were `APiHelper.ts` and `BookingAPi.ts`.
5. Recognised the second bug as the dangerous one. macOS APFS is case-insensitive, so
   those files resolve fine locally and `npx playwright test` goes green. CI runs
   `ubuntu-latest`, which is case-sensitive, and `tsconfig.json` sets
   `forceConsistentCasingInFileNames: true`. This class of bug passes on the laptop and
   fails only on the runner.
6. Renamed the two files to match the importers. A case-only rename on a case-insensitive
   filesystem needs a two-step through a temp name, or git records nothing:

   ```bash
   git mv src/utils/APiHelper.ts src/utils/tmp__.ts
   git mv src/utils/tmp__.ts src/utils/ApiHelper.ts
   ```

7. Fixed the specifier to `@utils/ApiHelper`, then verified in the cheap-to-expensive
   order: `npx tsc --noEmit` (exit 0), then the spec (3/3 passing).

## The judgment calls

- **Did not** add an `@/*` alias to `tsconfig.json` to make the broken import resolve.
  That is the fix that makes the error go away while making the codebase worse: it
  creates two spellings for the same path (`@/utils/x` and `@utils/x`) and breaks the
  symmetry of the six existing aliases. The import was wrong, not the config.
- **Did not** rename the importers to `APiHelper` / `BookingAPi` to match the files.
  Both are PascalCase identifiers, so `ApiHelper` and `BookingApi` are the correct
  spellings. The files carried the typo, and four call sites already agreed on the right
  name. Move the minority to the majority.
- **Did not** treat "it runs on my machine" as proof. The case bug was invisible locally
  in exactly the way that matters, so the rename was made even though nothing was
  failing because of it yet.
- **Did not** fix the adjacent config drift, and flagged it instead: the API specs moved
  from `src/api/` to `src/tests/apisTests/`, so they now run under the `chromium` project
  and launch a real browser for pure HTTP calls, while the `api` project's `testDir`
  still points at `src/api/`, which now holds only helpers and zero specs. Real, but a
  separate decision from "make this spec run".

## The reusable rule

**`Cannot find module` is never a code bug: check the alias table, then check the
filename's exact casing, in that order.** And on macOS treat case-only mismatches as
already-broken CI, because a case-insensitive filesystem hides on the laptop precisely
the failure a Linux runner will surface.
