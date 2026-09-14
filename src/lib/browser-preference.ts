"use client";
import { useCallback, useSyncExternalStore } from 'react';
const CHANGE='hireops-preference-change';
function subscribe(listener:()=>void){
  window.addEventListener('storage',listener);
  window.addEventListener(CHANGE,listener);
  return()=>{window.removeEventListener('storage',listener);window.removeEventListener(CHANGE,listener);};
}
export function useBrowserPreference(key:string,fallback:string){
  const snapshot=useCallback(()=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}},[key,fallback]);
  const serverSnapshot=useCallback(()=>fallback,[fallback]);
  const value=useSyncExternalStore(subscribe,snapshot,serverSnapshot);
  const setValue=useCallback((value:string)=>{try{localStorage.setItem(key,value);window.dispatchEvent(new Event(CHANGE));}catch{/* Storage can be disabled by browser policy. */}},[key]);
  return [value,setValue] as const;
}
