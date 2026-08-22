import { createRoot } from 'react-dom/client'
import FlowWidget from './FlowWidget'
import type { WidgetMountConfig, WidgetTheme, WidgetEvent } from './types'

const instances = new Map<string, ReturnType<typeof createRoot>>()

declare global {
  interface Window {
    ZapiarFlowWidget: {
      mount(config: WidgetMountConfig): string
      unmount(instanceId: string): void
    }
  }
}

window.ZapiarFlowWidget = {
  mount(config) {
    const container =
      typeof config.container === 'string'
        ? document.querySelector(config.container)
        : config.container

    if (!container) {
      throw new Error('Container not found')
    }

    const instanceId = `zfw-${Math.random().toString(36).slice(2, 9)}`
    const root = createRoot(container)
    root.render(
      <FlowWidget
        flowId={config.flowId}
        apiUrl={config.apiUrl}
        theme={config.theme}
        onEvent={config.onEvent}
      />
    )
    instances.set(instanceId, root)
    return instanceId
  },
  unmount(instanceId) {
    const root = instances.get(instanceId)
    if (root) {
      root.unmount()
      instances.delete(instanceId)
    }
  },
}
