import { paymasterClient } from "@/utils/paymaster/config";
import { willSponsor } from "@/utils/paymaster/utils";

export async function POST(r: Request) {
  // console.log("request aai hai");
  const req = await r.json();
  const method = req.method;
  const [userOp, entrypoint, chainId] = req.params;
  const sponsorable = await willSponsor({
    chainId: parseInt(chainId),
    entrypoint,
    userOp,
  });
  console.log({
    chainId,
    entrypoint,
    userOp,
    sponsorable,
  });
  if (!sponsorable) {
    return Response.json({ error: "Not a sponsorable operation" });
  }
  // console.log("Sponsorable", sponsorable);
  if (method === "pm_getPaymasterStubData") {
    const result = await paymasterClient.getPaymasterStubData({
      userOperation: userOp,
    });
    // console.log("proxy Result", result);
    return Response.json({ result });
  } else if (method === "pm_getPaymasterData") {
    const result = await paymasterClient.getPaymasterData({
      userOperation: userOp,
    });
    return Response.json({ result });
  }
  return Response.json({ error: "Method not found" });
}
