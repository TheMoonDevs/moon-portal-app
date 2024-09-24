import crypto from "crypto";

export interface SendEmailParams {
  sender: string;
  recipient: string;
  displayName?: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
}

class AWSSesSdk {
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;

  constructor(accessKeyId: string, secretAccessKey: string, region: string) {
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.region = region;
  }

  private getSignatureKey(
    key: string,
    dateStamp: string,
    regionName: string,
    serviceName: string
  ): Buffer {
    const kDate = crypto
      .createHmac("sha256", `AWS4${key}`)
      .update(dateStamp)
      .digest();
    const kRegion = crypto
      .createHmac("sha256", kDate)
      .update(regionName)
      .digest();
    const kService = crypto
      .createHmac("sha256", kRegion)
      .update(serviceName)
      .digest();
    const kSigning = crypto
      .createHmac("sha256", kService)
      .update("aws4_request")
      .digest();
    return kSigning;
  }

  private getCanonicalRequest(
    method: string,
    uri: string,
    queryString: string,
    headers: string,
    signedHeaders: string,
    payloadHash: string
  ): string {
    return `${method}\n${uri}\n${queryString}\n${headers}\n${signedHeaders}\n${payloadHash}`;
  }

  private getStringToSign(
    algorithm: string,
    requestDate: string,
    credentialScope: string,
    canonicalRequest: string
  ): string {
    return `${algorithm}\n${requestDate}\n${credentialScope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;
  }

  private getFormattedDate(date: Date): { amzDate: string; dateStamp: string } {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const seconds = String(date.getUTCSeconds()).padStart(2, "0");
    const amzDate = `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    const dateStamp = amzDate.slice(0, 8);
    return { amzDate, dateStamp };
  }

  private flattenParams(
    params: any,
    prefix: string = ""
  ): { [key: string]: string } {
    const flatParams: { [key: string]: string } = {};
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        const value = params[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === "object" && !Array.isArray(value)) {
          Object.assign(flatParams, this.flattenParams(value, newKey));
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            Object.assign(
              flatParams,
              this.flattenParams(item, `${newKey}.${index + 1}`)
            );
          });
        } else {
          flatParams[newKey] = String(value);
        }
      }
    }
    return flatParams;
  }

  async sendEmail({
    sender,
    recipient,
    displayName,
    subject,
    bodyText,
    bodyHtml,
  }: SendEmailParams) {
    let params = {
      Action: "SendEmail",
      Version: "2010-12-01",
      Source: sender,
      "Destination.ToAddresses.member.1": recipient,
      "Message.Body.Html.Charset": "UTF-8",
      "Message.Body.Html.Data": bodyHtml || "",
      "Message.Body.Text.Charset": "UTF-8",
      "Message.Body.Text.Data": bodyText || "",
      "Message.Subject.Charset": "UTF-8",
      "Message.Subject.Data": subject,
    };

    if (displayName) {
      params["Source"] = `\"${displayName}\" <${sender}>`;
    } else {
      params["Source"] = sender;
    }

    const method = "POST";
    const serviceName = "ses";
    const host = `email.${this.region}.amazonaws.com`;
    const endpoint = `https://${host}/`;
    const { amzDate, dateStamp } = this.getFormattedDate(new Date());
    const payload = new URLSearchParams(params).toString();
    const payloadHash = crypto
      .createHash("sha256")
      .update(payload)
      .digest("hex");

    const canonicalUri = "/";
    const canonicalQuerystring = "";
    const canonicalHeaders = `content-type:application/x-www-form-urlencoded\nhost:${host}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "content-type;host;x-amz-date";
    const canonicalRequest = this.getCanonicalRequest(
      method,
      canonicalUri,
      canonicalQuerystring,
      canonicalHeaders,
      signedHeaders,
      payloadHash
    );
    // console.log("Canonical Request:", canonicalRequest);

    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${this.region}/${serviceName}/aws4_request`;
    const stringToSign = this.getStringToSign(
      algorithm,
      amzDate,
      credentialScope,
      canonicalRequest
    );
    // console.log("String to Sign:", stringToSign);

    const signingKey = this.getSignatureKey(
      this.secretAccessKey,
      dateStamp,
      this.region,
      serviceName
    );
    const signature = crypto
      .createHmac("sha256", signingKey)
      .update(stringToSign)
      .digest("hex");
    const authorizationHeader = `${algorithm} Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    // console.log("Authorization Header:", authorizationHeader);

    const options: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Amz-Date": amzDate,
        Authorization: authorizationHeader,
        Accept: "application/json",
      },
      body: payload,
    };

    // console.log("Request Options:", options);
    const response = await fetch(endpoint, options);
    const responseData = await response.text();
    // console.log(
    //   "Response:",
    //   response.status,
    //   response.statusText,
    //   responseData
    // );

    if (!response.ok) {
      // console.log(response);
      throw new Error(
        `Error: ${response.status} ${response.statusText} ${responseData}`
      );
    }

    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
    } catch (error) {
      console.log(error);
      throw new Error(`Error parsing response data to JSON: ${error}`);
    }

    // console.log(parsedData);
    return parsedData;
  }
}

export default AWSSesSdk;
