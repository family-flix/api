import { nanoid } from "nanoid";

import { Result } from "@/types";

/**
 * 延迟指定时间
 * @param delay 要延迟的时间，单位毫秒
 * @returns
 */
export function sleep(delay: number = 1000) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, delay);
  });
}

/**
 * 包裹了 promise 并包含一些额外信息的 promise，可以这么理解
 */
export interface Task<T = unknown> {
  id: string;
  name: string;
  promise: () => Promise<T>;
}

let runningTasks: string[] = [];
let waitStopTasks: string[] = [];
export function stopRunningTask(id: string) {
  if (!runningTasks.includes(id)) {
    return Result.Err("the task not existing");
  }
  waitStopTasks.push(id);
}

export function fall<T = unknown>(
  tasks: Task<Result<T>>[],
  options: Partial<{
    /** 任务唯一凭证 */
    id: string;
    /** 每次请求后延迟多久 */
    delay: number;
    /** 一个任务超过该时间视为失败 */
    timeout: number;
    onBeforeInvoke: (t: Task<Result<T>>) => void;
    onAfterInvoke: (
      t: Task<Result<T>>,
      result: Result<T>,
      tasks: Task<Result<T>>[]
    ) => void;
    onInvokeFailed: (task: Task<Result<T>>, error: Error) => void;
    onError: (err: Error) => void;
    /** 任务完成后的回调 */
    onCompleted: (results: Result<T>[]) => void;
    /** 被外部中断后的回调 */
    onStop: () => void;
  }>
) {
  const {
    id: optionId,
    delay,
    onBeforeInvoke,
    onAfterInvoke,
    onInvokeFailed,
    onCompleted,
    onError,
  } = options;
  if (optionId === undefined) {
    const t = `There must be a id option.`;
    if (onError) {
      onError(new Error(t));
    }
    return Result.Err(t);
  }
  if (runningTasks.includes(optionId)) {
    const t = `${optionId} is existing.`;
    if (onError) {
      onError(new Error(t));
    }
    return Result.Err(t);
  }
  let i = 0;
  const results: Record<string, Result<T>> = {};
  (async () => {
    while (i < tasks.length) {
      if (waitStopTasks.includes(optionId)) {
      }
      const task = tasks[i];
      const { id, promise } = task;
      if (onBeforeInvoke) {
        onBeforeInvoke(task);
      }
      try {
        const result = await promise();
        results[id] = result as unknown as Result<T>;
        if (onAfterInvoke) {
          onAfterInvoke(task, result, tasks);
        }
      } catch (err) {
        const error = err as Error;
        results[id] = Result.Err(error);
        if (onInvokeFailed) {
          onInvokeFailed(task, error);
        }
      }
      if (delay !== undefined) {
        await sleep(delay);
      }
      i += 1;
    }
  })()
    .then(() => {})
    .finally(() => {
      if (onCompleted) {
        onCompleted(
          tasks.map((t) => {
            return results[t.id];
          })
        );
      }
    });
  return Result.Ok([]);
}
