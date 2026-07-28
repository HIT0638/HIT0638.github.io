# GitHub Pages `npm ci` lockfile failure

## Symptom

The first GitHub Pages workflow reached the dependency-install step but failed
before building:

```text
`npm ci` can only install packages when your package.json and package-lock.json
or npm-shrinkwrap.json are in sync.
Missing: @emnapi/core@1.10.0 from lock file
Missing: @emnapi/runtime@1.10.0 from lock file
```

## Affected scope

The failure occurred only on the Linux GitHub Actions runner. The same project
could build locally because the local platform selected a different optional
native dependency set.

## Root cause

The lockfile contained the optional `@rolldown/binding-wasm32-wasi` package and
its exact `@emnapi` version requirements, but did not contain the nested
`@emnapi/core@1.10.0` and `@emnapi/runtime@1.10.0` package records required for
`npm ci` to validate the complete cross-platform dependency graph.

## Final fix

Added the missing nested package records, including their public registry URLs,
integrity hashes, licenses, and dependency relationships. The workflow keeps
using `npm ci` so future dependency drift remains visible instead of being
silently rewritten during deployment.

## Validation

- The original failure was reproduced from the GitHub Actions log.
- The missing package metadata was checked against the public npm registry.
- `npm ci --dry-run --ignore-scripts --no-audit --no-fund --prefer-offline
  --os=linux --cpu=x64` passed locally.
- `package-lock.json` passes `git diff --check`.
- Local production build and lint had already passed before the workflow fix.

## Follow-up

If the toolchain updates Rolldown or Tailwind, verify the lockfile on a clean
Linux runner before changing the workflow to a less strict install command.
