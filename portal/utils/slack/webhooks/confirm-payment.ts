import { SlackBotSdk, SlackButtonAction, SlackChannels } from "@/utils/services/slackBotSdk";

const SLACK_BOT_OAUTH_TOKEN = process.env.SLACK_OAUTH_TOKEN;

const TMDSlackbot = new SlackBotSdk(SLACK_BOT_OAUTH_TOKEN);

export interface ConfirmPayActionPayload {
  slackId: string;
  userDuration: string;
}

export const confirmPayment = async (action: SlackButtonAction, ts: string) => {
  if (action.action_id === "confirm") {
    const user: ConfirmPayActionPayload = JSON.parse(action.value);

    let message = `Congratulations <@${user?.slackId}>! on completing ${user?.userDuration} with us.`;

    if (!user?.slackId) {
      await TMDSlackbot.sendSlackMessageviaAPI({
        text: `User Not Found`,
        ts: ts,
        channel: SlackChannels.y_pay_reminders,
      });

      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "User not found",
        }),
      };
    }

    await TMDSlackbot.sendSlackMessageviaAPI({
      text: message,
      user_id: user?.slackId,
    });

    const response = await fetch("https://pay.themoondevs.com/api/payment", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slackId: user?.slackId }),
    });

    let transactionMsg: string;
    if (!response.ok) {
      transactionMsg = "Failed to add transaction to database";
    } else {
      transactionMsg = "Transaction Added to database";
    }

    await TMDSlackbot.sendSlackMessageviaAPI({
      text: `Payment confirmed! Msg sent to <@${user?.slackId}>. ${transactionMsg}`,
      ts: ts,
      channel: SlackChannels.y_pay_reminders,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        payment: `Payment confirmed. ${transactionMsg}`,
      }),
    };
  } else if (action.action_id === "deny") {
    await TMDSlackbot.sendSlackMessageviaAPI({
      text: `Payment denied!`,
      ts: ts,
      channel: SlackChannels.y_pay_reminders,
    });
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Payment denied",
      }),
    };
  }
};