/*
 * CloudBeaver - Cloud Database Manager
 * Copyright (C) 2020-2025 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */
import { observable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect } from 'react';
import { compressToEncodedURIComponent } from 'lz-string';

import { Button, IconOrImage, Placeholder, s, useErrorDetails, useObservableRef, useS, useStateDelay, useTranslate } from '@cloudbeaver/core-blocks';
import { ServerErrorType, ServerInternalError } from '@cloudbeaver/core-sdk';
import { errorOf } from '@cloudbeaver/core-utils';
import { useService } from '@cloudbeaver/core-di';

import type { IDatabaseDataModel } from '../DatabaseDataModel/IDatabaseDataModel.js';
import { DataViewerService } from '../DataViewerService.js';
import styles from './TableError.module.css';
import { ConnectionSchemaManagerService } from '@cloudbeaver/plugin-datasource-context-switch';
import { NavigationTabsService } from '@cloudbeaver/plugin-navigation-tabs';
import { ConnectionInfoResource, createConnectionParam } from '@cloudbeaver/core-connections';
import { CommonDialogService, DialogueStateResult } from '@cloudbeaver/core-dialogs';
import { LocalStorageSqlDataSource, QueryDataSource, SqlDataSourceService } from '@cloudbeaver/plugin-sql-editor';
import { isSQLEditorTab, SqlEditorNavigatorService } from '@cloudbeaver/plugin-sql-editor-navigation-tab';
import { SqlEditorSessionClosedDialog } from './SqlEditorSessionClosedDialog.js';

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

  const style = useS(styles);
  const dataViewerService = useService(DataViewerService);

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

  // keep it like this or remove error another way:
  // console goes with error that we cannot modify ref value in render method.
  useEffect(() => {
    if (errorInfo.error !== model.source.error) {
      errorInfo.error = model.source.error || null;
      errorInfo.display = !!model.source.error;
    }
  }, [errorInfo, model.source.error]);

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

  const onStillExecute = useCallback(async () => {
    await (model.source as QueryDataSource).requestWithExecuteAnyway();
  }, [model]);

  useEffect(() => {
    const SQL_CONTEXT_ERROR_CODE = '508';
    if (errorInfo.error !== model.source.error) {
      errorInfo.error = model.source.error || null;
      errorInfo.display = !!model.source.error;
    }
    const isSqlContextError = error.errorCode === SQL_CONTEXT_ERROR_CODE || /SQL context .* not found/i.test(error.message || '');
    if (isSqlContextError) {
      handleReopenEditor();
    }
  }, [error.message, handleReopenEditor, model.source.error, errorInfo, error.errorCode]);

  return (
    <div
      role="status"
      aria-label={error.message}
      tabIndex={0}
      className={s(style, { error: true, animated, collapsed: !errorInfo.display, errorHidden }, className)}
    >
      <div className={s(style, { errorBody: true })}>
        <IconOrImage className={s(style, { iconOrImage: true })} icon={icon} title={error.message} onClick={() => errorInfo.show()} />
        <div>
          <div className={s(style, { errorMessage: true })}>{error.message}</div>
          {error.executionFailedMessage && (
            <div className={s(style, { errorSubMessage: true })}>{`${translate('ui_audit_error_tips')}：${error.executionFailedMessage}`}</div>
          )}
        </div>
      </div>
      <div className={s(style, { controls: true })}>
        <Placeholder container={dataViewerService.errorActionsContainer} model={model} />

        <Button className={s(style, { button: true })} type="button" variant="secondary" onClick={() => errorInfo.hide()}>
          {translate('ui_error_close')}
        </Button>
        {error.hasDetails && (
          <Button className={s(style, { button: true })} type="button" variant="secondary" onClick={error.open}>
            {translate('ui_errors_details')}
          </Button>
        )}
        <Button className={s(style, { button: true })} type="button" onClick={onRetry}>
          {translate('ui_processing_retry')}
        </Button>
        <Button className={s(style, { button: true })} type="button" onClick={onCreateWorkflowNavigate}>
          {translate('ui_create_workflow')}
        </Button>
        <Button className={s(style, { button: true })} type="button" onClick={onStillExecute}>
          {translate('ui_still_execute')}
        </Button>
      </div>
    </div>
  );
});
