import { FormInfo } from "@/components/Pages/GetStartedPage/SurveySections/_SurveySection";

const SERVER_API_URL = process.env.NEXT_PUBLIC_SERVER_API_URL; //Cors has to be enabled on the server

export const MyServerApi = {
  storeFormDataToDB: (form: FormInfo | undefined) => {
    if (form && Object.keys(form).length !== 0) {
      return new Promise((resolve, reject) => {
        fetch(`${SERVER_API_URL}/client-survey`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        })
          .then((res) => {
            if (!res.ok) {
              // If response status is not 200, reject with an error
              reject(new Error(`Request failed with status ${res.status}`));
            }
            resolve(res);
          })
          .catch((err) => {
            console.log(err);
            reject(err);
          });
      });
    }
  },
  getData: (url: string, body?: any) => {
    return new Promise<any>(async (resolve, reject) => {
      try {
        const options: any = {
          method: "GET",
        };
        if (body && Object.keys(body).length > 0)
          options.body = JSON.stringify(body);
        //console.log(url, options);
        const res = await fetch(`${SERVER_API_URL}/${url}`, options);
        if (res.ok) {
          const result = await res.json();
          return resolve(result as any);
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
