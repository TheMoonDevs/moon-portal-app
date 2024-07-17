import Parser from "rss-parser";
import { JSDOM } from "jsdom";

export const MediumBlogsSdk = {
  getMediumFeed: async (link: string) => {
    return new Promise<any>(async (resolve, reject) => {
      try {
        const res = await fetch(link, {
          method: "GET",
          headers: {
            "Content-Type": "text/xml",
          },
        });
        if (res.ok) {
          const parser: Parser = new Parser();
          const mediumBlogs = await parser.parseString(await res.text());

          // console.log(result);
          return resolve(mediumBlogs);
        } else {
          return reject((await res.json()) as any);
        }
      } catch (e) {
        // console.log(e);
        return reject({ e, link });
      }
    });
  },
  getMetadata: (html: string) => {
    const { document } = new JSDOM(html).window;

    // Extract the image URL (src attribute of the <img> tag inside the first <figure> tag)
    const figureElement = document.querySelector("figure img");
    const imageUrl = figureElement ? figureElement.getAttribute("src") : "";

    // Extract the short description (list of contents of individual <p> tags)
    const paragraphs = document.querySelectorAll("p");
    let description: string = "";
    let found = false;
    paragraphs.forEach((p: HTMLParagraphElement) => {
      if (p.textContent && !found) {
        description = p.textContent.trim();
        found = true;
      }
    });
    // Return the extracted metadata
    return {
      imageUrl,
      description,
    };
  },
};
