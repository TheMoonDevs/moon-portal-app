import { User } from "@prisma/client";
import { TMD_PAYZONE_API_KEY } from "../constants/appInfo";

export enum SERVER_API_ENDPOINTS {
  updateUser = `/api/user?id=`,
  payment = `/api/payment`,
  updatePayment = `/api/payment`,
  getUsers = `/api/users`,
  getPayments = `/api/payment`,
  referralsSignup = `/api/referrals/signup`,
  updateExchangeConfigData = `/api/exchange`,
}
export const PORTAL_SERVER_API_URL = process.env.NEXT_PUBLIC_PORTAL_API_URL;

export const MyServerApi = {
  postData: (url: string, data: any) => {
    return new Promise((resolve, reject) => {
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          tmd_payzone_api_key: TMD_PAYZONE_API_KEY,
        },
        body: JSON.stringify(data),
      })
        .then((res) => {
          if (!res.ok) {
            reject(new Error(`Request failed with status ${res.status}`));
          }
          return res.json();
        })
        .then((data) => {
          resolve(data);
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  },

  getUserData: (email: string) => {
    return new Promise((resolve, reject) => {
      fetch(`/api/user?email=${email}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
        .then((res) => {
          // console.log(res);
          if (!res.ok) {
            // If response status is not 200, reject with an error
            reject(new Error(`Request failed with status ${res.status}`));
          }

          return res.json(); // Parse the response as JSON
        })
        .then((data) => {
          resolve(data); // Resolve the promise with the response data
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  },

  updateData: (url: string, updatedData: any) => {
    return new Promise((resolve, reject) => {
      fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          tmd_payzone_api_key: TMD_PAYZONE_API_KEY,
        },
        body: JSON.stringify(updatedData),
      })
        .then((res) => {
          if (!res.ok) {
            // If response status is not 200, reject with an error
            reject(new Error(`Request failed with status ${res.status}`));
          }

          return res.json(); // Parse the response as JSON
        })
        .then((data: User) => {
          resolve(data); // Resolve the promise with the response data
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  },

  deleteData: (url: string, body: any) => {
    return new Promise((resolve, reject) => {
      fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          tmd_payzone_api_key: TMD_PAYZONE_API_KEY,
        },
        body: JSON.stringify(body),
      })
        .then((res) => {
          if (!res.ok) {
            // If response status is not 200, reject with an error
            reject(new Error(`Request failed with status ${res.status}`));
          }

          return res.json(); // Parse the response as JSON
        })
        .then((data) => {
          resolve(data); // Resolve the promise with the response data
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  },

  getAll: (url: string) => {
    return new Promise<any>((resolve, reject) => {
      fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((res) => {
          if (!res.ok) {
            // If response status is not 200, reject with an error
            reject(new Error(`Request failed with status ${res.status}`));
          }

          return res.json(); // Parse the response as JSON
        })
        .then((data) => {
          resolve(data); // Resolve the promise with the response data
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  },

  updateTransaction: (updatedData: any) => {
    return new Promise((resolve, reject) => {
      fetch(`/api/payment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          tmd_payzone_api_key: TMD_PAYZONE_API_KEY,
        },
        body: JSON.stringify(updatedData),
      })
        .then((res) => {
          if (!res.ok) {
            // If response status is not 200, reject with an error
            reject(new Error(`Request failed with status ${res.status}`));
          }

          return res.json(); // Parse the response as JSON
        })
        .then((data) => {
          resolve(data); // Resolve the promise with the updated transaction data
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  },

  getReferralsByUserId: (id?: string) => {
    return new Promise((resolve, reject) => {
      fetch(`/api/referrals?userId=${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
        .then((res) => {
          if (!res.ok) {
            reject(new Error(`Request failed with status ${res.status}`));
          }

          return res.json();
        })
        .then((data) => {
          resolve(data);
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  },

  getAllReferrals: () => {
    return new Promise((resolve, reject) => {
      fetch(`/api/referrals`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
        .then((res) => {
          if (!res.ok) {
            reject(new Error(`Request failed with status ${res.status}`));
          }
          return res.json();
        })
        .then((data) => {
          resolve(data);
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  },
  updateReferral: (updatedData: any) => {
    return new Promise((resolve, reject) => {
      fetch(`/api/referrals`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          tmd_payzone_api_key: TMD_PAYZONE_API_KEY,
        },
        body: JSON.stringify(updatedData),
      })
        .then((res) => {
          if (!res.ok) {
            reject(new Error(`Request failed with status ${res.status}`));
          }
          return res.json();
        })
        .then((data) => {
          resolve(data);
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  },

  addManualRecord: (data: any) => {
    return new Promise((resolve, reject) => {
      fetch(`/api/referrals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          tmd_payzone_api_key: TMD_PAYZONE_API_KEY,
        },
        body: JSON.stringify(data),
      })
        .then((res) => {
          if (!res.ok) {
            reject(new Error(`Request failed with status ${res.status}`));
          }
          return res.json();
        })
        .then((data) => {
          resolve(data);
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  },

  updateExchangeConfigData: (data: any) => {
    return new Promise((resolve, reject) => {
      fetch(SERVER_API_ENDPOINTS.updateExchangeConfigData, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          tmd_payzone_api_key: TMD_PAYZONE_API_KEY,
        },
        body: JSON.stringify(data),
      })
        .then((res) => {
          if (!res.ok) {
            reject(new Error(`Request failed with status ${res.status}`));
          }
          return res.json();
        })
        .then((data) => {
          resolve(data);
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  },
};
