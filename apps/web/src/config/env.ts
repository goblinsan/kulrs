// Environment configuration for the web application
// This file demonstrates how to access Vite environment variables

type AppEnvironment = 'development' | 'staging' | 'production';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface EnvConfig {
  apiUrl: string;
  appEnv: AppEnvironment;
  enableDebug: boolean;
  firebase: FirebaseConfig;
}

// Valid application environments
const VALID_ENVIRONMENTS: AppEnvironment[] = [
  'development',
  'staging',
  'production',
];

/**
 * Get the current environment configuration
 * All environment variables must be prefixed with VITE_ to be accessible
 */
export function getEnvConfig(): EnvConfig {
  return {
    // API base URL - required
    apiUrl:
      import.meta.env.VITE_API_URL ||
      'https://kulrs-api-jyedwyfhdq-uc.a.run.app',

    // Application environment - required
    appEnv: (import.meta.env.VITE_APP_ENV as AppEnvironment) || 'production',

    // Debug mode - optional, defaults to false
    enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',

    // Firebase configuration - required for authentication
    firebase: {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId:
        import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    },
  };
}

/**
 * Validate that all required environment variables are set
 * Call this early in your application bootstrap
 */
export function validateEnv(): void {
  const config = getEnvConfig();

  if (!config.apiUrl) {
    throw new Error('VITE_API_URL environment variable is required');
  }

  if (!VALID_ENVIRONMENTS.includes(config.appEnv)) {
    console.warn(
      `Invalid VITE_APP_ENV: ${config.appEnv}. Should be one of: ${VALID_ENVIRONMENTS.join(', ')}`
    );
  }

  // Validate Firebase configuration
  const requiredFirebaseVars = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ] as const;

  const missingVars = requiredFirebaseVars.filter(key => !config.firebase[key]);

  if (missingVars.length > 0) {
    // Map camelCase to UPPER_SNAKE_CASE for Firebase env vars
    const envVarNames = missingVars.map(v => {
      const upperSnake = v
        .replace(/([A-Z])/g, '_$1')
        .toUpperCase()
        .replace(/^_/, '');
      return `VITE_FIREBASE_${upperSnake}`;
    });
    throw new Error(
      `Missing required Firebase environment variables: ${envVarNames.join(', ')}`
    );
  }
}

// Export individual values for convenience
export const { apiUrl, appEnv, enableDebug, firebase } = getEnvConfig();
