export interface GroupFormData {
  groupName: string
  description: string
  cycleLength: number
  contributionAmount: number
  maxMembers: number
  frequency: 'weekly' | 'monthly'
  duration: number
  invitedMembers: string[]
}

export interface FormErrors {
  groupName?: string
  description?: string
  cycleLength?: string
  contributionAmount?: string
  maxMembers?: string
}

export interface GroupCreationFormProps {
  onSuccess?: () => void
}
