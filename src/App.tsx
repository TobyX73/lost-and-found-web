import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppLayout, PageContainer, RequireAuth } from './components/layout'
import { LinkButton } from './components/ui'
import { AuthProvider } from './lib/auth'
import { ThemeProvider } from './lib/theme'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import { FeedPage } from './pages/FeedPage'
import { PostPage } from './pages/PostPage'
import { ProfilePage } from './pages/ProfilePage'
import { PublishPage } from './pages/PublishPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
})

function NotFoundPage() {
  return (
    <PageContainer>
      <h1 className="text-[28px] font-medium text-fg">Esta página no existe</h1>
      <p className="mt-2 text-fg-2">Revisá el enlace o volvé al inicio</p>
      <LinkButton to="/" variant="secondary" className="mt-6">
        Volver a explorar
      </LinkButton>
    </PageContainer>
  )
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <FeedPage /> },
      { path: 'objetos/:id', element: <PostPage /> },
      {
        path: 'publicar',
        element: (
          <RequireAuth>
            <PublishPage />
          </RequireAuth>
        ),
      },
      {
        path: 'perfil',
        element: (
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        ),
      },
      { path: 'ingresar', element: <LoginPage /> },
      { path: 'registrarse', element: <RegisterPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
