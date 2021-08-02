/*
 * CloudBeaver - Cloud Database Manager
 * Copyright (C) 2020-2021 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */

import { makeObservable, observable } from 'mobx';

import { injectable } from '@cloudbeaver/core-di';
import { GraphQLService, CachedDataResource, ServerConfig, ServerConfigInput, NavigatorSettingsInput } from '@cloudbeaver/core-sdk';
import { isArraysEqual } from '@cloudbeaver/core-utils';

import { isNavigatorViewSettingsEqual } from './ConnectionNavigatorViewSettings';

@injectable()
export class ServerConfigResource extends CachedDataResource<ServerConfig | null, void> {
  update: ServerConfigInput;
  navigatorSettingsUpdate: NavigatorSettingsInput;

  constructor(
    private graphQLService: GraphQLService
  ) {
    super(null);

    this.update = {};
    this.navigatorSettingsUpdate = {
      hideFolders: false,
      hideSchemas: false,
      hideVirtualModel: false,
      mergeEntities: false,
      showOnlyEntities: false,
      showSystemObjects: false,
      showUtilityObjects: false,
    };

    makeObservable(this, {
      update: observable,
      navigatorSettingsUpdate: observable,
    });
  }

  get serverVersion(): string {
    return this.data?.version || '';
  }

  get workspaceId(): string {
    return this.data?.workspaceId || '';
  }

  get configurationMode(): boolean {
    return !!this.data?.configurationMode;
  }

  get publicDisabled(): boolean {
    if (this.data?.configurationMode
    || (this.data?.licenseRequired && !this.data?.licenseValid)) {
      return true;
    }

    return false;
  }

  get enabledAuthProviders(): string[] {
    return this.update.enabledAuthProviders || this.data?.enabledAuthProviders || [];
  }

  get credentialsSaveEnabled(): boolean {
    return this.update.adminCredentialsSaveEnabled ?? this.data?.adminCredentialsSaveEnabled ?? false;
  }

  get userCredentialsSaveEnabled(): boolean {
    return this.update.publicCredentialsSaveEnabled ?? this.data?.publicCredentialsSaveEnabled ?? false;
  }

  isChanged(): boolean {
    if (!this.data || Object.keys(this.update).length === 0) {
      return false;
    }

    if (this.update.adminName || this.update.adminPassword) {
      return true;
    }

    return (
      this.update.serverName !== this.data.name
      || this.update.serverURL !== this.data.serverURL
      || this.update.sessionExpireTime !== this.data.sessionExpireTime

      || this.update.anonymousAccessEnabled !== this.data.anonymousAccessEnabled

      || this.update.adminCredentialsSaveEnabled !== this.data.adminCredentialsSaveEnabled
      || this.update.publicCredentialsSaveEnabled !== this.data.publicCredentialsSaveEnabled

      || this.update.customConnectionsEnabled !== this.data.supportsCustomConnections
      || !isArraysEqual(this.update.enabledAuthProviders || [], this.data.enabledAuthProviders)
    );
  }

  isNavigatorSettingsChanged(): boolean {
    if (!this.data?.defaultNavigatorSettings) {
      return false;
    }

    return !isNavigatorViewSettingsEqual(this.data.defaultNavigatorSettings, this.navigatorSettingsUpdate);
  }

  setDataUpdate(update: ServerConfigInput): void {
    this.update = update;
  }

  setNavigatorSettingsUpdate(update: NavigatorSettingsInput): void {
    this.navigatorSettingsUpdate = update;
  }

  unlinkUpdate(): void {
    this.update = {};

    if (this.data) {
      Object.assign(this.navigatorSettingsUpdate, this.data.defaultNavigatorSettings);
    } else {
      this.navigatorSettingsUpdate = {
        hideFolders: false,
        hideSchemas: false,
        hideVirtualModel: false,
        mergeEntities: false,
        showOnlyEntities: false,
        showSystemObjects: false,
        showUtilityObjects: false,
      };
    }
  }

  async save(skipConfigUpdate = false): Promise<void> {
    await this.performUpdate(undefined, undefined, async () => {
      if (this.isNavigatorSettingsChanged()) {
        await this.graphQLService.sdk.setDefaultNavigatorSettings({ settings: this.navigatorSettingsUpdate });

        if (this.data) {
          this.data.defaultNavigatorSettings = { ...this.navigatorSettingsUpdate };
        } else {
          this.data = await this.loader();
        }
      }

      if (this.isChanged() && !skipConfigUpdate) {
        await this.graphQLService.sdk.configureServer({
          configuration: this.update,
        });
        this.data = await this.loader();
      }
    }, () => !this.isNavigatorSettingsChanged() && (!this.isChanged() || skipConfigUpdate));
  }

  async finishConfiguration(onlyRestart = false): Promise<void> {
    await this.performUpdate(undefined, undefined, async () => {
      await this.graphQLService.sdk.configureServer({
        configuration: !this.isChanged() && onlyRestart ? {} : this.update,
      });
      this.data = await this.loader();
    }, () => !this.isChanged() && !onlyRestart);
  }

  protected async loader(): Promise<ServerConfig> {
    const { serverConfig } = await this.graphQLService.sdk.serverConfig();

    this.syncUpdateData(serverConfig);

    return serverConfig as ServerConfig;
  }

  private syncUpdateData(serverConfig: ServerConfig) {
    if (this.configurationMode) {
      return;
    }

    Object.assign(this.navigatorSettingsUpdate, serverConfig.defaultNavigatorSettings);

    this.update.serverName = serverConfig.name;
    this.update.serverURL = serverConfig.serverURL;
    this.update.sessionExpireTime = serverConfig.sessionExpireTime;

    this.update.adminName = undefined;
    this.update.adminPassword = undefined;

    this.update.anonymousAccessEnabled = serverConfig.anonymousAccessEnabled;

    this.update.adminCredentialsSaveEnabled = serverConfig.adminCredentialsSaveEnabled;
    this.update.publicCredentialsSaveEnabled = serverConfig.publicCredentialsSaveEnabled;

    this.update.customConnectionsEnabled = serverConfig.supportsCustomConnections;
    this.update.enabledAuthProviders = [...serverConfig.enabledAuthProviders];
  }
}
