# Project Rules

## Project Context
1. For every prompt, you must read the `project_context.md` file to understand the current context of the project.
2. After completing the code implementation or updates, you must update the necessary information in the `project_context.md` file to keep the project context up to date.

## Versioning Rules (SemVer: MAJOR.MINOR.PATCH)
1. Start from version `1.0.0`.
2. For every code modification/change:
   - Increment **PATCH** (`1.0.X`) for small tweaks, fixes, or minor refinements.
   - Increment **MINOR** (`1.X.0`) for new features or notable enhancements (e.g. adding new alert systems, API sync, UI tabs).
   - Increment **MAJOR** (`X.0.0`) for complete revamps or breaking architectural shifts.
3. Keep `manifest.json` and `project_context.md` updated with the active version on every release/change.
