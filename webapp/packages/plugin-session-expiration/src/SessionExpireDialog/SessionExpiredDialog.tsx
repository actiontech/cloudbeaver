/*
 * CloudBeaver - Cloud Database Manager
 * Copyright (C) 2020-2025 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */
import { observer } from 'mobx-react-lite';

import {
  Button,
  CommonDialogBody,
  CommonDialogFooter,
  CommonDialogHeader,
  CommonDialogWrapper,
  s,
  useS,
  useTranslate,
} from '@cloudbeaver/core-blocks';
import type { DialogComponent } from '@cloudbeaver/core-dialogs';
import { ServerNodeChangedDialogStyles } from '@cloudbeaver/plugin-root';

export const SessionExpiredDialog: DialogComponent<null, null> = observer(function SessionExpiredDialog({ rejectDialog }) {
  const styles = useS(ServerNodeChangedDialogStyles);
  // const routerService = useService(RouterService);
  const translate = useTranslate();
  function reload() {
    const currentSearch = window.location.search;

    document.cookie = 'cb-session-id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    localStorage.removeItem('TOKEN');
    const DMS_REDIRECT_KEY_PARAMS_NAME = 'target';
    window.location.href = `/login?${DMS_REDIRECT_KEY_PARAMS_NAME}=${encodeURIComponent('/project/700300/cloud-beaver' + currentSearch)}`;
  }

  return (
    <CommonDialogWrapper size="small" fixedSize>
      <CommonDialogHeader title="app_root_session_expired_title" onReject={rejectDialog} />
      <CommonDialogBody noOverflow>
        <p className={s(styles, { text: true })}>{translate('app_root_session_expired_message')}</p>
      </CommonDialogBody>
      <CommonDialogFooter className={s(styles, { footer: true })}>
        <Button type="button" onClick={reload}>
          {translate('ui_processing_reload')}
        </Button>
      </CommonDialogFooter>
    </CommonDialogWrapper>
  );
});
