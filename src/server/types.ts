import { DocumentContextData } from "../components/DocumentContext";

export interface EventMap {
  "navigate:start": { path: string };
  "navigate:end": DocumentContextData;
  "preload:start": { path: string };
  "preload:end": DocumentContextData;
}
