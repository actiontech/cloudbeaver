/*
 * CloudBeaver - Cloud Database Manager
 * Copyright (C) 2020-2023 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */
import { ActionSnackbar } from '@cloudbeaver/core-blocks';
import { Bootstrap, injectable } from '@cloudbeaver/core-di';
import { CommonDialogService, DialogueStateResult } from '@cloudbeaver/core-dialogs';
import { ENotificationType, NotificationService } from '@cloudbeaver/core-events';
import { SessionExpireService } from '@cloudbeaver/core-root';
import { RouterService } from '@cloudbeaver/core-routing';

import { SessionExpiredDialog } from './SessionExpiredDialog';

@injectable()
export class SessionExpiredDialogService extends Bootstrap {
  constructor(
    private readonly routerService: RouterService,
    private readonly notificationService: NotificationService,
    private readonly commonDialogService: CommonDialogService,
    private readonly sessionExpireService: SessionExpireService,
  ) {
    super();
  }

  register(): void {
    this.sessionExpireService.onSessionExpire.addPostHandler(this.handleSessionExpired.bind(this));
  }

  load(): void | Promise<void> {}

  private reload() {
    const currentSearch = window.location.search;

    localStorage.removeItem('TOKEN');
    // 删除 名为cb-session-id 的 cookie
    document.cookie = 'cb-session-id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    const DMS_REDIRECT_KEY_PARAMS_NAME = 'target';
    window.location.href = `/login?${DMS_REDIRECT_KEY_PARAMS_NAME}=${encodeURIComponent('/project/700300/cloud-beaver' + currentSearch)}`;
  }

  private async handleSessionExpired(): Promise<void> {
    const state = await this.commonDialogService.open(SessionExpiredDialog, null);

    if (state === DialogueStateResult.Rejected) {
      this.notificationService.customNotification(
        () => ActionSnackbar,
        {
          actionText: 'ui_processing_reload',
          onAction: () => this.reload(),
        },
        { title: 'app_root_session_expired_title', persistent: true, type: ENotificationType.Error },
      );
    }
  }
}
