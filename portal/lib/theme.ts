/*
 * Light or dark for the screens that follow the device (`auto-theme`). A
 * choice made in the portal is kept on this browser and set on <html> as
 * data-theme, which wins over the device's setting.
 */

export const THEME_KEY = 'portal.theme';

/** Runs in <head>, so a chosen theme shows from the first paint. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;
