import { RouterProvider } from 'react-router-dom'

import { DialogProvider } from '../store/DialogProvider'
import { RunProvider } from '../store/RunProvider'
import { ToastProvider } from '../store/ToastProvider'
import { router } from './router'

/**
 * 应用装配：Provider 的顺序就是依赖方向。
 *
 * ToastProvider 在最外层 —— 运行状态机的动作会提示（"订单已提交"），
 * 但提示本身不依赖运行状态。反过来嵌套就回到了「toast 寄生在 RunProvider 里」。
 */
export default function App() {
  return (
    <ToastProvider>
      <RunProvider>
        <DialogProvider>
          <RouterProvider router={router} />
        </DialogProvider>
      </RunProvider>
    </ToastProvider>
  )
}
