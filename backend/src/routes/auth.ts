import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { authenticate, AuthRequest } from '../middleware/auth'
import { AuthService } from '../services/authService'
import { totpService } from '../services/totpService'
import { validateRequest } from '../middleware/validateRequest'
import { generateTokenSchema, twoFactorVerificationSchema } from '../schemas/auth.schema'

const router = Router()

// POST /api/auth/token - Generate JWT token
router.post(
  '/token',
  validateRequest({ body: generateTokenSchema }),
  async (req: Request, res: Response): Promise<void> => {
    const { publicKey, pendingToken, totpCode } = req.body
    const user = await prisma.user.upsert({
      where: { walletAddress: publicKey },
      update: { updatedAt: new Date() },
      create: { walletAddress: publicKey },
    })

    if (user.twoFactorEnabled) {
      if (!totpCode) {
        res.status(202).json({
          requiresTwoFactor: true,
          pendingToken: AuthService.generateTwoFactorChallenge(publicKey),
        })
        return
      }

      if (!pendingToken) {
        res.status(401).json({ error: 'Pending two-factor challenge is required' })
        return
      }

      try {
        AuthService.verifyTwoFactorChallenge(pendingToken, publicKey)
      } catch {
        res.status(401).json({ error: 'Invalid or expired two-factor challenge' })
        return
      }

      if (!user.twoFactorSecret || !totpService.verifyToken(user.twoFactorSecret, totpCode)) {
        res.status(401).json({ error: 'Invalid two-factor code' })
        return
      }

      const token = AuthService.generateToken(publicKey, { twoFactorVerified: true })
      res.json({ token, twoFactorEnabled: true })
      return
    }

    const token = AuthService.generateToken(publicKey)
    res.json({ token, twoFactorEnabled: false })
  }
)

router.get('/2fa/status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const walletAddress = req.user?.walletAddress
  if (!walletAddress) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const user = await prisma.user.findUnique({ where: { walletAddress } })
  res.json({
    enabled: user?.twoFactorEnabled ?? false,
    enabledAt: user?.twoFactorEnabledAt ?? null,
  })
})

router.post('/2fa/setup', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const walletAddress = req.user?.walletAddress
  if (!walletAddress) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const existingUser = await prisma.user.findUnique({ where: { walletAddress } })
  if (existingUser?.twoFactorEnabled) {
    res.status(400).json({ error: 'Two-factor authentication is already enabled' })
    return
  }

  const secret = totpService.generateSecret()
  const otpAuthUrl = totpService.buildOtpAuthUrl(secret, walletAddress)

  await prisma.user.upsert({
    where: { walletAddress },
    update: {
      twoFactorSecret: secret,
      twoFactorEnabled: false,
      twoFactorEnabledAt: null,
    },
    create: {
      walletAddress,
      twoFactorSecret: secret,
      twoFactorEnabled: false,
    },
  })

  res.json({
    secret,
    manualEntryKey: secret,
    otpAuthUrl,
  })
})

router.post(
  '/2fa/enable',
  authenticate,
  validateRequest({ body: twoFactorVerificationSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const walletAddress = req.user?.walletAddress
    if (!walletAddress) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const user = await prisma.user.findUnique({ where: { walletAddress } })
    if (!user?.twoFactorSecret) {
      res.status(400).json({ error: 'Two-factor setup has not been initialized' })
      return
    }

    if (!totpService.verifyToken(user.twoFactorSecret, req.body.totpCode)) {
      res.status(401).json({ error: 'Invalid two-factor code' })
      return
    }

    await prisma.user.update({
      where: { walletAddress },
      data: {
        twoFactorEnabled: true,
        twoFactorEnabledAt: new Date(),
      },
    })

    res.json({ success: true, enabled: true })
  }
)

router.post(
  '/2fa/disable',
  authenticate,
  validateRequest({ body: twoFactorVerificationSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const walletAddress = req.user?.walletAddress
    if (!walletAddress) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const user = await prisma.user.findUnique({ where: { walletAddress } })
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      res.status(400).json({ error: 'Two-factor authentication is not enabled' })
      return
    }

    if (!totpService.verifyToken(user.twoFactorSecret, req.body.totpCode)) {
      res.status(401).json({ error: 'Invalid two-factor code' })
      return
    }

    await prisma.user.update({
      where: { walletAddress },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorEnabledAt: null,
      },
    })

    res.json({ success: true, enabled: false })
  }
)

export const authRouter = router
