# [Feature or Operation Name]

**Status:** Draft | Provisional | Accepted
**Last Updated:** YYYY-MM-DD

## Overview

[Brief narrative description (1-3 sentences) explaining what users can do with this feature. Include any relevant response format descriptions or constraints.]

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | [Description of what the system must do] |
| **FR-2** | [Another requirement] |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | [When condition is true] | [HTTP status] | `ERROR_CODE` | |
| **VR-N** | [Success case] | [200 OK / 201] | - | |

### Validation Notes

[Optional section for additional validation implementation details]

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | [Performance, scalability, or quality attribute] |
| **NFR-2** | [Another non-functional concern] |

## Open Questions

1. [Question about unclear aspect or design decision]
2. [Another question if applicable]

---

## Template Usage Notes

### Status Values
- **Draft**: Initial documentation, subject to significant changes
- **Provisional**: Under review, minor changes expected
- **Accepted**: Approved for implementation

### Naming Convention
- Files: `NNN-hyphenated-name.md` (e.g., `001-register-address.md`)
- Sequential numbering within each directory

### ID Conventions
- Functional Requirements: `FR-N` (sequential starting at 1)
- Validation Requirements: `VR-N` (sequential starting at 1)
- Non-Functional Requirements: `NFR-N` (sequential starting at 1)

### Error Code Style
- Use `SCREAMING_SNAKE_CASE` format
- Common patterns: `NAME_REQUIRED`, `VALUE_INVALID`, `NOT_FOUND`

### Validation Error Subtypes
When error code is `VALIDATION_ERROR`, specify subtype:
- `VALUE_REQUIRED`
- `STRING_LENGTH_INVALID`
- `STRING_FORMAT_INVALID`
- `ENUM_VALUE_INVALID`
- `REFERENCE_NOT_FOUND`
- `REFERENCE_INVALID`
- `TIMESTAMP_OUT_OF_RANGE`

### Cross-References
Use relative markdown links: `[text](filename.md)` or `[text](../path/filename.md)`
