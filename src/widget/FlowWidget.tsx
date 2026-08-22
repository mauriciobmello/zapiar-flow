import { useCallback, useState } from 'react'
import { useFlowRuntime } from './useFlowRuntime'
import ChatBubble from './ChatBubble'
import ChatWindow from './ChatWindow'
import type { FlowWidgetProps, WidgetEvent } from './types'

export default function FlowWidget({ flowId, apiUrl, theme, onEvent }: FlowWidgetProps) {
  const [open, setOpen] = useState(false)

  const handleEvent = useCallback(
    (event: WidgetEvent) => {
      onEvent?.(event)
    },
    [onEvent]
  )

  const { log, executionId, waitingFor, options, finished, sendReply, webhookUrl, error, loading } =
    useFlowRuntime({ flowId, apiUrl, onEvent: handleEvent })

  return (
    <>
      <ChatBubble open={open} theme={theme} onClick={() => setOpen((prev) => !prev)} />
      {open && (
        <ChatWindow
          log={log}
          waitingFor={waitingFor}
          options={options}
          finished={finished}
          error={error}
          loading={loading}
          webhookUrl={webhookUrl}
          sendReply={sendReply}
          theme={theme}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
