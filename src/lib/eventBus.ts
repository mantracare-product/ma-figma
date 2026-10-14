import { EntityType } from "./useProcessStore";

export interface BusEvent<T = any> {
  id: string;
  event: string;
  recordType: EntityType;
  recordId: string;
  data?: T;
  orgId?: string;
  timestamp: string;
}

export type EventListener<T = any> = (event: BusEvent<T>) => void | Promise<void>;

class EventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();
  private allListeners: Set<EventListener> = new Set();

  /**
   * Subscribe to a specific event (e.g. "client.created")
   */
  subscribe<T = any>(event: string, listener: EventListener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener as EventListener);

    return () => {
      set.delete(listener as EventListener);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  /**
   * Subscribe to all events across any entity
   */
  subscribeAll(listener: EventListener): () => void {
    this.allListeners.add(listener);
    return () => {
      this.allListeners.delete(listener);
    };
  }

  /**
   * Emit an event into the bus
   */
  async emit<T = any>(
    event: string,
    recordType: EntityType,
    recordId: string,
    data?: T,
    orgId?: string
  ): Promise<BusEvent<T>> {
    const busEvent: BusEvent<T> = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      event,
      recordType,
      recordId,
      data,
      orgId: orgId || "default",
      timestamp: new Date().toISOString(),
    };

    // Dispatch to specific listeners
    const specific = this.listeners.get(event);
    if (specific) {
      for (const listener of specific) {
        try {
          await listener(busEvent);
        } catch (err) {
          console.error(`Error in event listener for ${event}:`, err);
        }
      }
    }

    // Dispatch to wildcard / all-event listeners (e.g., ruleEngine)
    for (const listener of this.allListeners) {
      try {
        await listener(busEvent);
      } catch (err) {
        console.error(`Error in global event listener:`, err);
      }
    }

    return busEvent;
  }
}

export const eventBus = new EventBus();
