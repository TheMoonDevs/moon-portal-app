export const ShortUrlSdk = {
  createShortUrl: async (
    endpoint: string,
    data: { url: string; slug: string; params: any }
  ) => {
    return new Promise<any>(async (resolve, reject) => {
      try {
        const options = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        };

        const res = await fetch(endpoint, options);

        if (res.ok) {
          const result = await res.json();
          return resolve(result);
        } else {
          return reject((await res.json()) as any);
        }
      } catch (e) {
        console.log(e);
        return reject(e as any);
      }
    });
  },

  getAllShortUrls: (endpoint: string) => {
    return new Promise<any>(async (resolve, reject) => {
      try {
        const res = await fetch(endpoint);
        if (res.ok) {
          const result = await res.json();
          return resolve(result);
        } else {
          return reject((await res.json()) as any);
        }
      } catch (e) {
        console.log(e);
        return reject(e as any);
      }
    });
  },

  deleteShortUrl: (endpoint: string, id: string) => {
    return new Promise<any>(async (resolve, reject) => {
      try {
        const options = {
          method: "DELETE",
        };
        const res = await fetch(`${endpoint}?id=${id}`, options);
        if (res.ok) {
          const result = await res.json();
          return resolve(result);
        } else {
          return reject((await res.json()) as any);
        }
      } catch (e) {
        console.log(e);
        return reject(e as any);
      }
    });
  },

  //   getLongUrlFromShortUrl: (url: string, body: any) => {
  //     return new Promise<any>(async (resolve, reject) => {
  //       try {
  //         const options: any = {
  //           method: "GET",
  //         };
  //         if (body && Object.keys(body).length > 0)
  //           options.body = JSON.stringify(body);
  //         //console.log(url, options);
  //         const res = await fetch(url, options);
  //         if (res.ok) {
  //           const result = await res.json();
  //           return resolve(result as any);
  //         } else {
  //           return reject((await res.json()) as any);
  //         }
  //       } catch (e) {
  //         console.log(e);
  //         return reject(e as any);
  //       }
  //     });
  //   },
};
