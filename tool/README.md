# wle-trace

A debugging tool for Wonderland Engine. Features:
- Method and accessor tracing for most WLE classes
- Construction and destruction tracing for most WLE resources
- Use-after-destroy and double-destroy detection (with stack traces showing where the first destroy happened)
- Low-level call tracing (for example, you can trace `_wl_load_scene_bin` calls)
- Method and accessor guarding (check for use-after-destroy in method call parameters)
- All features can be individually toggled

To setup, install `@playkostudios/wle-trace` and import it at the top of your
`index.js`; this will inject debugging code into the engine as soon as it's
possible. A controller for the debug features will be available as a global
`wleTrace` variable, accessible in the F12 console, or it can be imported.

If you want to to enable specific debug features as soon as the code injection
is complete, then call the `waitForInjections` method in the controller.
```js
import wleTrace from '@playkostudios/wle-trace';

wleTrace.waitForInjections(() => {
    wleTrace.enableWithPrefix('guard:');
    wleTrace.enableWithPrefix('trace:destruction:');
    wleTrace.enableWithPrefix('trace:construction:');
});
```
