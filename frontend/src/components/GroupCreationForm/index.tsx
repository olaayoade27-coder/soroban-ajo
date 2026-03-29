/**
 * @file GroupCreationForm.tsx
 * @description A multi-step form for creating new savings groups on the Soroban blockchain.
 * Refactored into smaller, focused sub-components following atomic design principles.
 */

import React, { useState, useRef, useEffect } from 'react'
import { useFormDraft } from '../../hooks/useFormDraft'
import { useCreateGroup } from '../../hooks/useContractData'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { StepIndicator } from '../wizard/StepIndicator'
import { BasicInfoStep } from './BasicInfoStep'
import { SettingsStep } from './SettingsStep'
import { MembersStep } from './MembersStep'
import { ReviewStep } from './ReviewStep'
import { ErrorSummary } from './FormComponents'
import { validateField, validateStep, validateForm } from './validation'
import { GroupFormData, FormErrors, GroupCreationFormProps } from './types'

const WIZARD_STEPS = ['Basic Info', 'Settings', 'Members', 'Review']

/**
 * A comprehensive form component for creating a new Ajo savings group.
 * Integrates with `useCreateGroup` for blockchain interaction and `useFormDraft`
 * for preserving user input across sessions.
 *
 * @param props - Component properties
 * @returns {React.ReactElement} The rendered creation form
 */
export const GroupCreationForm: React.FC<GroupCreationFormProps> = ({
  onSuccess,
}) => {
  const router = useRouter()
  const createGroupMutation = useCreateGroup()
  const [step, setStep] = useState(1)

  const [formData, setFormData] = useState<GroupFormData>({
    groupName: '',
    description: '',
    cycleLength: 30,
    contributionAmount: 100,
    maxMembers: 10,
    frequency: 'monthly',
    duration: 12,
    invitedMembers: [],
  })
  const [memberInput, setMemberInput] = useState('')

  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const groupNameRef = useRef<HTMLInputElement>(null)

  const loading = createGroupMutation.isPending

  const isDirty = Object.values(formData).some((value) => {
    if (Array.isArray(value)) return value.length > 0
    return value !== '' && value !== 0
  })

  const { removeDraft } = useFormDraft({
    key: 'draft_group_creation',
    data: formData,
    onRestore: (draft) => setFormData(draft),
    enabled: isDirty,
  })

  // Focus on error summary when errors occur after submission
  useEffect(() => {
    if (submitted && Object.keys(errors).length > 0) {
      errorSummaryRef.current?.focus()
    }
  }, [errors, submitted])

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setTouched({ ...touched, [name]: true })
    const error = validateField(name, value)
    setErrors({ ...errors, [name]: error })
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target
    let processedValue: string | number = value
    if (
      name === 'cycleLength' ||
      name === 'contributionAmount' ||
      name === 'maxMembers' ||
      name === 'duration'
    ) {
      const numValue = parseFloat(value)
      processedValue = isNaN(numValue) ? 0 : numValue
    }
    setFormData({ ...formData, [name]: processedValue })
    if (touched[name]) {
      const error = validateField(name, processedValue)
      setErrors({ ...errors, [name]: error })
    }
  }

  const handleNext = () => {
    const { valid, errors: stepErrors } = validateStep(step, formData, errors)
    setErrors(stepErrors)
    if (valid) setStep((s) => s + 1)
  }

  const handleAddMember = () => {
    if (
      memberInput.trim() &&
      !formData.invitedMembers.includes(memberInput.trim())
    ) {
      setFormData({
        ...formData,
        invitedMembers: [...formData.invitedMembers, memberInput.trim()],
      })
      setMemberInput('')
    }
  }

  const handleRemoveMember = (member: string) => {
    setFormData({
      ...formData,
      invitedMembers: formData.invitedMembers.filter((m) => m !== member),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const newErrors = validateForm(formData)
    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      errorSummaryRef.current?.focus()
      return
    }

    try {
      const result = await createGroupMutation.mutateAsync({
        groupName: formData.groupName,
        cycleLength: formData.cycleLength,
        contributionAmount: formData.contributionAmount,
        maxMembers: formData.maxMembers,
      })
      removeDraft()
      toast.success(`Group "${formData.groupName}" created successfully!`)
      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/groups/${result.groupId}`)
      }
    } catch (err) {
      console.error('Failed to create group:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to create group'
      )
    }
  }

  return (
    <div className="glass-form p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50 mb-1">
          Create a New Group
        </h1>
        <p className="text-surface-500 dark:text-surface-400">
          Set up your savings group and invite members to join
        </p>
      </div>

      <StepIndicator steps={WIZARD_STEPS} currentStep={step} />

      <ErrorSummary ref={errorSummaryRef} errors={errors} submitted={submitted} />

      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        {step === 1 && (
          <BasicInfoStep
            formData={formData}
            errors={errors}
            touched={touched}
            onNext={handleNext}
            onChange={handleChange}
            onBlur={handleBlur}
            groupNameRef={groupNameRef}
          />
        )}

        {step === 2 && (
          <SettingsStep
            formData={formData}
            errors={errors}
            touched={touched}
            onNext={handleNext}
            onBack={() => setStep(1)}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        )}

        {step === 3 && (
          <MembersStep
            formData={formData}
            memberInput={memberInput}
            onNext={handleNext}
            onBack={() => setStep(2)}
            onMemberInputChange={setMemberInput}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
          />
        )}

        {step === 4 && (
          <ReviewStep
            formData={formData}
            onBack={() => setStep(3)}
            onSubmit={handleSubmit}
            isLoading={loading}
          />
        )}
      </form>
    </div>
  )
}
