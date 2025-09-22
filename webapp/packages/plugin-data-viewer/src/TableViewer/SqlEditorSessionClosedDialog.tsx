import {
  Button,
  Fill,
  Translate,
  CommonDialogBody,
  CommonDialogHeader,
  CommonDialogWrapper,
  s,
  CommonDialogFooter,
  useS,
} from '@cloudbeaver/core-blocks';
import style from './SqlEditorSessionClosedDialog.module.css';

import type { DialogComponent } from '@cloudbeaver/core-dialogs';

export interface SqlEditorSessionClosedDialogPayload {
  query?: string;
}

export const SqlEditorSessionClosedDialog: DialogComponent<SqlEditorSessionClosedDialogPayload, boolean> = function SqlSessionClosedDialog({
  payload,
  resolveDialog,
  rejectDialog,
  className,
}) {
  const styles = useS(style);

  return (
    <CommonDialogWrapper size="medium" className={className} fixedWidth>
      <CommonDialogHeader title="plugin_data_viewer_sql_session_closed_title" icon="/icons/info_icon.svg" onReject={rejectDialog} />
      <CommonDialogBody>
        <div className={s(styles, { container: true })}>
          <div className={s(styles, { message: true })}>
            <Translate token="plugin_data_viewer_sql_session_closed_message" />
          </div>
          {payload.query && (
            <div className={s(styles, { queryInfo: true })}>
              <div className={s(styles, { queryLabel: true })}>
                <Translate token="plugin_data_viewer_sql_session_closed_query_label" />
              </div>
              <div className={s(styles, { queryPreview: true })} title={payload.query}>
                {payload.query.length > 100 ? `${payload.query.substring(0, 100)}...` : payload.query}
              </div>
            </div>
          )}
        </div>
      </CommonDialogBody>
      <CommonDialogFooter className={s(styles, { footer: true })}>
        <Button type="button" variant="secondary" onClick={rejectDialog}>
          <Translate token="ui_processing_cancel" />
        </Button>
        <Fill />
        <Button type="button" onClick={() => resolveDialog(true)}>
          <Translate token="plugin_data_viewer_sql_session_closed_open_editor" />
        </Button>
      </CommonDialogFooter>
    </CommonDialogWrapper>
  );
};
