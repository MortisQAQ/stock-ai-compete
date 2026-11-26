import { useTranslation } from 'react-i18next'

import { BenchLayout } from '../components/training/BenchLayout'
import { formatTask } from '../i18n/helpers'
import { useTraining } from '../store/TrainingProvider'

/**
 * 实战工作台 —— 与历史训练场共享 UI 布局、会话流与镜像台账基建。
 */
export function LiveWorkbenchPage() {
  const { liveCurrent } = useTraining()
  const { t } = useTranslation()
  const view = formatTask(liveCurrent, t)
  return <BenchLayout task={liveCurrent} srTitle={t('training.liveSrTitle', { name: view.name })} />
}
