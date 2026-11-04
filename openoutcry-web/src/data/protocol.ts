export type ProtocolKey = 'message' | 'event' | 'action'

export const PROTOCOL_SAMPLES: Record<ProtocolKey, { label: string; type: string; payload: unknown }> = {
  message: {
    label: '会话消息',
    type: 'session.message',
    payload: {
      type: 'session.message',
      session_id: 'sess_demo_001',
      run_id: 'run_demo_001',
      mode: 'guidance',
      content: '请解释减仓依据',
    },
  },
  event: {
    label: '平台事件',
    type: 'platform.event',
    payload: {
      type: 'platform.event',
      event: 'order.proposed',
      event_id: 'evt_demo_004',
      run_id: 'run_demo_001',
      seq: 4,
      evidence_ids: ['ev_018', 'ev_024'],
    },
  },
  action: {
    label: '训练动作',
    type: 'agent.action',
    payload: {
      type: 'agent.action',
      run_id: 'run_demo_001',
      action: 'order',
      side: 'sell',
      asset: '公司-017',
      quantity: 100,
      limit: 20.3,
      status: 'proposed',
    },
  },
}
