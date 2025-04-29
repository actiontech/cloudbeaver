export enum StorageKey {
  DMS_AVAILABILITY_ZONE = 'DMS_AVAILABILITY_ZONE',
}

class LocalStorageWrapper {
  public set<T extends string = string>(key: string, value: T) {
    return localStorage.setItem(key, value);
  }

  public get(key: string) {
    return localStorage.getItem(key);
  }

  public getOrDefault(key: string, defaultValue: string): string {
    if (localStorage.getItem(key) === null) {
      return defaultValue;
    }
    return localStorage.getItem(key) as string;
  }
}

export const localStorageWrapper = new LocalStorageWrapper();

export const getRecentlySelectedZone = (): string => {
  const data = localStorageWrapper.get(StorageKey.DMS_AVAILABILITY_ZONE);
  try {
    const parsedData = JSON.parse(data || '[]');
    return parsedData?.[0]?.uid ?? '';
  } catch (error) {
    console.error(error);
    return '';
  }
};
