// formulario de login: usuario/contraseña y qr de google
import { useState } from 'react'
import type { FormEvent } from 'react'
import './LoginForm.css'

interface LoginFormProps {
  isLoading: boolean
  errorMessage: string
  googleAuthUrl: string
  onSubmit: (usuario: string, contrasena: string) => Promise<boolean>
}

function LoginForm({ isLoading, errorMessage, googleAuthUrl, onSubmit }: LoginFormProps) {
  // campos del formulario
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')

  // envia el formulario
  // valida que los campos no esten vacios antes de procesar
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // previene el envio por defecto del formulario
    event.preventDefault()
    // llama el callback con usuario y contraseña
    await onSubmit(usuario, contrasena)
  }

  return (
    <section className="login-box-react" aria-label="Iniciar sesión">
      <h2>Iniciar Sesión</h2>

      <form onSubmit={handleSubmit}>
        <label>
          Usuario
          <input
            type="text"
            value={usuario}
            onChange={(event) => setUsuario(event.target.value)}
            placeholder="Ingrese su usuario"
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={contrasena}
            onChange={(event) => setContrasena(event.target.value)}
            placeholder="Ingrese su contraseña"
          />
        </label>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className="divider">O</div>

      <a
        className={`google-btn-react ${googleAuthUrl ? '' : 'disabled'}`}
        href={googleAuthUrl || '#'}
        onClick={(event) => {
          if (!googleAuthUrl) event.preventDefault()
        }}
      >
        <span className="google-dot" aria-hidden="true" />
        Acceder con Google
      </a>

      {errorMessage ? <p className="login-error">{errorMessage}</p> : null}
    </section>
  )
}

export default LoginForm
