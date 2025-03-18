import call from '../../utils/call'
import { useStorage } from '@vueuse/core'
import { ref, computed, reactive } from 'vue'

const onboardings = reactive({})

export function useOnboarding(appName) {
  const isOnboardingStepsCompleted = useStorage(
    'isOnboardingStepsCompleted' + appName,
    false,
  )

  const onboardingName = ref(appName + '_onboarding_status')

  const stepsCompleted = computed(
    () => onboardings[appName]?.filter((step) => step.completed).length || 0,
  )
  const totalSteps = computed(() => onboardings[appName]?.length || 0)

  const completedPercentage = computed(() =>
    Math.floor((stepsCompleted.value / totalSteps.value) * 100),
  )

  function skip(step, callback = null) {
    updateOnboardingStep(step, true, callback)
  }

  function skipAll(callback = null) {
    updateAll(true, false, callback)
  }

  function reset(callback = null) {
    updateAll(false, true, callback)
  }

  function updateOnboardingStep(step, skipped = false, callback = null) {
    if (isOnboardingStepsCompleted.value) return
    let user = window.user
    if (!user) return false

    if (!user.onboarding_status[onboardingName.value]) {
      user.onboarding_status[onboardingName.value] = onboardings[appName].map(
        (s) => {
          return { name: s.name, completed: false }
        },
      )
    }

    let _steps = user.onboarding_status[onboardingName.value]
    let index = _steps.findIndex((s) => s.name === step)
    if (index !== -1) {
      _steps[index].completed = true
      onboardings[appName][index].completed = true
    }

    window.user = user

    call('crm.api.onboarding.update_user_onboarding_status', {
      steps: JSON.stringify(_steps),
      appName,
    })

    callback?.(step, skipped)
  }

  function updateAll(value, reset = false, callback = null) {
    if (isOnboardingStepsCompleted.value && !reset) return
    let user = window.user
    if (!user) return false

    let _steps

    if (!user.onboarding_status[onboardingName.value]) {
      user.onboarding_status[onboardingName.value] = onboardings[appName].map(
        (s) => {
          return { name: s.name, completed: value }
        },
      )
      _steps = user.onboarding_status[onboardingName.value]
    } else {
      _steps = user.onboarding_status[onboardingName.value]
      _steps.forEach((step) => {
        step.completed = value
      })
    }

    onboardings[appName].forEach((step) => {
      step.completed = value
    })

    window.user = user

    call('crm.api.onboarding.update_user_onboarding_status', {
      steps: JSON.stringify(_steps),
      appName,
    })

    callback?.(reset)
  }

  function syncStatus() {
    if (isOnboardingStepsCompleted.value) return
    let user = window.user
    if (!user) return false

    if (user.onboarding_status[onboardingName.value]) {
      let _steps = user.onboarding_status[onboardingName.value]
      _steps.forEach((step, index) => {
        onboardings[appName][index].completed = step.completed
      })
      isOnboardingStepsCompleted.value = _steps.every((step) => step.completed)
    } else {
      isOnboardingStepsCompleted.value = false
    }
  }

  function setUp(steps) {
    if (onboardings[appName]) return

    onboardings[appName] = steps
    syncStatus()
  }

  return {
    steps: onboardings[appName],
    stepsCompleted,
    totalSteps,
    completedPercentage,
    isOnboardingStepsCompleted,
    updateOnboardingStep,
    skip,
    skipAll,
    reset,
    setUp,
    syncStatus,
  }
}
