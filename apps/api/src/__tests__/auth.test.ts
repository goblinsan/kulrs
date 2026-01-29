import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { Response, NextFunction } from 'express';
import {
  verifyFirebaseToken,
  AuthenticatedRequest,
} from '../middleware/auth.js';

// Mock Firebase getAuth
const mockVerifyIdToken = jest.fn<() => Promise<unknown>>();
const mockGetAuth = jest.fn(() => ({
  verifyIdToken: mockVerifyIdToken,
}));

// Mock the firebase module
jest.unstable_mockModule('../config/firebase.js', () => ({
  getAuth: mockGetAuth,
}));

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    const statusMock = jest.fn().mockReturnThis();
    const jsonMock = jest.fn().mockReturnThis();
    mockResponse = {
      status: statusMock as unknown as Response['status'],
      json: jsonMock as unknown as Response['json'],
    };
    nextFunction = jest.fn() as unknown as NextFunction;
    mockVerifyIdToken.mockReset();
    mockGetAuth.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyFirebaseToken', () => {
    it('should reject requests without authorization header', async () => {
      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid authorization header format', async () => {
      mockRequest.headers = { authorization: 'InvalidFormat token' };

      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid token', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockVerifyIdToken).toHaveBeenCalledWith('invalid-token');
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should accept requests with valid token', async () => {
      const mockDecodedToken = {
        uid: 'test-uid-123',
        email: 'test@example.com',
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);

      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
      expect(mockRequest.user).toEqual({
        uid: 'test-uid-123',
        email: 'test@example.com',
      });
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should attach user info without email if not provided', async () => {
      const mockDecodedToken = {
        uid: 'test-uid-123',
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);

      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toEqual({
        uid: 'test-uid-123',
        email: undefined,
      });
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
