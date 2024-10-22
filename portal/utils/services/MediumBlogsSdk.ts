import { XMLParser } from 'fast-xml-parser';
import https from 'node:https';

export const MediumBlogsSdk = {
  getMediumFeed: async (link: string): Promise<{ item: any[] }> => {
    return new Promise((resolve, reject) => {
      https
        .get(link, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode === 200) {
              const parser = new XMLParser();
              const mediumBlogs = parser.parse(data);
              resolve(mediumBlogs.rss.channel);
            } else {
              reject(new Error(`HTTP error! status: ${res.statusCode}`));
            }
          });
        })
        .on('error', (e) => {
          // console.log(e);
          reject({ e, link });
        });
    });
  },

  getMetadata: (html: string) => {
    const imageUrlMatch = html.match(/<figure.*?><img.*?src="(.*?)".*?>/);
    const imageUrl = imageUrlMatch ? imageUrlMatch[1] : '';

    const descriptionMatch = html.match(/<p>(.*?)<\/p>/);
    const description = descriptionMatch ? descriptionMatch[1].trim() : '';

    return {
      imageUrl,
      description,
    };
  },
};
