# TOP CODES | توب كود — Firestore Security Specification

## 1. Data Invariants
1. **Admin-Only Catalog Control**: Only verified `admin` users (`hsanbdalrhmn382@gmail.com` with `email_verified == true` or `users/{uid}.role == 'admin'`) may `create`, `update`, or `delete` documents in `coupons`, `stores`, and `categories`.
2. **No Self-Assigned Roles (Anti-Privilege Escalation)**: Users creating their own `users/{uid}` profile MUST set `role == 'user'` (unless already an Admin) and cannot modify `role`, `uid`, `email`, or `createdAt` on update.
3. **PII Isolation**: `users/{userId}` contains `email` and is readable ONLY by the document owner or staff (`isModeratorOrAdmin()`). Blanket `isSignedIn()` reads on `users` are strictly forbidden.
4. **Relational Existence**: `coupons` must reference an existing `stores/{storeId}`; `favorites`, `coupon_votes`, `coupon_uses`, and `reports` must reference an existing `coupons/{couponId}`.
5. **Immutable Audit & Ownership Fields**: `createdAt`, `userId`, `uid`, `couponId`, and `createdBy` are immutable after creation. Server time (`request.time`) is strictly enforced on `createdAt` and `updatedAt`.
6. **Terminal Report Locking**: Once a `reports/{reportId}` reaches `'resolved'` or `'dismissed'`, only an `admin` may reopen or alter it.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Coupon Create**: Anonymous caller tries `create` on `/coupons/c1`.
2. **Regular User Coupon Create**: Authenticated `role: 'user'` tries `create` on `/coupons/c2`.
3. **Moderator Coupon Update**: Authenticated `role: 'moderator'` tries `update` on `/coupons/c1` (`status: 'expired'`).
4. **Regular User Coupon Delete**: Authenticated `role: 'user'` tries `delete` on `/coupons/c1`.
5. **Self-Role Escalation on Signup**: Authenticated user tries `create` on `/users/{uid}` with `role: 'admin'`.
6. **Self-Role Escalation on Update**: Authenticated user tries `update` on `/users/{uid}` changing `role` to `'admin'`.
7. **Shadow Ghost Field Injection**: User creates `/favorites/{id}` with extra field `isAdmin: true`.
8. **Spoofed Email Claim Without Verification**: Unverified token (`email_verified: false`) claiming admin email tries `create` on `/coupons/c3`.
9. **PII Blanket List Scraping**: Regular user attempts `list` on `/users` or `get` on another user's `/users/{otherUid}`.
10. **Cross-User Favorite Spoofing**: User A tries `create` on `/favorites/f1` with `userId: 'userB'`.
11. **Report Pre-Approved Status Bypass**: Regular user tries `create` on `/reports/r1` with `status: 'resolved'`.
12. **Client-Forged Timestamp / ID Poisoning**: Caller injects 1500-char document ID or `createdAt` backdated to 2020.
