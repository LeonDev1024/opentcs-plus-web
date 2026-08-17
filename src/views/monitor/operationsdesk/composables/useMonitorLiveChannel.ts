/**
 * 监控大屏实时通道：HTTP snapshot 首屏后走 WebSocket，断线降级 3s 轮询。
 * 握手参数与 layout 里 initWebSocket（common 通道）保持一致。
 */
import { ref } from 'vue';
import { getToken } from '@/utils/auth';
import { monitorApi, type MonitorSnapshotVO } from '@/api/ops/monitor';

export type MonitorLiveMode = 'ws' | 'http' | 'off';

function unwrapSnapshot(res: unknown): MonitorSnapshotVO | null {
  if (!res || typeof res !== 'object') return null;
  const body = res as Record<string, unknown>;
  if (body.data && typeof body.data === 'object') {
    return body.data as MonitorSnapshotVO;
  }
  return body as MonitorSnapshotVO;
}

function buildMonitorWsUrl(factoryId: number): string {
  const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  return (
    protocol +
    window.location.host +
    import.meta.env.VITE_APP_BASE_API +
    '/resource/ws/monitor' +
    '?Authorization=' +
    encodeURIComponent('Bearer ' + (getToken() || '')) +
    '&clientid=' +
    encodeURIComponent(import.meta.env.VITE_APP_CLIENT_ID) +
    '&factoryId=' +
    encodeURIComponent(String(factoryId))
  );
}

export function useMonitorLiveChannel(options: {
  onMessage: (snapshot: MonitorSnapshotVO) => void;
  fallbackIntervalMs?: number;
  staleMs?: number;
}) {
  const fallbackIntervalMs = options.fallbackIntervalMs ?? 3000;
  const staleMs = options.staleMs ?? 8000;
  const isActive = ref(false);
  const lastUpdated = ref<number | null>(null);
  const mode = ref<MonitorLiveMode>('off');
  const currentFactoryId = ref<number | undefined>(undefined);

  let socket: WebSocket | null = null;
  let pollTimer: number | undefined;
  let pingTimer: number | undefined;
  let reconnectTimer: number | undefined;
  let reconnectAttempts = 0;
  let stopped = true;
  let onMessageRef = options.onMessage;

  const markLive = () => {
    lastUpdated.value = Date.now();
    isActive.value = true;
  };

  const connectionState = () => {
    if (!isActive.value || mode.value === 'off') return 'offline' as const;
    if (!lastUpdated.value) return 'stale' as const;
    if (Date.now() - lastUpdated.value > staleMs) return 'stale' as const;
    return 'live' as const;
  };

  const stopPolling = () => {
    if (pollTimer != null) {
      window.clearInterval(pollTimer);
      pollTimer = undefined;
    }
  };

  const stopSocket = () => {
    if (pingTimer != null) {
      window.clearInterval(pingTimer);
      pingTimer = undefined;
    }
    if (reconnectTimer != null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
    if (socket) {
      socket.onopen = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
      socket = null;
    }
  };

  const fetchSnapshot = async (factoryId: number) => {
    const res = await monitorApi.getSnapshot(factoryId);
    const snapshot = unwrapSnapshot(res);
    if (snapshot) {
      onMessageRef(snapshot);
      markLive();
    }
  };

  const startPolling = (factoryId: number) => {
    stopPolling();
    mode.value = 'http';
    isActive.value = true;
    void fetchSnapshot(factoryId).catch((e) => {
      console.error('[monitor-live] fallback fetch error:', e);
    });
    pollTimer = window.setInterval(() => {
      if (currentFactoryId.value == null) return;
      void fetchSnapshot(currentFactoryId.value).catch((e) => {
        console.error('[monitor-live] fallback fetch error:', e);
      });
    }, fallbackIntervalMs);
  };

  const scheduleReconnectOrFallback = (factoryId: number) => {
    if (stopped) return;
    reconnectAttempts += 1;
    if (reconnectAttempts > 3) {
      startPolling(factoryId);
      return;
    }
    reconnectTimer = window.setTimeout(() => {
      if (!stopped) openSocket(factoryId);
    }, 1000 * reconnectAttempts);
  };

  const openSocket = (factoryId: number) => {
    stopSocket();
    try {
      socket = new WebSocket(buildMonitorWsUrl(factoryId));
    } catch (e) {
      console.error('[monitor-live] ws construct error:', e);
      startPolling(factoryId);
      return;
    }
    socket.onopen = () => {
      reconnectAttempts = 0;
      stopPolling();
      mode.value = 'ws';
      isActive.value = true;
      markLive();
      pingTimer = window.setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        }
      }, 10000);
    };
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as MonitorSnapshotVO;
        onMessageRef(payload);
        markLive();
      } catch (e) {
        console.error('[monitor-live] ws parse error:', e);
      }
    };
    socket.onerror = () => {
      // onclose 会接手重连 / 降级
    };
    socket.onclose = () => {
      socket = null;
      if (pingTimer != null) {
        window.clearInterval(pingTimer);
        pingTimer = undefined;
      }
      if (!stopped && currentFactoryId.value != null) {
        scheduleReconnectOrFallback(currentFactoryId.value);
      }
    };
  };

  const start = async (factoryId: number, onMessage?: (snapshot: MonitorSnapshotVO) => void) => {
    stop();
    if (onMessage) onMessageRef = onMessage;
    stopped = false;
    currentFactoryId.value = factoryId;
    try {
      await fetchSnapshot(factoryId);
      if (!stopped) {
        mode.value = 'http';
      }
    } catch (e) {
      console.error('[monitor-live] snapshot error:', e);
    }
    openSocket(factoryId);
  };

  const updateFactoryId = (factoryId: number) => {
    currentFactoryId.value = factoryId;
    if (stopped) return;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'subscribe', factoryId }));
      return;
    }
    void fetchSnapshot(factoryId).catch((e) => {
      console.error('[monitor-live] snapshot error:', e);
    });
  };

  const stop = () => {
    stopped = true;
    reconnectAttempts = 0;
    stopSocket();
    stopPolling();
    isActive.value = false;
    mode.value = 'off';
  };

  return {
    isActive,
    lastUpdated,
    mode,
    currentFactoryId,
    start,
    stop,
    updateFactoryId,
    fetchSnapshot,
    connectionState
  };
}
