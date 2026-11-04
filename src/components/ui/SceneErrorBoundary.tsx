import { Component, type ReactNode } from 'react'

interface SceneErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode
  onError?: () => void
}

interface SceneErrorBoundaryState {
  hasError: boolean
}

export class SceneErrorBoundary extends Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  state: SceneErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Black box scene failed to render:', error)
    this.props.onError?.()
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}
