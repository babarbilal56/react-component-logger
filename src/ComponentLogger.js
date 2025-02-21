import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';


const components = new WeakMap();
const instances = new WeakMap();
const renderCounts = new WeakMap(); 


function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ('00' + value.toString(16)).slice(-2);
  }
  return color;
}


function log(...args) {
  console.log(...args);
}


function usecomLogCurrentComponentContext() {
  const owner =
    React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner.current || 
    { type: { name: 'unknown' }, memoizedProps: undefined };
  const name = owner.type.name || 'UnknownComponent';
  const id = owner.type;

  let path = '';
  let logPath = '';

  const stack = new Error().stack.split('\n');
  for (const line of stack) {
    const match = line.match(/^\s*at\s+(.*?)\s+\((.*?)\)$/);
    const callerName = match?.[1];
    const callerPath = match?.[2];

    if (callerPath) path += callerPath + ',';

    if (callerName && !callerName.startsWith('useTilg')) {
      logPath = callerPath;
    }

    if (callerName && !callerName.startsWith('use') && !/.+\.use.+/.test(callerName)) {
      break;
    }
  }

  return [name, owner, id, path, logPath];
}

export default function comLog(...inlined) {
  const mark = useState(Math.random())[0];
  const prevProps = useRef(null); // Track previous props
  const [name, owner, id, hookPath, logPath] = usecomLogCurrentComponentContext();

  if (!components.has(id)) {
    components.set(id, stringToColor(name));
  }
  const componentColor = components.get(id);

  if (!instances.has(id)) {
    instances.set(id, []);
  }
  const instanceMarks = instances.get(id);

  if (!renderCounts.has(id)) {
    renderCounts.set(id, 0);
  }
  renderCounts.set(id, renderCounts.get(id) + 1);
  const renderCount = renderCounts.get(id);

  useEffect(() => {
    if (!instanceMarks.includes(mark)) {
      instanceMarks.push(mark);
    }

    log(`%c<${name}/> mounted (Render Count: ${renderCount})`, `color: ${componentColor}; font-weight: bold;`);

    return () => {
      const removeIndex = instanceMarks.indexOf(mark);
      if (removeIndex !== -1) {
        instanceMarks.splice(removeIndex, 1);
      }
      log(`%c<${name}/> unmounted`, `color: ${componentColor}; font-weight: bold;`);
    };
  }, []);

  useLayoutEffect(() => {
    const prev = prevProps.current;
    const current = owner.memoizedProps;

    if (prev) {
      log(`%c<${name}/> re-rendered (Render Count: ${renderCount})`, `color: ${componentColor}; font-weight: bold;`);
      for (const key in current) {
        if (current[key] !== prev[key]) {
          log(`%cProp changed: ${key}`, `color: ${componentColor}`, {
            oldValue: prev[key],
            newValue: current[key],
          });
        }
      }
    } else {
      log(`%c<${name}/> rendered with props`, `color: ${componentColor}; font-weight: bold;`, current);
    }

    prevProps.current = current;
  });

  return function useComLogInner(strings, ...args) {
    log(...strings, ...args);
    return args[0];
  };
}
