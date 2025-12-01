/* bottom-banner.js
   Loads /socials.json and injects a fixed bottom banner with contact + social icons.
   This is used only by static HTML pages (privacy.html, terms.html). The React app
   uses its own BottomBanner component and will not load this script.
*/

(async function () {
  try {
    const res = await fetch('/socials.json', { cache: 'no-cache' });
    if (!res.ok) {
      console.debug('bottom-banner: /socials.json HTTP status', res.status);
      return;
    }
    const socials = await res.json();
    const { twitter, instagram, linkedin } = socials || {};
    if (!twitter && !instagram && !linkedin) {
      console.debug('bottom-banner: socials.json contains no links');
      return;
    }

    if (document.getElementById('site-bottom-banner')) return; // avoid duplicates

    const wrapper = document.createElement('div');
    wrapper.id = 'site-bottom-banner';
    wrapper.style.cssText = 'position:fixed;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);color:#eee;padding:10px 8px;z-index:9999;font-family:system-ui,Segoe UI,Roboto,Arial;';

    const inner = document.createElement('div');
    inner.style.cssText = 'max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:6px 12px;gap:8px';

    const contact = document.createElement('div');
    contact.style.cssText = 'font-size:13px;color:#ddd';
    contact.innerHTML = 'Contact: <a href="mailto:abc@gmail.com" style="color:#fff;text-decoration:underline">abc@gmail.com</a>';

    const socialsEl = document.createElement('div');
    socialsEl.style.cssText = 'display:flex;align-items:center;gap:12px';

    const makeIcon = (href, title, svg) => {
      const a = document.createElement('a');
      a.href = href;
      a.title = title;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.style.color = '#fff';
      a.style.display = 'inline-flex';
      a.style.alignItems = 'center';
      a.style.justifyContent = 'center';
      a.style.width = '36px';
      a.style.height = '36px';
      a.style.borderRadius = '6px';
      a.style.background = 'rgba(255,255,255,0.05)';
      a.innerHTML = svg;
      a.onmouseenter = () => (a.style.background = 'rgba(255,255,255,0.12)');
      a.onmouseleave = () => (a.style.background = 'rgba(255,255,255,0.05)');
      return a;
    };

    if (twitter) {
      socialsEl.appendChild(makeIcon(twitter, 'Twitter / X', '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53A4.48 4.48 0 0 0 22.43.36a9.05 9.05 0 0 1-2.88 1.1A4.52 4.52 0 0 0 16.15 0c-2.5 0-4.52 2.2-4.52 4.9 0 .39.04.77.13 1.13-3.76-.19-7.1-2.03-9.34-4.82a4.93 4.93 0 0 0-.61 2.47c0 1.7.77 3.2 1.94 4.07a4.39 4.39 0 0 1-2.05-.58v.06c0 2.38 1.6 4.37 3.73 4.82-.39.1-.8.15-1.23.15-.3 0-.59-.03-.87-.08.6 1.86 2.33 3.22 4.37 3.26A9.06 9.06 0 0 1 1 19.54 12.74 12.74 0 0 0 7.29 21c8.58 0 13.28-7.46 13.28-13.93 0-.21 0-.42-.02-.63A9.97 9.97 0 0 0 23 3z"/></svg>'));
    }
    if (instagram) {
      socialsEl.appendChild(makeIcon(instagram, 'Instagram', '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c3.2 0 3.584.012 4.85.07 1.17.055 1.8.24 2.22.4.56.2.96.44 1.37.85.41.41.64.81.85 1.37.16.42.34 1.05.4 2.22.058 1.26.07 1.65.07 4.85s-.012 3.595-.07 4.85c-.055 1.17-.24 1.8-.4 2.22-.2.56-.44.96-.85 1.37-.41.41-.81.64-1.37.85-.42.16-1.05.34-2.22.4-1.26.058-1.65.07-4.85.07s-3.595-.012-4.85-.07c-1.17-.055-1.8-.24-2.22-.4-.56-.2-.96-.44-1.37-.85-.41-.41-.64-.81-.85-1.37-.16-.42-.34-1.05-.4-2.22C2.212 15.595 2.2 15.206 2.2 12s.012-3.595.07-4.85c.055-1.17.24-1.8.4-2.22.2-.56.44-.96.85-1.37.41-.41.81-.64 1.37-.85.42-.16 1.05-.34 2.22-.4C8.415 2.212 8.8 2.2 12 2.2m0-2.2C8.735 0 8.332.012 7.052.07 5.76.128 4.84.308 4.01.62c-.92.36-1.7.84-2.47 1.61C.8 3.6.32 4.38-.04 5.3c-.31.83-.49 1.75-.55 3.04C-.01 10.95 0 11.354 0 14.618s-.012 3.668.07 4.948c.06 1.29.24 2.21.55 3.04.36.92.84 1.7 1.61 2.47.76.76 1.54 1.25 2.47 1.61.83.31 1.75.49 3.04.55 1.28.06 1.68.07 4.946.07s3.668-.012 4.948-.07c1.29-.06 2.21-.24 3.04-.55.92-.36 1.7-.84 2.47-1.61.76-.76 1.25-1.54 1.61-2.47.31-.83.49-1.75.55-3.04.06-1.28.07-1.68.07-4.946s-.012-3.668-.07-4.948c-.06-1.29-.24-2.21-.55-3.04-.36-.92-.84-1.7-1.61-2.47C20.2.8 19.42.32 18.5-.04c-.83-.31-1.75-.49-3.04-.55C15.668.012 15.268 0 12 0z"/></svg>'));
    }
    if (linkedin) {
      socialsEl.appendChild(makeIcon(linkedin, 'LinkedIn', '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.026-3.039-1.853-3.039-1.855 0-2.138 1.447-2.138 2.942v5.666H8.352V9h3.414v1.561h.049c.476-.9 1.637-1.853 3.37-1.853 3.605 0 4.27 2.372 4.27 5.456v6.288zM5.337 7.433a2.062 2.062 0 1 1 0-4.123 2.062 2.062 0 0 1 0 4.123zM7.114 20.452H3.56V9h3.554v11.452zM22.225 0H1.771C.791 0 0 .77 0 1.723v20.555C0 23.23.792 24 1.771 24h20.451C23.206 24 24 23.23 24 22.278V1.723C24 .77 23.206 0 22.225 0z"/></svg>'));
    }

    inner.appendChild(contact);
    inner.appendChild(socialsEl);
    wrapper.appendChild(inner);
    document.body.appendChild(wrapper);
    console.debug('bottom-banner: injected banner for socials', { twitter, instagram, linkedin });

    // Avoid hiding page content behind the banner — add bottom padding
    const existing = document.documentElement.style.paddingBottom || '';
    document.documentElement.style.paddingBottom = existing + '48px';
  } catch (err) {
    // silently fail — no banner
    console.warn('bottom-banner: failed to load socials.json', err);
  }
})();
