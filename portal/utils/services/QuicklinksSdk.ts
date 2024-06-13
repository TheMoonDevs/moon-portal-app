const METADATA_API_URL =
  process.env.METADATA_API_URL ||
  "https://apps.themoondevs.com/birthdaybook/links/metadata";

const METADATA_API_TOKEN =
  process.env.METADATA_API_TOKEN ||
  "kjbdvfelrkbviAkjelknfvjdknvkndknvikbvroiebsrjvb";

export const QuicklinksSdk = {
  getData: async (endpoint: string) => {
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

  createData: async (endpoint: string, data: any) => {
    return new Promise<any>(async (resolve, reject) => {
      try {
        const options: any = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        };

        const res = await fetch(endpoint, options);
        if (res.ok) {
          const result = await res.json();
          return resolve({
            ...result,
            status: res.status,
            statusText: res.statusText,
          });
        } else {
          return reject((await res.json()) as any);
        }
      } catch (e) {
        console.log(e);
        return reject(e as any);
      }
    });
  },
  updateData: async (endpoint: string, data: any) => {
    return new Promise<any>(async (resolve, reject) => {
      try {
        const options: any = {
          method: "PUT",
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
  deleteData: async (endpoint: string) => {
    return new Promise<any>(async (resolve, reject) => {
      try {
        const options: any = {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
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
  getLinkMetaData: async (link: string) => {
    return new Promise<any>(async (resolve, reject) => {
      try {
        const res = await fetch(`${METADATA_API_URL}?url=${link}`, {
          method: "GET",
          headers: {
            Authorization: METADATA_API_TOKEN,
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          const result = await res.json();
          // console.log(result);
          const metadata = QuicklinksSdk.getMetaDataByType(result);
          return resolve(metadata);
        } else {
          return reject((await res.json()) as any);
        }
      } catch (e) {
        // console.log(e);
        return reject({ e, link });
      }
    });
  },
  getMetaDataByType: (metadata: any) => {
    const {
      twitterTitle,
      twitterDescription,
      twitterUrl,
      ogTitle,
      ogType,
      ogDescription,
      ogUrl,
      requestUrl,
      ogImage,
      twitterImage,
      favicon,
    } = metadata;
    const rootBase = requestUrl.split("/");

    const data = {
      title: twitterTitle || ogTitle,
      description: twitterDescription || ogDescription,
      url: twitterUrl || ogUrl || requestUrl,
      image: ogImage.url || twitterImage.url,
      linkType: ogType || "website",
      logo: favicon?.starthsWith("https://")
        ? favicon
        : (rootBase.lenght > 2 ? rootBase[2] : "") + favicon,
    };
    return data;
  },
};
