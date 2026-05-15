# Security Specification for TrustPoster AI

## 1. Data Invariants
- A scan record MUST belong to a valid authenticated user (`userId == auth.uid`).
- A scan record MUST have a valid verdict (`FAKE` or `GENUINE`).
- Timestamps MUST be server-generated.
- Users can only read and delete their own scan history.

## 2. The "Dirty Dozen" Payloads
1. Attempt to create a scan with a different `userId`.
2. Attempt to create a scan without an authenticated session.
3. Attempt to read another user's scan by ID.
4. Attempt to update a scan (scans should be immutable after creation).
5. Attempt to use a client-side timestamp instead of `request.time`.
6. Attempt to inject a massive string into the `verdict` field.
7. Attempt to delete a scan belonging to another user.
8. Attempt to list all scans for the entire collection without a filter.
9. Attempt to create a scan with missing required fields (e.g., no `verdict`).
10. Attempt to create a scan with an invalid `verdict` value (e.g., `LEGIT`).
11. Attempt to bypass `userId` check by providing a null `userId`.
12. Attempt to inject a script tag into the `explanation` field.

## 3. Test Runner
(Omitted for brevity in this step, but would normally be in `firestore.rules.test.ts`)
