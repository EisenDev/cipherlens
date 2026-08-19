# ADR-006: Scanner registry as the module-selection source of truth

## Status

Accepted for implementation on 2026-08-19.

## Context

The new-scan wizard currently combines a hardcoded frontend module catalog, backend
profile mappings, and the scanner registry. These sources can disagree. A preset can
therefore select a placeholder or overlapping scanner that the UI describes as active.

## Options considered

| Option | Benefits | Costs |
| --- | --- | --- |
| Keep independent frontend and backend catalogs | Minimal change | Catalog drift remains possible and unavailable modules can be submitted |
| Use the scanner registry as the catalog; retain presets as selections | One authoritative availability contract, explicit user selection, server validation | Requires registry metadata and validation at each submission boundary |

## Decision

Use the scanner registry as the authoritative module catalog. A module is selectable
only when its registry metadata declares it implemented, selectable, and compatible
with the target type. Presets are named convenience selections over that catalog; they
do not create hidden modules or lock module controls. Editing a preset selection changes
the scan type to `CUSTOM`.

The comprehensive `ssl` module is the selectable SSL/TLS capability. The narrower
`tls` protocol scanner remains registered for legacy execution but is not selectable,
because its checks are already included in `ssl`.

The backend rejects empty, duplicate, unknown, unimplemented, non-selectable, or
target-incompatible module selections. It persists exactly the validated module IDs.

## Consequences

- The UI must wait for the live registry before offering module selection.
- Preset mappings must be intersected with selectable registry modules.
- Direct API and scheduled-scan submissions cannot bypass module availability rules.
- Existing persisted scans remain readable; this decision governs new submissions.

