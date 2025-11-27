/*
 * CloudBeaver - Cloud Database Manager
 * Copyright (C) 2020-2024 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */
import { useState } from 'react';

import { useService } from '@cloudbeaver/core-di';
import { CommonDialogService } from '@cloudbeaver/core-dialogs';
import { DetailsError } from '@cloudbeaver/core-sdk';
import { errorOf, LoadingError } from '@cloudbeaver/core-utils';

import { ErrorDetailsDialog } from './ErrorDetailsDialog/ErrorDetailsDialog.js';
import { useTranslate } from './localization/useTranslate.js';

interface IErrorDetailsHook {
  name?: string;
  message?: string;
  error: Error | string | null;
  executionFailedMessage?: string;
  details?: DetailsError;
  hasDetails: boolean;
  isOpen: boolean;
  open: () => void;
  refresh?: () => void;
  errorCode?: string;
  workflowId?: string;
}

type HookType =
  | IErrorDetailsHook
  | ({
      name: string;
      error: Error;
    } & IErrorDetailsHook);

export function useErrorDetails(error: IErrorDetailsHook['error']): HookType {
  const translate = useTranslate();
  const service = useService(CommonDialogService);
  const [isOpen, setIsOpen] = useState(false);
  const details = errorOf(error, DetailsError);
  const loadingError = errorOf(error, LoadingError);

  const open = async () => {
    if (!error) {
      return;
    }
    try {
      setIsOpen(true);
      await service.open(ErrorDetailsDialog, error);
    } finally {
      setIsOpen(false);
    }
  };
  const name = typeof error === 'string' ? translate('core_blocks_exception_message_error_message') : error?.name;
  let message = (typeof error === 'string' ? error : error?.message) ?? undefined;
  const executionFailedMessage = (error as any)?.execution_failed_message as string;
  const errorCode = (error as any)?.errorCode as string;
  let workflowId: string | undefined;

  if (typeof message === 'string') {
    const match = message.match(/workflow_id:(\d+)/);

    if (match) {
      workflowId = match[1];
      message = message.replace(/workflow_id:\d+,?\s*/g, '').trim();
    }
  }

  return {
    name,
    message,
    error,
    details,
    hasDetails: details?.hasDetails() ?? false,
    isOpen,
    open,
    refresh: loadingError?.refresh,
    executionFailedMessage,
    errorCode,
    workflowId,
  };
}
