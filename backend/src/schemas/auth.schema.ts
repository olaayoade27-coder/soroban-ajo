import { z } from 'zod'
import { stellarPublicKeySchema } from './common.schema'

export const generateTokenSchema = z.object({
  publicKey: stellarPublicKeySchema,
  pendingToken: z.string().min(1).optional(),
  totpCode: z
    .string()
    .regex(/^\d{6}$/, 'TOTP code must be 6 digits')
    .optional(),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

export const twoFactorVerificationSchema = z.object({
  totpCode: z.string().regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
})

export type GenerateTokenInput = z.infer<typeof generateTokenSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
export type TwoFactorVerificationInput = z.infer<typeof twoFactorVerificationSchema>
