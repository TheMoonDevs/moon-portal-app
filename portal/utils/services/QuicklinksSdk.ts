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
    const extractUrl = (
      image: string | any[] | { url: string | null } | null
    ) => {
      if (!image) return "";

      // Handle the case where image itself is a URL string (unlikely but covered)
      if (typeof image === "string") return image;

      if (Array.isArray(image)) {
        for (const item of image) {
          if (typeof item === "object" && item?.url) return item.url;
        }
        return "";
      }

      if (typeof image === "object" && image !== null) return image.url || "";

      return "";
    };

    const ogImageUrl = extractUrl(ogImage);
    const twitterImageUrl = extractUrl(twitterImage);

    const linkUrl = requestUrl || ogUrl || twitterUrl || "";

    let imageUrl;

    if (ogImageUrl && twitterImageUrl && ogImageUrl === twitterImageUrl)
      imageUrl = ogImageUrl;
    else imageUrl = ogImageUrl || twitterImageUrl;
    const data = {
      title: twitterTitle || ogTitle || "",
      description: twitterDescription || ogDescription || "",
      url: linkUrl,
      image: imageUrl,
      linkType: ogType || "website",
      logo: favicon?.startsWith("https://")
        ? favicon
        : (rootBase.length > 2 ? rootBase[0] + "//" + rootBase[2] : "") +
          favicon,
    };
    return data;
  },
  moveData: (endpoint: string, data: any) => {
    return new Promise<any>(async (resolve, reject) => {
      try {
        const options: any = {
          method: "PATCH",
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
};
