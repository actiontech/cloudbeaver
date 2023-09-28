/*
 * CloudBeaver - Cloud Database Manager
 * Copyright (C) 2020-2023 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */
import styled, { css } from 'reshadow';

import { Loader, Translate } from '@cloudbeaver/core-blocks';
import type { IFormState } from '@cloudbeaver/core-ui';

import { AdministrationUserForm } from '../UserForm/AdministrationUserForm';
import type { IUserFormState, UserFormProps } from '../UserForm/AdministrationUserFormService';

const styles = css`
  user-create {
    display: flex;
    flex-direction: column;
    height: 600px;
    overflow: hidden;
  }

  title-bar {
    composes: theme-border-color-background theme-typography--headline6 from global;
    box-sizing: border-box;
    padding: 16px 24px;
    align-items: center;
    display: flex;
    font-weight: 400;
    flex: auto 0 0;
  }

  user-create-content {
    composes: theme-background-secondary theme-text-on-secondary from global;
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: auto;
  }
`;

interface Props {
  state: IFormState<IUserFormState>;
  onCancel: () => void;
}

export const CreateUser: React.FC<Props> = function CreateUser({ state, onCancel }) {
  return styled(styles)(
    <user-create>
      <title-bar>
        <Translate token="authentication_administration_user_connections_user_add" />
      </title-bar>
      <user-create-content>
        <Loader suspense>
          <AdministrationUserForm state={state} onClose={onCancel} />
        </Loader>
      </user-create-content>
    </user-create>,
  );
};
