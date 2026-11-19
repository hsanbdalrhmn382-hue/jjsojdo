/**
 * TOP CODES | توب كود — Dirty Dozen Security Rules Verification Spec
 * Maps each of the 12 adversarial payloads in security_spec.md to expected PERMISSION_DENIED outcomes.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Coupon Create',
    collection: 'coupons/c1',
    operation: 'create',
    auth: null,
    payload: { code: 'HACK20', discountPercent: 20 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Regular User Coupon Create',
    collection: 'coupons/c2',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: { code: 'USER50', discountPercent: 50, createdBy: 'user_1' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Moderator Coupon Update',
    collection: 'coupons/c1',
    operation: 'update',
    auth: { uid: 'mod_1', email: 'mod@example.com', email_verified: true },
    payload: { status: 'expired' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Regular User Coupon Delete',
    collection: 'coupons/c1',
    operation: 'delete',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Self-Role Escalation on Signup',
    collection: 'users/user_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: { uid: 'user_1', email: 'user1@example.com', fullName: 'Attacker', role: 'admin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Self-Role Escalation on Update',
    collection: 'users/user_1',
    operation: 'update',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: { role: 'admin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Shadow Ghost Field Injection',
    collection: 'favorites/user_1_c1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: { userId: 'user_1', couponId: 'c1', isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Spoofed Admin Email Without Verification',
    collection: 'coupons/c3',
    operation: 'create',
    auth: { uid: 'spoof_1', email: 'hsanbdalrhmn382@gmail.com', email_verified: false },
    payload: { code: 'SPOOF99', discountPercent: 99 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'PII Blanket User List Scraping',
    collection: 'users',
    operation: 'list',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Cross-User Favorite Spoofing',
    collection: 'favorites/user_2_c1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: { userId: 'user_2', couponId: 'c1' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Report Pre-Approved Status Bypass',
    collection: 'reports/r1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: { couponId: 'c1', userId: 'user_1', reason: 'fake', status: 'resolved' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'ID Poisoning Over 128 Chars',
    collection: `coupons/${'a'.repeat(200)}`,
    operation: 'create',
    auth: { uid: 'admin_1', email: 'hsanbdalrhmn382@gmail.com', email_verified: true },
    payload: { code: 'LONGID' },
    expected: 'PERMISSION_DENIED',
  },
];
