/*
 * CloudBeaver - Cloud Database Manager
 * Copyright (C) 2020-2021 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */

import { createContext } from 'react';
import { css } from 'reshadow';

import { Style, composes } from '@cloudbeaver/core-theming';

export const ITEM_LIST_STYLES = composes(
  css`
    item-list {
      composes: theme-background-surface from global;
    }
    list-item {
      composes: theme-ripple theme-background-surface theme-border-color-secondary from global;
    }
    list-search {
      composes: theme-background-surface theme-text-on-surface from global;
    }
    list-item-name {
      composes: theme-border-color-secondary from global;
    }
    ListSearchButton {
      composes: theme-ripple theme-background-primary theme-text-on-primary from global;
    }
    item-list-overflow {
      composes: branding-overflow from global;
    }
  `,
  css`
    item-list {
      box-sizing: border-box;
      border-collapse: collapse;
      z-index: 0;
      overflow: auto;
    }
    item-list-overflow {
      position: sticky;
      flex-shrink: 0;
      bottom: 0;
      width: 100%;
      height: 24px;
      pointer-events: none;
    }
    list-search {
      position: sticky;
      top: 0;
      padding: 16px;
      z-index: 1;

      & input-box {
        position: relative;
      }

      & input {
        padding: 4px 8px;
        padding-right: 32px;
      }

      & search-button {
        position: absolute;
        display: flex;
        align-items: center;
        height: 100%;
        top: 0;
        right: 2.5px;

        & ListSearchButton {
          position: relative;
          box-sizing: border-box;
          overflow: hidden;
          border-radius: 2px;
          height: 24px;
          width: 24px;
          margin: 0;
        }
      }
    }
    list-item:not(:nth-last-child(2)) {
      border-bottom: 1px solid;
    }
    list-item {
      position: relative;
      cursor: pointer;
      display: flex;
      box-sizing: border-box;
      align-items: center;
      padding: 0 8px;
    }
    list-item-icon {
      display: flex;
      align-items: center;
      box-sizing: border-box;
      padding: 8px;

      & StaticImage {
        box-sizing: border-box;
        width: 24px;
      }
    }
    list-item-name {
      composes: theme-typography--body1 from global;
      box-sizing: border-box;
      font-weight: 500;
      min-width: 250px;
      padding: 8px 24px 8px 8px;
      border-right: 1px solid;
    
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    list-item-description {
      composes: theme-typography--body2 from global;
      box-sizing: border-box;
      max-width: 460px;
      padding: 8px 8px 8px 24px;
    
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `
);

export const ITEM_LIST_STYLES_ARRAY = [ITEM_LIST_STYLES];

export const Styles = createContext<Style[]>(ITEM_LIST_STYLES_ARRAY);
