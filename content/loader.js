(() => {
  const EXT = globalThis.browser ?? globalThis.chrome;
  const injectorUrl = EXT.runtime.getURL("core/injector.js");

  function inject() {
    if (window.__micMaxLoaderBusy) return;
    window.__micMaxLoaderBusy = true;

    const alreadyReady = document.documentElement?.dataset?.micMaxLoaderInjected === "1";
    if (alreadyReady && window.__micMaxInjectorReady) {
      window.__micMaxLoaderBusy = false;
      return;
    }

    const s = document.createElement("script");
    s.src = injectorUrl;
    s.async = false;
    s.onload = () => {
      document.documentElement.dataset.micMaxLoaderInjected = "1";
      window.__micMaxLoaderBusy = false;
    };
    s.onerror = () => { window.__micMaxLoaderBusy = false; };
    (document.head || document.documentElement).appendChild(s);
  }

  inject();

  const mo = new MutationObserver(() => {
    if (!window.__micMaxInjectorReady) inject();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  setInterval(() => {
    if (!window.__micMaxInjectorReady) inject();
  }, 3000);
})();
