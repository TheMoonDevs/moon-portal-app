import { SlackButtonAction, SlackInteractionPayload } from "@/utils/services/slackBotSdk";
import { confirmPayment } from "@/utils/slack/webhooks/confirm-payment";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const parsedBody = new URLSearchParams(body);
    const payload: SlackInteractionPayload = parsedBody.get('payload')
      ? JSON.parse(parsedBody.get('payload') as string)
      : null;
    const actions = payload?.actions;

    if (payload && actions?.length > 0) {
      await Promise.all(actions.map(async (action: SlackButtonAction) => {
        if (action.block_id === 'confirm-payment') {
          await confirmPayment(action, payload?.message?.ts);
        }
      }));
      return NextResponse.json({ message: 'Actions processed successfully.' });
    } else {
      console.log('No actions found');
      return NextResponse.json({ message: 'No actions found' }, { status: 200 });
    }
  } catch (error: any) {
    return new NextResponse(JSON.stringify(error), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}