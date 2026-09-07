/**
 * 会话视图目标（chat / trajectory）读取器。
 *
 * 背景：最新 DSH（0.1.2-rc.1 起）把 Chat 与 Trajectory 视图目标迁移到了
 * UI 层私有的 `uiConversation.views` 注册表，宿主自身的聊天 UI 通过
 * `uiConversation.binding(sessionId).target("chat" | "trajectory")` 读取，
 * 而 `useSession` 快照上的 `s.chat` / `s.views.get("trajectory")` 由运行时
 * 侧的另一个空注册表装配，永远为空（EMPTY_CHAT_SNAPSHOT / undefined）。
 * 因此依赖这两条数据源的监控区块（会话动态、热力图、会话注入、系统提示、
 * 注入的工具）在最新 DSH 内全部失效且控制台无报错。
 *
 * 修复：插件在 apply 阶段缓存宿主 `uiConversation` 服务，组件内用
 * `useConversationTargetSnapshot` 以 useSyncExternalStore 订阅同一数据源；
 * 同时保留旧快照字段读取作为向后兼容回退。
 */
import { useCallback, useSyncExternalStore } from "react";

/** 宿主 uiConversation 服务的最小结构（仅取本插件需要的部分）。 */
export interface UiConversationService {
  /**
   * 取某会话的绑定装配。
   * @param source - 会话 id 字符串（或宿主 binding 对象）。
   * @throws 会话未知时宿主可能抛错，调用方需容错。
   */
  binding(source: string | unknown): {
    /** 某视图目标的稳定快照读取面（uSES 兼容：getSnapshot / subscribe）。 */
    target(name: string): {
      getSnapshot(): unknown;
      subscribe(listener: () => void): () => void;
    };
  };
}

let uiConversationRef: UiConversationService | null = null;

/** apply 阶段注入宿主 uiConversation 服务（不存在时传 null，功能静默降级）。 */
export function setUiConversation(svc: UiConversationService | null): void {
  uiConversationRef = svc;
}

/** 取缓存的 uiConversation 服务（未注入或宿主缺失时为 null）。 */
export function getUiConversation(): UiConversationService | null {
  return uiConversationRef;
}

/**
 * 订阅当前会话某个 Conversation 视图目标的最新快照。
 *
 * @param sessionId - 当前会话 id（快照 `s.sessionId`）。
 * @param target - 视图目标名（"chat" / "trajectory"）。
 * @returns 最新快照；服务缺失 / 会话未知 / 目标未装配时为 undefined。
 */
export function useConversationTargetSnapshot<T>(sessionId: string | undefined, target: string): T | undefined {
  const svc = uiConversationRef;

  const getSnapshot = useCallback((): T | undefined => {
    if (!svc || !sessionId) return undefined;
    try {
      const face = svc.binding(sessionId).target(target);
      return (face.getSnapshot() ?? undefined) as T | undefined;
    } catch {
      // 会话尚未绑定 / 目标未注册：静默降级
      return undefined;
    }
  }, [svc, sessionId, target]);

  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      if (!svc || !sessionId) return () => {};
      try {
        const face = svc.binding(sessionId).target(target);
        return face.subscribe(onStoreChange);
      } catch {
        return () => {};
      }
    },
    [svc, sessionId, target],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
