/*
 * CloudBeaver - Cloud Database Manager
 * Copyright (C) 2020-2023 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */
import axios from 'axios';

import { Bootstrap, injectable } from '@cloudbeaver/core-di';
import { Executor, IExecutor } from '@cloudbeaver/core-executor';
import { EServerErrorCode, GQLError, GraphQLService } from '@cloudbeaver/core-sdk';
import { errorOf } from '@cloudbeaver/core-utils';

import { SessionError } from './SessionError';

@injectable()
export class SessionExpireService extends Bootstrap {
  expired = false;

  onSessionExpire: IExecutor;
  constructor(private readonly graphQLService: GraphQLService) {
    super();
    this.onSessionExpire = new Executor();
  }

  register(): void {
    this.graphQLService.registerInterceptor(this.sessionExpiredInterceptor.bind(this));
  }

  load(): void {}

  sessionExpired(): void {
    if (this.expired) {
      return;
    }

    const e = new SessionError('Session expired');
    this.graphQLService.blockRequests(e);
    this.expired = true;
    this.onSessionExpire.execute();
  }

  private async sessionExpiredInterceptor(request: Promise<any>): Promise<any> {
    try {
      return await request;
    } catch (exception: any) {
      console.log(exception);
      const gqlError = errorOf(exception, GQLError);
      if (gqlError?.errorCode === EServerErrorCode.sessionExpired) {
        this.sessionExpired();
      } else if (this.isUnauthorized(exception)) {
        return await this.handleUnauthorized(request);
      }
      throw exception;
    }
  }

  private isUnauthorized(exception: any): boolean {
    return exception?.response?.status === 401 || exception?.status === 401 || exception?.statusCode === 401;
  }

  private redirectToLogin = () => {
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const DMS_REDIRECT_KEY_PARAMS_NAME = 'target';

    if (currentPath === '/login') {
      return;
    }

    const targetUrl = currentPath + currentSearch;
    window.location.href = `/login?${DMS_REDIRECT_KEY_PARAMS_NAME}=${encodeURIComponent(targetUrl)}`;
  };

  private async handleUnauthorized(originalRequest: Promise<any>): Promise<any> {
    try {
      await axios.post('/v1/dms/sessions/refresh');

      return await originalRequest;
    } catch (refreshError) {
      this.redirectToLogin();
      throw refreshError;
    }
  }
}
