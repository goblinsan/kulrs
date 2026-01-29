import { jest } from '@jest/globals';
import type { Auth } from 'firebase-admin/auth';

export const mockVerifyIdToken = jest.fn();

const mockAuth: Partial<Auth> = {
  verifyIdToken: mockVerifyIdToken as Auth['verifyIdToken'],
};

export function getAuth(): Auth {
  return mockAuth as Auth;
}

export function initializeFirebase() {
  return {};
}
