import { RouterProvider } from 'react-router-dom'

import { syncLocaleDom } from '../store/LocaleProvider'
import { router } from './router'

syncLocaleDom()

/**
 * 应用装配：全局状态由 Zustand stores 托管，无需嵌套 Context Provider。
 */
export default function App() {
  return <RouterProvider router={router} />
}
