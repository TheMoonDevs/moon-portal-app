export const PortalSdk = {
  getData: (url: string, body: any) => {
    return new Promise<any>(async (resolve, reject) => {
      try {
        const options:any = {
            method: 'GET',
        }
        if(body && Object.keys(body).length > 0)
        options.body = JSON.stringify(body);
        //console.log(url, options);
        const res = await fetch(url, options)
        if (res.ok) {
          const result = await res.json()
          return resolve(result as any)
        }
        else {
            return reject(res.status as any)
        }
      } catch (e) {
        console.log(e)
        return reject(e as any)
      }
    })
  },
  postData: (url: string, params: any) => {
    return new Promise<any>(async (resolve, reject) => {
    try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params.data),
    })
    if (res.ok) {
      const result = await res.json()
      return resolve(result)
    }
    else {
      return reject(res.status as any)
    }
  }
  catch(e) {
    console.log(e)
        return reject(e as any)
  }})
  },
}
