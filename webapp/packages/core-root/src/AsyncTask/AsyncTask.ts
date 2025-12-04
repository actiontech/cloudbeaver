/*
 * CloudBeaver - Cloud Database Manager
 * Copyright (C) 2020-2024 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */
import { computed, makeObservable, observable } from 'mobx';

import { type ISyncExecutor, SyncExecutor } from '@cloudbeaver/core-executor';
import { type AsyncTaskInfo, ServerInternalError, type WsAsyncTaskInfo } from '@cloudbeaver/core-sdk';
import { uuid } from '@cloudbeaver/core-utils';

export class AsyncTask {
  get cancelled(): boolean {
    return this._cancelled;
  }

  get info(): AsyncTaskInfo | null {
    return this.taskInfo;
  }

  get pending(): boolean {
    return this.taskInfo?.running || this.updatingAsync || false;
  }

  get promise(): Promise<AsyncTaskInfo> {
    return this.innerPromise;
  }

  get id(): string {
    return this._id;
  }

  readonly onStatusChange: ISyncExecutor<AsyncTaskInfo>;

  private _id: string;
  private _cancelled: boolean;
  private taskInfo: AsyncTaskInfo | null;
  private resolve!: (value: AsyncTaskInfo) => void;
  private reject!: (reason?: any) => void;
  private readonly innerPromise: Promise<AsyncTaskInfo>;
  private updatingAsync: boolean;
  private readonly init: () => Promise<AsyncTaskInfo>;
  private readonly cancel: (id: string) => Promise<void>;
  private initPromise: Promise<void> | null;
  private pollingTimer: ReturnType<typeof setInterval> | null;
  private pollingGetter: ((taskId: string) => Promise<AsyncTaskInfo>) | null;

  constructor(init: () => Promise<AsyncTaskInfo>, cancel: (id: string) => Promise<void>) {
    this._id = uuid();
    this.init = init;
    this.cancel = cancel;
    this._cancelled = false;
    this.updatingAsync = false;
    this.taskInfo = null;
    this.initPromise = null;
    this.pollingTimer = null;
    this.pollingGetter = null;
    this.onStatusChange = new SyncExecutor();

    this.innerPromise = new Promise((resolve, reject) => {
      this.reject = reject;
      this.resolve = resolve;
    });

    makeObservable<this, 'pending' | '_cancelled' | 'taskInfo' | 'updatingAsync'>(this, {
      _cancelled: observable,
      pending: computed,
      taskInfo: observable,
      updatingAsync: observable,
    });
  }

  async run(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.updateInfoAsync(this.init);

    await this.initPromise;
  }

  async updateInfoAsync(getter: (task: AsyncTask) => Promise<AsyncTaskInfo>): Promise<void> {
    const init = this.info === null;

    if (this.updatingAsync) {
      if (!init) {
        /* With websockets we encounter a situation when we receive status update before the task is initialized.
        We save the update in pendingEvents, but we can't update the task because updatingAsync is still true,
        so we need to wait a bit before retrying */
        setTimeout(() => this.updateInfoAsync.call(this, getter), 100);
      }
      return;
    }

    this.updatingAsync = true;
    try {
      if (this._cancelled && init) {
        throw new Error('Task was cancelled');
      }

      const info = await getter(this);
      this.updateInfo(info);

      if (init && this._cancelled) {
        await this.cancelTask();
      }
    } finally {
      this.updatingAsync = false;
    }
  }

  async cancelAsync(): Promise<void> {
    if (this._cancelled) {
      return;
    }

    if (!this.pending) {
      throw new Error("Can't cancel finished task");
    }

    this._cancelled = true;
    // 停止轮询
    this.stopPolling();
    try {
      await this.cancelTask();
    } catch (exception: any) {
      this._cancelled = false;
      throw exception;
    }
  }

  public updateStatus(info: WsAsyncTaskInfo): void {
    if (this.taskInfo) {
      this.taskInfo.status = info.statusName;
      this.onStatusChange.execute(this.taskInfo);
    }
  }

  private updateInfo(info: AsyncTaskInfo): void {
    this.taskInfo = info;

    if (!info.running) {
      // 任务完成，停止轮询
      this.stopPolling();
      if (info.error) {
        this.reject(new ServerInternalError(info.error));
      } else {
        this.resolve(info);
      }
    }
    this.onStatusChange.execute(this.taskInfo);
  }

  private async cancelTask(): Promise<void> {
    if (this.info) {
      await this.cancel(this.info.id);
    }
  }

  /**
   * 启动轮询机制，作为 WebSocket 通知的降级方案
   * @param getter 用于获取任务信息的函数
   * @param interval 轮询间隔（毫秒），默认 1000ms
   */
  startPolling(getter: (taskId: string) => Promise<AsyncTaskInfo>, interval: number = 1000): void {
    // 如果任务已经完成或已取消，不启动轮询
    if (!this.pending || this._cancelled) {
      return;
    }

    // 如果已经有轮询在运行，先停止
    this.stopPolling();

    this.pollingGetter = getter;

    // 立即执行一次检查
    this.pollOnce();

    // 设置定时轮询
    this.pollingTimer = setInterval(() => {
      this.pollOnce();
    }, interval);
  }

  /**
   * 停止轮询
   */
  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.pollingGetter = null;
  }

  /**
   * 执行一次轮询检查
   */
  private async pollOnce(): Promise<void> {
    // 如果任务已完成、已取消或没有轮询 getter，不执行
    if (!this.pending || this._cancelled || !this.pollingGetter || !this.taskInfo) {
      return;
    }

    // 如果正在更新，跳过本次轮询
    if (this.updatingAsync) {
      return;
    }

    try {
      const info = await this.pollingGetter(this.taskInfo.id);
      await this.updateInfoAsync(() => Promise.resolve(info));
    } catch {
      // 轮询失败不影响主流程，静默处理
      // 如果 WebSocket 正常工作，会通过 WebSocket 通知完成任务
      // 如果 WebSocket 连接中断，下次轮询会继续尝试
    }
  }
}
