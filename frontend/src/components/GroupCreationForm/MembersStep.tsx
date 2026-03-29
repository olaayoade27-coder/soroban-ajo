import React from 'react'
import { WizardStep } from '../wizard/WizardStep'
import { GroupFormData } from './types'

interface MembersStepProps {
  formData: GroupFormData
  memberInput: string
  onNext: () => void
  onBack: () => void
  onMemberInputChange: (value: string) => void
  onAddMember: () => void
  onRemoveMember: (member: string) => void
}

/**
 * Step 3: Invite Members
 */
export const MembersStep: React.FC<MembersStepProps> = ({
  formData,
  memberInput,
  onNext,
  onBack,
  onMemberInputChange,
  onAddMember,
  onRemoveMember,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onAddMember()
    }
  }

  return (
    <WizardStep
      title="Invite Members"
      description="Add wallet addresses to invite (optional)"
      onBack={onBack}
      onNext={onNext}
    >
      <div className="flex gap-2">
        <input
          type="text"
          value={memberInput}
          onChange={(e) => onMemberInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter wallet address or email"
          className="glass-input flex-1 px-4 py-3 rounded-lg"
        />
        <button
          type="button"
          onClick={onAddMember}
          className="px-5 py-3 glass-card-subtle hover:glass-card-interactive text-surface-700 dark:text-surface-300 font-medium rounded-lg transition"
        >
          Add
        </button>
      </div>
      {formData.invitedMembers.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {formData.invitedMembers.map((m) => (
            <span
              key={m}
              className="inline-flex items-center gap-2 px-3 py-1.5 glass-card-subtle text-primary-700 dark:text-primary-300 rounded-lg text-sm"
            >
              {m}
              <button
                type="button"
                onClick={() => onRemoveMember(m)}
                aria-label={`Remove ${m}`}
                className="font-bold hover:text-red-500"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {formData.invitedMembers.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
          No members added yet. You can skip this step.
        </p>
      )}
    </WizardStep>
  )
}
