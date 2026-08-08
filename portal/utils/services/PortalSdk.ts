import { LOCAL_STORAGE, TMD_PORTAL_API_KEY } from '../constants/appInfo';
import { toPermissionError } from '../permissions/clientPermissions';

/**
 * When a response is a 403 permission denial, broadcast the global event and
 * return a `PermissionError` to reject with; otherwise return the raw payload
 * so existing error handling is unchanged.
 */
const asRejection = async (res: Response): Promise<unknown> => {
  let payload: unknown;
  try {
    payload = await res.clone().json();
  } catch {
    payload = res.status;
  }
  const permissionError = toPermissionError(payload);
  return permissionError ?? payload;
};

export const PortalSdk = {
  getData: (url: string, body: any) => {
    return new Promise<any>(async (resolve, reject) => {
      try {
        const options: any = {
          method: 'GET',
        };
        if (body && Object.keys(body).length > 0)
          options.body = JSON.stringify(body);
        //console.log(url, options);
        const res = await fetch(url, options);
        if (res.ok) {
          const result = await res.json();
          return resolve(result as any);
        } else {
          return reject(await asRejection(res));
        }
      } catch (e) {
        console.log(e);
        return reject(e as any);
      }
    });
  },
  postData: (url: string, data: any) => {
    return new Promise<any>(async (resolve, reject) => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            tmd_portal_api_key: TMD_PORTAL_API_KEY,
          },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const result = await res.json();
          return resolve(result);
        } else {
          return reject(await asRejection(res));
        }
      } catch (e) {
        console.log(e);
        return reject(e as any);
      }
    });
  },
  putData: (url: string, data: any) => {
    return new Promise<any>(async (resolve, reject) => {
      try {
        const res = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            tmd_portal_api_key: TMD_PORTAL_API_KEY,
          },
          body: JSON.stringify(data),
        });
        // console.log(await res.json());
        if (res.ok) {
          const result = await res.json();
          if (result?.latestUser) {
            localStorage.setItem(
              LOCAL_STORAGE.user,
              JSON.stringify(result?.latestUser),
            );
          }
          return resolve(result);
        } else if (res.status === 409) {
          const result = await res.json();
          if (result?.latestUser) {
            localStorage.setItem(
              LOCAL_STORAGE.user,
              JSON.stringify(result?.latestUser),
            );
          }
          throw result.error;
        } else {
          return reject(await asRejection(res));
        }
      } catch (e) {
        console.log(e);
        return reject(e as any);
      }
    });
  },
  deleteData: (url: string, data: any) => {
    return new Promise<any>(async (resolve, reject) => {
      try {
        const res = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            tmd_portal_api_key: TMD_PORTAL_API_KEY,
          },
          body: JSON.stringify(data),
        });
        // console.log(res);
        if (res.ok) {
          const result = await res.json();
          return resolve(result);
        } else {
          return reject(await asRejection(res));
        }
      } catch (e) {
        console.log(e);
        return reject(e as any);
      }
    });
  },
};
