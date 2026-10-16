'use client'

import { useEffect, useState } from 'react'
import { Joyride, Step, STATUS } from 'react-joyride'
import { useTranslation } from 'react-i18next'

interface Props {
  runTour: boolean
  onClose: () => void
}

export default function ProductTour({ runTour, onClose }: Props) {
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleJoyrideCallback = (data: any) => {
    const { status } = data
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED]

    if (finishedStatuses.includes(status)) {
      onClose()
    }
  }

  const steps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      title: t('tour.welcome_title'),
      content: t('tour.welcome_content'),
    },
    {
      target: '#tour-nav',
      title: t('tour.nav_title'),
      content: t('tour.nav_content'),
      placement: 'right',
    },
    {
      target: '#tour-search',
      title: t('tour.search_title'),
      content: t('tour.search_content'),
      placement: 'bottom',
    },
    {
      target: '#tour-lang',
      title: t('tour.lang_title'),
      content: t('tour.lang_content'),
      placement: 'bottom',
    },
    {
      target: '#tour-logout',
      title: t('tour.logout_title'),
      content: t('tour.logout_content'),
      placement: 'bottom-end',
    }
  ]

  if (!mounted) return null

  return (
    // @ts-ignore
    <Joyride
      steps={steps}
      run={runTour}
      continuous
      scrollToFirstStep
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      locale={{
        back: t('tour.back'),
        close: t('tour.close'),
        last: t('tour.last'),
        next: t('tour.next'),
        skip: t('tour.skip'),
      }}
      styles={{
        options: {
          primaryColor: '#2563eb', // Matches blue in reference image
          zIndex: 10000,
        },
        tooltip: {
          backgroundColor: '#1c1c1c', // Dark tooltip
          color: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipTitle: {
          fontSize: '16px',
          fontWeight: 600,
          marginBottom: '8px',
        },
        tooltipContent: {
          fontSize: '14px',
          color: '#d4d4d4', // Lighter gray text
        },
        buttonNext: {
          backgroundColor: '#2563eb',
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: 500,
        },
        buttonBack: {
          color: '#a3a3a3',
          marginRight: '8px',
          fontSize: '13px',
        },
        buttonSkip: {
          color: '#a3a3a3',
          fontSize: '13px',
        }
      }}
    />
  )
}
