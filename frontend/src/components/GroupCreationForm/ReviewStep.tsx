import React from 'react'
import { WizardStep } from '../wizard/WizardStep'
import { GroupPreview } from '../group/GroupPreview'
import { GroupFormData } from './types'

interface ReviewStepProps {
  formData: GroupFormData
  onBack: () => void
  onSubmit: () => void
  isLoading: boolean
}

/**
 * Step 4: Review & Create
 */
export const ReviewStep: React.FC<ReviewStepProps> = ({
  formData,
  onBack,
  onSubmit,
  isLoading,
}) => {
  return (
    <WizardStep
      title="Review & Create"
      description="Confirm your group details before creating"
      onBack={onBack}
      onNext={onSubmit}
      nextLabel={isLoading ? 'Creating...' : 'Create Group'}
      isLastStep
      isLoading={isLoading}
    >
      <GroupPreview data={formData} />
    </WizardStep>
  )
}
