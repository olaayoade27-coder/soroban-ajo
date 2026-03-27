'use client'

import React, { useEffect, useState } from 'react'
import type { TwoFactorSetupResponse, TwoFactorStatusResponse } from '@/types/auth'

import { QRCodeSVG } from 'qrcode.react'
import { authService } from '@/services/authService'
import toast from 'react-hot-toast'
import { useAuthContext } from '@/context/AuthContext'

export function TwoFactorSettings() {
  const { session } = useAuthContext()
  const [status, setStatus] = useState<TwoFactorStatusResponse | null>(null)
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const token =
    session?.token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null)

  const loadStatus = async () => {
    if (!token) {
      setIsLoading(false)
      return
    }

    try {
      const nextStatus = await authService.getTwoFactorStatus(token)
      setStatus(nextStatus)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load 2FA status')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadStatus()
  }, [token])

  const handleStartSetup = async () => {
    if (!token) return

    setIsSubmitting(true)
    try {
      const data = await authService.setupTwoFactor(token)
      setSetupData(data)
      toast.success('Scan the QR code with Google Authenticator or any TOTP app')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start 2FA setup')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEnable = async () => {
    if (!token) return

    setIsSubmitting(true)
    try {
      await authService.enableTwoFactor(token, verificationCode)
      setSetupData(null)
      setVerificationCode('')
      await loadStatus()
      toast.success('Two-factor authentication enabled')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to enable 2FA')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDisable = async () => {
    if (!token) return

    setIsSubmitting(true)
    try {
      await authService.disableTwoFactor(token, disableCode)
      setDisableCode('')
      await loadStatus()
      toast.success('Two-factor authentication disabled')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to disable 2FA')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 p-6 text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400">
        Loading security settings...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
          Two-Factor Authentication
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Protect your wallet session with a time-based one-time password from Google Authenticator
          or a compatible app.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-slate-700 dark:bg-slate-900/40">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Status</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              {status?.enabled ? 'Enabled for this wallet' : 'Not enabled yet'}
            </p>
            {status?.enabledAt && (
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                Enabled on {new Date(status.enabledAt).toLocaleString()}
              </p>
            )}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${status?.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}
          >
            {status?.enabled ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {!status?.enabled && !setupData && (
        <button
          onClick={handleStartSetup}
          disabled={isSubmitting || !token}
          className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          Set up 2FA
        </button>
      )}

      {setupData && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950/30">
          <div className="grid gap-6 lg:grid-cols-[220px,1fr]">
            <div className="flex justify-center">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <QRCodeSVG value={setupData.otpAuthUrl} size={180} includeMargin />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  1. Scan the QR code
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                  Open Google Authenticator, Authy, or another TOTP app and add a new account.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  2. Or enter the key manually
                </p>
                <p className="mt-2 break-all rounded-lg bg-white px-3 py-2 font-mono text-sm text-gray-800 dark:bg-slate-900 dark:text-slate-100">
                  {setupData.manualEntryKey}
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-slate-100">
                  3. Confirm with a 6-digit code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(event) =>
                    setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-xl tracking-[0.35em] text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  placeholder="123456"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleEnable}
                  disabled={verificationCode.length !== 6 || isSubmitting}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  Confirm and enable
                </button>
                <button
                  onClick={() => {
                    setSetupData(null)
                    setVerificationCode('')
                  }}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {status?.enabled && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
          <h4 className="text-sm font-semibold text-red-800 dark:text-red-300">Disable 2FA</h4>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">
            Enter a current authenticator code to turn off two-factor authentication.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={disableCode}
              onChange={(event) =>
                setDisableCode(event.target.value.replace(/\D/g, '').slice(0, 6))
              }
              className="w-full rounded-lg border border-red-200 px-4 py-3 text-center text-xl tracking-[0.35em] text-gray-900 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 dark:border-red-900 dark:bg-slate-900 dark:text-white"
              placeholder="123456"
            />
            <button
              onClick={handleDisable}
              disabled={disableCode.length !== 6 || isSubmitting}
              className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              Disable
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
