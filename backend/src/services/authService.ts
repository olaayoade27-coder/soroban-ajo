import dotenv from "dotenv"
import jwt from 'jsonwebtoken'
dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

const JWT_SECRET: string = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const TWO_FACTOR_CHALLENGE_EXPIRES_IN = process.env.TWO_FACTOR_CHALLENGE_EXPIRES_IN || '5m'
export interface JWTPayload {
  publicKey: string
  purpose?: 'auth' | 'two_factor'
  twoFactorVerified?: boolean
  iat?: number
  exp?: number
}

export class AuthService {
  static generateToken(
    publicKey: string,
    options: {
      expiresIn?: string
      purpose?: 'auth' | 'two_factor'
      twoFactorVerified?: boolean
    } = {}
  ): string {
    const {
      expiresIn = JWT_EXPIRES_IN,
      purpose = 'auth',
      twoFactorVerified = false,
    } = options

    return jwt.sign(
      { publicKey, purpose, twoFactorVerified },
      JWT_SECRET,
      { expiresIn } as jwt.SignOptions
    )
  }

  static verifyToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  }

  static generateTwoFactorChallenge(publicKey: string): string {
    return this.generateToken(publicKey, {
      expiresIn: TWO_FACTOR_CHALLENGE_EXPIRES_IN,
      purpose: 'two_factor',
      twoFactorVerified: false,
    })
  }

  static verifyTwoFactorChallenge(token: string, publicKey: string): JWTPayload {
    const payload = this.verifyToken(token)

    if (payload.purpose !== 'two_factor' || payload.publicKey !== publicKey) {
      throw new Error('Invalid two-factor challenge token')
    }

    return payload
  }
}
