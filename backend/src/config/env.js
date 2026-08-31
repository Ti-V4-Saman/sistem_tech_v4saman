import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const requiredInProduction = ['JWT_SECRET', 'ENCRYPTION_KEY'];

if (process.env.APP_ENV === 'production') {
  const missing = requiredInProduction.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export const env = {
  appEnv: process.env.APP_ENV || 'development',
  port: Number(process.env.APP_PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || '',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'techhub',
  },
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  organization: {
    name: process.env.DEFAULT_ORG_NAME || 'V4 Company',
    slug: process.env.DEFAULT_ORG_SLUG || 'v4company',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    allowedDomain: process.env.GOOGLE_ALLOWED_DOMAIN || 'v4company.com',
  },
  encryptionKey: process.env.ENCRYPTION_KEY || 'dev-only-change-me-32-bytes-minimum',
  n8n: {
    host: process.env.N8N_DB_HOST,
    port: Number(process.env.N8N_DB_PORT || 5432),
    user: process.env.N8N_DB_USER,
    password: process.env.N8N_DB_PASSWORD,
    database: process.env.N8N_DB_NAME,
    baseUrl: process.env.N8N_BASE_URL,
  },
  typebot: {
    host: process.env.TYPEBOT_DB_HOST,
    port: Number(process.env.TYPEBOT_DB_PORT || 5432),
    user: process.env.TYPEBOT_DB_USER,
    password: process.env.TYPEBOT_DB_PASSWORD,
    database: process.env.TYPEBOT_DB_NAME,
    viewerBaseUrl: process.env.TYPEBOT_VIEWER_BASE_URL,
    editorBaseUrl: process.env.TYPEBOT_EDITOR_BASE_URL,
  },
};
