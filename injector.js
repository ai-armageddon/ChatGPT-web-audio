/* Runs in the page's MAIN world.
 * ChatGPT sometimes plays Read Aloud audio through a detached `new Audio()` object
 * that never enters the DOM, so the isolated content script can't see it.
 * Patch HTMLMediaElement.play so any detached audio gets adopted into the DOM
 * (hidden), where the content script's MutationObserver picks it up.
 */
(() => {
  const REWIND_HISTORY_SECONDS = 60;
  const mediaSourcesByUrl = new Map();
  const mediaSourceByBuffer = new WeakMap();
  const audioByMediaSource = new WeakMap();

  // ChatGPT feeds Read Aloud through a MediaSource and continually removes
  // audio just behind the playhead. Its seekable range still starts at zero,
  // so seeking into that discarded section stalls the element. Keep a bounded
  // minute of real media available for the extension's rewind control.
  if (
    typeof MediaSource !== 'undefined' &&
    typeof SourceBuffer !== 'undefined' &&
    typeof URL.createObjectURL === 'function'
  ) {
    const origCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = function (object) {
      const url = origCreateObjectURL.apply(this, arguments);
      if (object instanceof MediaSource) mediaSourcesByUrl.set(url, object);
      return url;
    };

    const origAddSourceBuffer = MediaSource.prototype.addSourceBuffer;
    MediaSource.prototype.addSourceBuffer = function (...args) {
      const buffer = origAddSourceBuffer.apply(this, args);
      mediaSourceByBuffer.set(buffer, this);
      return buffer;
    };

    const origRemove = SourceBuffer.prototype.remove;
    SourceBuffer.prototype.remove = function (start, end) {
      try {
        const mediaSource = mediaSourceByBuffer.get(this);
        const audio = mediaSource && audioByMediaSource.get(mediaSource);
        if (audio && Number.isFinite(audio.currentTime)) {
          const historyStart = Math.max(0, audio.currentTime - REWIND_HISTORY_SECONDS);
          const overlapsHistory = start < audio.currentTime && end > historyStart;

          if (overlapsHistory) {
            if (start < historyStart) {
              // Trim only media older than the history window.
              end = Math.min(end, historyStart);
            } else {
              // Preserve SourceBuffer's async update/updateend contract. The
              // site waits for it before appending more data, so perform a
              // harmless removal in the already-old edge of the timeline.
              start = 0;
              end = 0.001;
            }
          }
        }
      } catch (_) {
        /* fall through to the native removal */
      }
      return origRemove.call(this, start, end);
    };
  }

  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    try {
      if (this.tagName === 'AUDIO' && !this.isConnected && document.body) {
        this.style.display = 'none';
        this.setAttribute('data-cgpt-ah-adopted', '1');
        document.body.appendChild(this);
      }

      if (this.tagName === 'AUDIO') {
        const mediaSource = mediaSourcesByUrl.get(this.currentSrc || this.src);
        if (mediaSource) audioByMediaSource.set(mediaSource, this);
      }
    } catch (_) {
      /* never break playback */
    }
    return origPlay.apply(this, args);
  };
})();
