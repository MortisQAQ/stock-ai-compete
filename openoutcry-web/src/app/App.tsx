import { RouterProvider } from 'react-router-dom'

import { DialogProvider } from '../store/DialogProvider'
import { LocaleProvider } from '../store/LocaleProvider'
import { RunProvider } from '../store/RunProvider'
import { ToastProvider } from '../store/ToastProvider'
import { router } from './router'

/**
 * 应用装配：Provider 的顺序就是依赖方向。
 *
 * LocaleProvider 在最外层，统一管理双语（ZH/EN）、演示主题（Dark/Light）与涨跌色习惯。
 * ToastProvider 独立于 RunProvider，避免通知层寄生在运行状态机内。
 */
export default function App() {
  return (
    <LocaleProvider>
      <ToastProvider>
        <RunProvider>
          <DialogProvider>
            <RouterProvider router={router} />
          </DialogProvider>
        </RunProvider>
      </ToastProvider>
    </LocaleProvider>
  )
}
