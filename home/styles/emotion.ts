import createCache from "@emotion/cache";
// import createEmotionServer from "@emotion/server/create-instance";
// import { cache } from "@emotion/css";

// export const renderStatic = async (html) => {
//   if (html === undefined) {
//     throw new Error("did you forget to return html from renderToString?");
//   }

//   const { extractCritical } = createEmotionServer(cache);
//   const { ids, css } = extractCritical(html);

//   return { html, ids, css };
// };

// prepend: true moves MUI styles to the top of the <head> so they're loaded first.
// It allows developers to easily override MUI styles with other styling solutions, like CSS modules.
export default function createEmotionCache() {
  return createCache({ key: "css"
  //, prepend: true 
});
}