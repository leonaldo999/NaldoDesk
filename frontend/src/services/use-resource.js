import { useEffect, useState } from 'react'
import { api, errorMessage } from './api'
export function useResource(path) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const [revision, setRevision] = useState(0)
  const reload = () => setRevision((value) => value + 1)
  const key = `${path}|${revision}`
  useEffect(() => {
    const controller = new AbortController()
    api
      .get(path, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted)
          setState({ key, data: response.data, loading: false, error: '' })
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            key,
            data: null,
            loading: false,
            error: errorMessage(error),
          })
      })
    return () => controller.abort()
  }, [path, revision, key])
  useEffect(() => {
    window.addEventListener('business-refresh', reload)
    return () => window.removeEventListener('business-refresh', reload)
  }, [])
  return {
    ...(state.key === key ? state : { data: null, loading: true, error: '' }),
    reload,
  }
}
