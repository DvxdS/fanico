import * as Joi from 'joi';

/**
 * Joi schema validating process env at boot. @nestjs/config runs this and
 * throws (fail-fast) if DATABASE_URL or JWT_SECRET are missing/malformed.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
  JWT_SECRET: Joi.string().min(1).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  WHATSAPP_ENABLED: Joi.boolean().default(false),
});
