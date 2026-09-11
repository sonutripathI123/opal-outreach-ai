'use client';

import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, Laptop } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallAppButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Already running as an installed app — no need to show the button.
  if (isStandalone) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      // Safari (desktop/iOS) and Firefox don't support the install prompt —
      // show manual "Add to Home Screen" instructions instead.
      setShowHelp(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 hover:border-amber-500/40 text-xs font-semibold transition-all"
        title="Install this app on your phone or laptop — no browser login needed afterwards"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Download App</span>
      </button>

      {showHelp && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Install Opal Outreach AI</h3>
              <button onClick={() => setShowHelp(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
                <Smartphone className="w-8 h-8 text-amber-400 shrink-0" />
                <p>
                  On iPhone/iPad: tap the <b>Share</b> icon in Safari (the square with an arrow), then choose{' '}
                  <b>&ldquo;Add to Home Screen&rdquo;</b>. The app icon will appear on your home screen and open
                  full-screen without the browser address bar.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
                <Laptop className="w-8 h-8 text-amber-400 shrink-0" />
                <p>
                  Open this site in <b>Chrome</b> or <b>Edge</b>, click the browser menu (⋮) in the top-right
                  corner, then choose <b>&ldquo;Install Opal Outreach AI&rdquo;</b> (or the install icon ⊕ in the
                  address bar). Once installed, it opens like a normal app on your laptop or phone — no browser
                  tab, and you stay logged in.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
