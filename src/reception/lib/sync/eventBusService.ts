/**
 * eventBusService.ts
 * Path: src/reception/lib/sync/eventBusService.ts
 *
 * Real-time event synchronization across browser tabs and same-tab subscribers.
 * Uses BroadcastChannel for cross-window messaging + internal emitter for local dispatch.
 */

export interface EventBusMessage<T = any> {
  topic: string;
  payload: T;
  senderId: string;
  timestamp: string;
}

type MessageHandler<T = any> = (payload: T, message: EventBusMessage<T>) => void;

export class EventBusService {
  private channelName: string;
  private broadcastChannel: BroadcastChannel | null = null;
  private localListeners: Map<string, Set<MessageHandler>> = new Map();
  private instanceId: string;

  constructor(channelName = 'ma_reception_channel') {
    this.channelName = channelName;
    this.instanceId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(this.channelName);
        this.broadcastChannel.onmessage = (event: MessageEvent<EventBusMessage>) => {
          if (event.data && event.data.topic) {
            this.notifyListeners(event.data.topic, event.data.payload, event.data);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel initialization failed, falling back to local dispatch:', err);
      }
    }
  }

  /**
   * Publishes an event to both the local window listeners AND other open tabs/windows.
   */
  publish<T = any>(topic: string, payload: T): void {
    const message: EventBusMessage<T> = {
      topic,
      payload,
      senderId: this.instanceId,
      timestamp: new Date().toISOString(),
    };

    // 1. Send to other browser tabs/windows
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (err) {
        console.error('Failed to postMessage on BroadcastChannel:', err);
      }
    }

    // 2. Dispatch locally to same-tab listeners (since BroadcastChannel excludes sender)
    this.notifyListeners(topic, payload, message);
  }

  /**
   * Subscribes to a topic. Returns an unsubscribe function.
   */
  subscribe<T = any>(topic: string, handler: MessageHandler<T>): () => void {
    if (!this.localListeners.has(topic)) {
      this.localListeners.set(topic, new Set());
    }
    const handlers = this.localListeners.get(topic)!;
    handlers.add(handler as MessageHandler);

    return () => {
      handlers.delete(handler as MessageHandler);
      if (handlers.size === 0) {
        this.localListeners.delete(topic);
      }
    };
  }

  private notifyListeners(topic: string, payload: any, message: EventBusMessage): void {
    const handlers = this.localListeners.get(topic);
    if (handlers) {
      handlers.forEach((fn) => {
        try {
          fn(payload, message);
        } catch (err) {
          console.error(`Error in event listener for topic [${topic}]:`, err);
        }
      });
    }
  }

  destroy(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    this.localListeners.clear();
  }
}

export const eventBusService = new EventBusService();
