/*
 * CloudBeaver - Cloud Database Manager
 * Copyright (C) 2020-2023 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */
import { compressToEncodedURIComponent } from 'lz-string';
import { observable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect } from 'react';
import styled, { css, use } from 'reshadow';

import { Button, IconOrImage, useErrorDetails, useObservableRef, useStateDelay, useTranslate } from '@cloudbeaver/core-blocks';
import { ConnectionInfoResource, createConnectionParam } from '@cloudbeaver/core-connections';
import { useService } from '@cloudbeaver/core-di';
import { CommonDialogService, DialogueStateResult } from '@cloudbeaver/core-dialogs';
import { ServerErrorType, ServerInternalError } from '@cloudbeaver/core-sdk';
import { errorOf } from '@cloudbeaver/core-utils';
import { ConnectionSchemaManagerService } from '@cloudbeaver/plugin-datasource-context-switch';
import { NavigationTabsService } from '@cloudbeaver/plugin-navigation-tabs';
import { LocalStorageSqlDataSource, SqlDataSourceService } from '@cloudbeaver/plugin-sql-editor';
import { isSQLEditorTab, SqlEditorNavigatorService } from '@cloudbeaver/plugin-sql-editor-navigation-tab';

import type { IDatabaseDataModel } from '../DatabaseDataModel/IDatabaseDataModel';
import { SqlEditorSessionClosedDialog } from './SqlEditorSessionClosedDialog';

const style = css`
  error {
    composes: theme-background-surface theme-text-on-surface from global;
    position: absolute;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: 16px;
    overflow: auto;
    pointer-events: none;
    bottom: 0;
    right: 0;
    z-index: 1;
    opacity: 0;
    transition: opacity 0.3s ease-in-out, width 0.3s ease-in-out, height 0.3s ease-in-out, background 0.3s ease-in-out;

    &[|animated] {
      overflow: hidden;
      pointer-events: auto;
      opacity: 1;
    }
    &[|collapsed] {
      pointer-events: auto;
      width: 92px;
      height: 72px;
      background: transparent !important;

      & IconOrImage {
        cursor: pointer;
      }

      & error-message,
      & controls {
        display: none;
      }
    }
    &[|errorHidden] {
      pointer-events: none;
      overflow: hidden;
    }
  }
  error-body {
    display: flex;
    gap: 24px;
    align-items: center;
    margin-bottom: 24px;
  }
  error-message {
    white-space: pre-wrap;
  }
  error-sub-message {
    display: block;
    font-size: 0.9em;
    margin-top: 8px;
  }
  IconOrImage {
    width: 40px;
    height: 40px;
  }
  controls {
    display: flex;
    gap: 16px;
    & > Button {
      flex-shrink: 0;
    }
  }
  create-workflow-tips {
    margin-top: 24px;
  }
`;

interface Props {
  model: IDatabaseDataModel;
  loading: boolean;
  className?: string;
}

interface ErrorInfo {
  error: Error | null;
  display: boolean;
  hide: () => void;
  show: () => void;
}

export const TableError = observer<Props>(function TableError({ model, loading, className }) {
  const translate = useTranslate();

  const connectionSchemaManagerService = useService(ConnectionSchemaManagerService);
  const sqlDataSourceService = useService(SqlDataSourceService);
  const navigationTabsService = useService(NavigationTabsService);
  const commonDialogService = useService(CommonDialogService);
  const sqlEditorNavigatorService = useService(SqlEditorNavigatorService);
  const connectionInfo = useService(ConnectionInfoResource);

  const errorInfo = useObservableRef<ErrorInfo>(
    () => ({
      error: null,
      display: false,
      hide() {
        this.display = false;
      },
      show() {
        this.display = true;
      },
    }),
    {
      display: observable.ref,
    },
    false,
  );

  const internalServerError = errorOf(model.source.error, ServerInternalError);
  const error = useErrorDetails(model.source.error);
  const animated = useStateDelay(!!errorInfo.error && !loading, 1);

  const errorHidden = errorInfo.error === null;
  const quote = internalServerError?.errorType === ServerErrorType.QUOTE_EXCEEDED;

  const onCreateWorkflowNavigate = () => {
    const [projectName, instanceName] = connectionSchemaManagerService.currentConnection?.name.split(':') ?? [];
    const schema = connectionSchemaManagerService.currentObjectCatalog?.name;
    const sql = sqlDataSourceService.get(navigationTabsService.getView()?.context.id ?? '')?.script;

    const data = {
      instanceName,
      schema,
      sql,
    };

    window.open(
      `/transit?from=cloudbeaver&to=create_workflow&project_name=${projectName}&compression_data=${compressToEncodedURIComponent(
        JSON.stringify(data),
      )}`,
    );
  };

  let icon = '/icons/error_icon.svg';

  if (quote) {
    icon = '/icons/info_icon.svg';
  }

  let onRetry = () => model.retry();

  if (error.refresh) {
    const retry = onRetry;
    const refresh = error.refresh;
    onRetry = async () => {
      refresh();
      await retry();
    };
  }

  // 处理SQL会话关闭错误的重新打开编辑器逻辑
  const handleReopenEditor = useCallback(async () => {
    const contextId = navigationTabsService.getView()?.context.id ?? '';
    const dataSource = sqlDataSourceService.get(contextId);

    if (dataSource) {
      const query = dataSource.script || '';
      const shouldReopen = await commonDialogService.open(SqlEditorSessionClosedDialog, { query });
      if (shouldReopen === true || shouldReopen === DialogueStateResult.Resolved) {
        const relatedTab = navigationTabsService.findTab(isSQLEditorTab(tab => tab.id === contextId));
        if (relatedTab) {
          await navigationTabsService.closeTab(relatedTab.id, true);

          const executionContext = dataSource?.executionContext;

          if (executionContext) {
            const connection = executionContext
              ? connectionInfo.get(createConnectionParam(executionContext.projectId, executionContext.connectionId))
              : undefined;

            await sqlEditorNavigatorService.openNewEditor({
              dataSourceKey: LocalStorageSqlDataSource.key,
              connectionKey: connection && createConnectionParam(connection),
              query: query,
            });
          }
        }
      }
    }
  }, [navigationTabsService, sqlDataSourceService, commonDialogService, connectionInfo, sqlEditorNavigatorService]);

  useEffect(() => {
    const SQL_CONTEXT_ERROR_CODE = '508';
    if (errorInfo.error !== model.source.error) {
      errorInfo.error = model.source.error || null;
      errorInfo.display = !!model.source.error;
    }

    if (error.message) {
      const isSqlContextError = error.errorCode === SQL_CONTEXT_ERROR_CODE || /SQL context .* not found/i.test(error.message);
      if (model.source.error && isSqlContextError) {
        handleReopenEditor();
      }
    }
  }, [error.message, handleReopenEditor, model.source.error, errorInfo]);

  return styled(style)(
    <error {...use({ animated, collapsed: !errorInfo.display, errorHidden })} className={className}>
      <error-body>
        <IconOrImage icon={icon} title={error.message} onClick={() => errorInfo.show()} />
        <div>
          <error-message>{error.message}</error-message>
          {error.executionFailedMessage && (
            <error-sub-message>{`${translate('ui_audit_error_tips')}：${error.executionFailedMessage}`}</error-sub-message>
          )}
        </div>
      </error-body>
      <controls>
        <Button type="button" mod={['outlined']} onClick={() => errorInfo.hide()}>
          {translate('ui_error_close')}
        </Button>
        {error.hasDetails && (
          <Button type="button" mod={['outlined']} onClick={error.open}>
            {translate('ui_errors_details')}
          </Button>
        )}
        <Button type="button" mod={['unelevated']} onClick={onRetry}>
          {translate('ui_processing_retry')}
        </Button>
        <Button type="button" mod={['unelevated']} onClick={onCreateWorkflowNavigate}>
          {translate('ui_create_workflow')}
        </Button>
      </controls>

      <create-workflow-tips>{translate('ui_create_workflow_tips')}</create-workflow-tips>
    </error>,
  );
});
