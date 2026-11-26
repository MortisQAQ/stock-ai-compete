import { useTranslation } from 'react-i18next'

import { BenchLayout } from '../components/training/BenchLayout'
import { formatTask } from '../i18n/helpers'
import { useTraining } from '../store/TrainingProvider'

/**
 * 历史训练场 —— 复用通用工作台布局，读取历史训练任务上下文。
 */
export function TrainingPage() {
  const { current } = useTraining()
  const { t } = useTranslation()
  const view = formatTask(current, t)
  return <BenchLayout task={current} srTitle={t('training.srTitle', { name: view.name })} />
}
