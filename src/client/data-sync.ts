/**
 * 跨组件数据同步。
 *
 * 聊天面板（PromptLibraryButton）与侧边栏（SidebarPromptLibrary）是各自独立
 * 加载数据的组件。任一组件新增/修改/删除提示词后，通过 window 自定义事件
 * 通知所有提示词组件重新加载，保证两边内容实时一致。
 */
import { useEffect, useRef } from "react";

const DATA_CHANGED_EVENT = "pl:data-changed";

/** 通知所有提示词组件：数据已新增/修改/删除，应重新加载。 */
export function notifyDataChanged(): void {
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
}

/** 订阅数据变化事件：任一组件增删改后都会触发 reload。 */
export function useDataChanged(reload: () => void): void {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  useEffect(() => {
    const onChanged = () => reloadRef.current();
    window.addEventListener(DATA_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, onChanged);
  }, []);
}
