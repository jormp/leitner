const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  }
  return value;
};

export const config = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  trustProxy: Number(process.env.TRUST_PROXY || 1),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  appUrl: (process.env.APP_URL || 'http://localhost:8080').replace(/\/$/, ''),
  timezone: process.env.APP_TIMEZONE || 'Europe/Madrid',
  verificationTtlHours: Number(process.env.VERIFICATION_TTL_HOURS || 24),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'No-Reply <no-reply@example.com>',
  },
};
