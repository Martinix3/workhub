// Login Page Component
import { useAuth } from './AuthContext'
import { useNavigate } from 'react-router-dom'

export function LoginPage() {
  const { login, loading, error, clearError, bypassAuth, isBypassEnabled } = useAuth()
  const navigate = useNavigate()

  const handleBypass = () => {
    bypassAuth()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl font-bold text-stone-900 mb-2">
            Santa Brisa
          </h1>
          <p className="text-lg text-stone-600 font-medium">
            WorkHub
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] p-8">
          <h2 className="font-serif text-2xl font-bold text-stone-900 mb-2">
            Iniciar Sesion
          </h2>
          <p className="text-stone-600 mb-6">
            Accede con tu cuenta de Google para continuar
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-500 text-red-700 text-sm">
              <div className="flex justify-between items-start">
                <span>{error}</span>
                <button
                  onClick={clearError}
                  className="text-red-500 hover:text-red-700 font-bold"
                >
                  X
                </button>
              </div>
            </div>
          )}

          {/* Google Login Button */}
          <button
            onClick={login}
            disabled={loading}
            className={`
              w-full flex items-center justify-center gap-3
              px-6 py-3
              bg-white border-2 border-stone-900
              shadow-[4px_4px_0_#1c1917]
              hover:translate-x-[2px] hover:translate-y-[2px]
              hover:shadow-[2px_2px_0_#1c1917]
              transition-all duration-75
              font-medium
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {/* Google Icon */}
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>
              {loading ? 'Cargando...' : 'Continuar con Google'}
            </span>
          </button>

          {/* Divider - Only show in development when bypass is enabled */}
          {isBypassEnabled && (
            <>
              <div className="my-6 flex items-center">
                <div className="flex-1 border-t border-stone-300"></div>
                <span className="px-3 text-sm text-stone-500">o</span>
                <div className="flex-1 border-t border-stone-300"></div>
              </div>

              {/* Bypass Button for UI Review */}
              <button
                onClick={handleBypass}
                className="
                  w-full px-6 py-3
                  bg-stone-100 border-2 border-stone-400
                  text-stone-600 font-medium
                  hover:bg-stone-200
                  transition-colors
                "
              >
                Revisar UI (sin backend)
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-stone-500">
          <p>
            Al iniciar sesion, aceptas los{' '}
            <a href="#" className="text-amber-600 hover:underline">
              Terminos de Servicio
            </a>{' '}
            y la{' '}
            <a href="#" className="text-amber-600 hover:underline">
              Politica de Privacidad
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
