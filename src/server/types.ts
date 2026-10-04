export interface EventMap {
  navigate: NavigateStartProps;
  "navigate:start": NavigateStartProps;
  "navigate:end": NavigateEndProps;
  preload: PreloadProps;
  "preload:start": PreloadProps;
  "preload:end": PreloadProps;
  reload: ReloadProps;
  load: LoadProps;
  "load:start": LoadProps;
  "load:end": LoadProps;
}

export interface NavigateStartProps {
  path: string;
  replace?: boolean;
}

export interface NavigateEndProps {
  path: string;
}

export interface ReloadProps {
  hard?: boolean;
}

export interface PreloadProps {
  path: string;
}

export interface LoadProps {
  path: string;
}
