import { useEffect, useRef } from 'react'

/**
 * Custom hook to track if a component is mounted.
 *
 * Prevents "Can't perform a React state update on an unmounted component" warnings
 * by providing a ref that tracks the mounted state.
 *
 * @returns A ref object with `current` property that is `true` when mounted, `false` when unmounted
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const mountedRef = useMountedRef()
 *   const [data, setData] = useState(null)
 *
 *   useEffect(() => {
 *     fetchData().then(result => {
 *       if (mountedRef.current) {
 *         setData(result)
 *       }
 *     })
 *   }, [])
 *
 *   return <div>{data}</div>
 * }
 * ```
 */
export function useMountedRef() {
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  return mountedRef
}
