import { ZodError } from 'zod'

export function errorHandler(err, req, res, next) {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'JSON inválido.' })
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ message: 'Dados inválidos.', issues: err.issues })
  }
  if (err?.message === 'Produto indisponível.') {
    return res.status(400).json({ message: err.message })
  }
  if (err?.message === 'Produto inválido.') {
    return res.status(400).json({ message: err.message })
  }
  process.stderr.write(`${err?.stack || err?.message || err}\n`)
  res.status(500).json({ message: 'Erro interno.' })
}
