type MajorDimension = "ROWS" | "COLUMNS";
type ValueRenderOption = "FORMATTED_VALUE" | "UNFORMATTED_VALUE" | "FORMULA";

interface GetSheetDataOptions {
  spreadsheetId: string;
  range: string;
  sheetName?: string;
  targetId?: string;
  majorDimension?: MajorDimension;
  valueRenderOption?: ValueRenderOption;
}

interface UpdateSheetDataOptions extends GetSheetDataOptions {
  values: (string | number)[][];
}

interface AppendSheetDataOptions {
  spreadsheetId: string;
  values: (string | number)[][];
  sheetName?: string;
  targetId?: string;
  range?: string;
  majorDimension?: MajorDimension;
}

interface Config {
  clientEmail: string;
  privateKey: string;
}

interface DeleteRowOrColumnOptions {
  spreadsheetId: string;
  sheetName?: string;
  targetId?: string;
  majorDimension: MajorDimension;
  indexes: (number | { startIndex: number; endIndex: number })[];
}

class GoogleSheetsAPI {
  private baseUrl: string;
  private clientEmail: string;
  private privateKey: string;

  constructor(config?: Config) {
    this.baseUrl = "https://sheets.googleapis.com/v4/spreadsheets";
    this.clientEmail =
      config?.clientEmail || (process.env.GIAM_CLIENT_EMAIL as string);
    this.privateKey = Buffer.from(
      config?.privateKey || (process.env.GIAM_PRIVATE_KEY as string),
      "base64"
    ).toString("ascii");
  }

  private async getAccessToken(): Promise<string> {
    const url = "https://oauth2.googleapis.com/token";
    const jwt = await this.createJWT();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error fetching access token: ${response.statusText}`);
    }

    const data: any = await response.json();
    return data.access_token;
  }

  private async createJWT(): Promise<string> {
    const header = {
      alg: "RS256",
      typ: "JWT",
    };

    const now = Math.floor(Date.now() / 1000);
    const claimSet = {
      iss: this.clientEmail,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header))
      .toString("base64")
      .replace(/=/g, "");
    const encodedClaimSet = Buffer.from(JSON.stringify(claimSet))
      .toString("base64")
      .replace(/=/g, "");

    const signatureInput = `${encodedHeader}.${encodedClaimSet}`;
    const signature = await this.sign(signatureInput, this.privateKey);

    return `${signatureInput}.${signature}`;
  }

  private async sign(input: string, privateKeyPem: string): Promise<string> {
    // Convert PEM format to binary DER format
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = privateKeyPem
      .replace(pemHeader, "")
      .replace(pemFooter, "")
      .replace(/\s/g, "");
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
    // Import private key
    const key = await crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      true,
      ["sign"]
    );
  
    // Create data buffer
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
  
    // Generate signature
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      data
    );
  
    // Convert to base64 without padding
    const base64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    return base64.replace(/=/g, "");
  }

  private async getSheetName(
    spreadsheetId: string,
    targetId: string
  ): Promise<string> {
    try {
      const accessToken = await this.getAccessToken();
      const url = `${this.baseUrl}/${spreadsheetId}?fields=sheets(properties(sheetId,title))`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching sheet names: ${response.statusText}`);
      }

      const data = await response.json();
      const sheet = data.sheets.find(
        (s: any) => s.properties.sheetId == targetId
      );

      if (!sheet) {
        throw new Error(`Sheet with ID ${targetId} not found`);
      }

      return sheet.properties.title;
    } catch (error) {
      console.log(error);
      throw new Error(`Error geetung sheetname: ${error}`);
    }
  }

  async getSheetData(options: GetSheetDataOptions): Promise<any> {
    try {
      const {
        spreadsheetId,
        range,
        sheetName,
        targetId,
        majorDimension = "ROWS",
        valueRenderOption = "FORMATTED_VALUE",
      } = options;

      let finalSheetName = sheetName;
      if (!sheetName && targetId) {
        finalSheetName = await this.getSheetName(spreadsheetId, targetId);
      }

      if (!finalSheetName) {
        throw new Error("Either sheetName or targetId must be provided");
      }

      const accessToken = await this.getAccessToken();
      const url = `${this.baseUrl}/${spreadsheetId}/values/${finalSheetName}!${range}?majorDimension=${majorDimension}&valueRenderOption=${valueRenderOption}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.log(error);
      throw new Error(`Error get sheet data: ${error}`);
    }
  }

  async updateSheetData(options: UpdateSheetDataOptions): Promise<any> {
    try {
      if (!options) {
        throw new Error("updateSheetData: Options object is required");
      }

      const {
        spreadsheetId,
        range,
        values,
        sheetName,
        targetId,
        majorDimension = "ROWS",
      } = options;

      let finalSheetName = sheetName;
      if (!sheetName && targetId) {
        finalSheetName = await this.getSheetName(spreadsheetId, targetId);
      }

      if (!finalSheetName) {
        throw new Error("Either sheetName or targetId must be provided");
      }

      const accessToken = await this.getAccessToken();
      const encodedSheetName = encodeURIComponent(finalSheetName);
      const encodedRange = encodeURIComponent(range);
      const url = `${this.baseUrl}/${spreadsheetId}/values/${encodedSheetName}!${encodedRange}?valueInputOption=USER_ENTERED`;

      const body = {
        range: `${finalSheetName}!${range}`,
        majorDimension: majorDimension,
        values: values,
      };

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Error updating data: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.log(error);
      throw new Error(`Error updating sheet data: ${error}`);
    }
  }

  async appendSheetData(options: AppendSheetDataOptions): Promise<any> {
    try {
      const {
        spreadsheetId,
        values,
        sheetName,
        targetId,
        range = "A:Z",
        majorDimension = "ROWS",
      } = options;

      let finalSheetName = sheetName;
      if (!sheetName && targetId) {
        finalSheetName = await this.getSheetName(spreadsheetId, targetId);
      }

      console.log(finalSheetName);

      if (!finalSheetName) {
        throw new Error("Either sheetName or targetId must be provided");
      }

      const accessToken = await this.getAccessToken();
      const encodedSheetName = encodeURIComponent(finalSheetName);
      const encodedRange = encodeURIComponent(range);
      const url = `${this.baseUrl}/${spreadsheetId}/values/${encodedSheetName}!${encodedRange}:append?valueInputOption=USER_ENTERED`;

      const body = {
        range: `${finalSheetName}!${range}`,
        majorDimension: majorDimension,
        values: values,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        console.log(data);
        throw new Error(`Error appending data: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.log(error);
      throw new Error(`Error appending data: ${error}`);
    }
  }
  async deleteRowOrColumn(options: DeleteRowOrColumnOptions): Promise<any> {
    try {
      const { spreadsheetId, sheetName, targetId, majorDimension, indexes } =
        options;

      let finalSheetName = sheetName;
      let sheetId = targetId;
      if (!sheetName && targetId) {
        finalSheetName = await this.getSheetName(spreadsheetId, targetId);
      } else if (!targetId && sheetName) {
        const accessToken = await this.getAccessToken();
        const url = `${this.baseUrl}/${spreadsheetId}?fields=sheets(properties(sheetId,title))`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Error fetching sheet names: ${response.statusText}`);
        }

        const data = await response.json();
        const sheet = data.sheets.find(
          (s: any) => s.properties.title == sheetName
        );

        if (!sheet) {
          throw new Error(`Sheet with name ${sheetName} not found`);
        }

        sheetId = sheet.properties.sheetId;
      }

      if (!finalSheetName && !sheetId) {
        throw new Error("Either sheetName or targetId must be provided");
      }

      const accessToken = await this.getAccessToken();
      const url = `${this.baseUrl}/${spreadsheetId}:batchUpdate`;

      // Sort and merge indexes
      const sortedIndexes = indexes
        .map((index) =>
          typeof index === "number"
            ? { startIndex: index, endIndex: index + 1 }
            : index
        )
        .sort((a, b) => b.startIndex - a.startIndex);

      const mergedIndexes: { startIndex: number; endIndex: number }[] =
        sortedIndexes.reduce<{ startIndex: number; endIndex: number }[]>(
          (acc, curr) => {
            if (acc.length === 0) {
              acc.push(curr);
            } else {
              const last = acc[acc.length - 1];
              if (last.startIndex <= curr.endIndex) {
                last.startIndex = Math.min(last.startIndex, curr.startIndex);
              } else {
                acc.push(curr);
              }
            }
            return acc;
          },
          []
        );

      const requests = mergedIndexes.map((index) => ({
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: majorDimension,
            startIndex: index.startIndex,
            endIndex: index.endIndex,
          },
        },
      }));

      const requestBody = {
        requests: requests,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Error deleting row/column: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.log(error);
      throw new Error(`Error deleting row/column: ${error}`);
    }
  }
}

export default GoogleSheetsAPI;