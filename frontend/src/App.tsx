import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'

import { ProtectedRoute, PublicOnlyRoute } from '@/auth/ProtectedRoute'
import { BoardPage } from '@/pages/BoardPage'
import { BoardsPage } from '@/pages/BoardsPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SignupPage } from '@/pages/SignupPage'

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/boards" replace /> },
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/boards', element: <BoardsPage /> },
      { path: '/boards/:boardId', element: <BoardPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
