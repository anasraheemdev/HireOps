/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

for (const [file, hook, key] of [['favorites-store.ts','useFavorites','hireops-favorites'],['recent-store.ts','useRecent','hireops-recent']]) {
  let store, notifications=0;
  const listeners=new Set();
  const storage=new Map([[key, '[]']]);
  const context={exports:{}, window:{addEventListener:(_,f)=>listeners.add(f),removeEventListener:(_,f)=>listeners.delete(f)},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},require:name=>{
    assert.equal(name,'react');
    return {useCallback:f=>f,useSyncExternalStore:(subscribe,getSnapshot,getServerSnapshot)=>{
      assert.strictEqual(getServerSnapshot(),getServerSnapshot(),'Hydration snapshot must have stable identity');
      assert.strictEqual(getSnapshot(),getSnapshot(),'Unchanged client snapshot must have stable identity');
      store={subscribe,getSnapshot,getServerSnapshot};return getSnapshot();
    }};
  }};
  const source=fs.readFileSync(`src/components/workspace/${file}`,'utf8');
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,context);
  const actions=context.exports[hook]();
  const unsubscribe=store.subscribe(()=>notifications++);
  const item={id:'one',type:'page',label:'Page',href:'/hr/dashboard'};
  (actions.toggle??actions.push)(item);
  assert.equal(store.getSnapshot().length,1);
  assert.equal(store.getServerSnapshot().length,0,'Server snapshot never contains browser data');
  const stable=store.getSnapshot();
  for(const listener of listeners) listener({key});
  assert.strictEqual(store.getSnapshot(),stable,'Unchanged storage event must not replace snapshot');
  storage.set(key,'invalid JSON');
  for(const listener of listeners) listener({key});
  assert.equal(store.getSnapshot().length,0,'Corrupt browser storage recovers safely');
  assert.ok(notifications>=2);
  unsubscribe();assert.equal(listeners.size,0);
  console.log(`PASS ${file}: stable hydration/client snapshots, mutations, cross-tab sync, corrupt-storage recovery and unsubscribe`);
}
