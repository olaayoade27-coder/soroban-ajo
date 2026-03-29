import React from 'react'
import { WizardStep } from '../wizard/WizardStep'
import { FormField } from './FormComponents'
import { GroupFormData, FormErrors } from './types'

interface SettingsStepProps {
  formData: GroupFormData
  errors: FormErrors
  touched: Record<string, boolean>
  onNext: () => void
  onBack: () => void
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void
}

/**
 * Step 2: Group Settings
 */
export const SettingsStep: React.FC<SettingsStepProps> = ({
  formData,
  errors,
  touched,
  onNext,
  onBack,
  onChange,
  onBlur,
}) => {
  const inputCls = (name: keyof FormErrors) =>
    `glass-input w-full px-4 py-3 rounded-lg transition ${
      touched[name] && errors[name] ? 'border-red-500' : ''
    }`

  return (
    <WizardStep
      title="Group Settings"
      description="Configure contribution rules and schedule"
      onBack={onBack}
      onNext={onNext}
      canProceed={
        !errors.cycleLength &&
        !errors.contributionAmount &&
        !errors.maxMembers
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField
          id="cycleLength"
          label="Cycle Length (days) *"
          touched={touched.cycleLength}
          error={errors.cycleLength}
          input={
            <input
              id="cycleLength"
              name="cycleLength"
              type="number"
              min="1"
              max="365"
              value={formData.cycleLength}
              onChange={onChange}
              onBlur={onBlur}
              className={inputCls('cycleLength')}
              aria-required="true"
            />
          }
        />
        <FormField
          id="contributionAmount"
          label="Contribution Amount ($) *"
          touched={touched.contributionAmount}
          error={errors.contributionAmount}
          input={
            <input
              id="contributionAmount"
              name="contributionAmount"
              type="number"
              step="0.01"
              min="0"
              value={formData.contributionAmount}
              onChange={onChange}
              onBlur={onBlur}
              className={inputCls('contributionAmount')}
              aria-required="true"
            />
          }
        />
      </div>
      <FormField
        id="maxMembers"
        label="Max Members *"
        touched={touched.maxMembers}
        error={errors.maxMembers}
        input={
          <input
            id="maxMembers"
            name="maxMembers"
            type="number"
            min="2"
            max="50"
            value={formData.maxMembers}
            onChange={onChange}
            onBlur={onBlur}
            className={inputCls('maxMembers')}
            aria-required="true"
          />
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label
            htmlFor="frequency"
            className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
          >
            Frequency
          </label>
          <select
            id="frequency"
            name="frequency"
            value={formData.frequency}
            onChange={onChange}
            className="glass-input w-full px-4 py-3 rounded-lg"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="duration"
            className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
          >
            Duration (cycles)
          </label>
          <input
            id="duration"
            name="duration"
            type="number"
            min="1"
            value={formData.duration}
            onChange={onChange}
            className="glass-input w-full px-4 py-3 rounded-lg"
          />
        </div>
      </div>
    </WizardStep>
  )
}
