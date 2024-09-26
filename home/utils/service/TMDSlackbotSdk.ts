import {
  SlackBotSdk,
  ClientInfo,
  SlackMessageType,
  SLACK_BOT_OAUTH_TOKEN,
} from "./slackBotSdk";

export enum SlackChannels {
  test_tmd_bot = "C0746EDG30V",
  d_growth = "C065RQTKNEB",
}

class TMDSlackbotSdk extends SlackBotSdk {
  constructor(_token?: string) {
    super(_token);
  }

  sendSlackMessageOnNewClient = async (
    client: ClientInfo,
    channelId: SlackChannels
  ) => {
    // const channelId = SlackChannels.test_tmd_bot;
    const message: SlackMessageType = {
      text: `You have a new client:\n*${client.name} | ${client.email}*`,
      channel: channelId,
      // user_id: shreyas?.id,
      blocks: [
        this.buildPlainMarkdownSection(
          `You have a new client: *${client.name} | ${client.companyName}*`
        ),
        this.buildFieldsSection(
          this.buildFieldsMarkdown([
            `*Email:* ${client.email}`,
            `*Phone Number:* ${client.phone}`,
            `*Team Size:* ${client.teamSize}`,
            `*Preferred Date:* ${client.preferredDate}`,
            `*Industry:* ${client.industry}`,
            `*Requirement:* ${client.requirementType}`,
          ])
        ),
      ],
    };

    await this.sendSlackMessageviaAPI(message);
  };
}

export const TMDSlackbot = new TMDSlackbotSdk(SLACK_BOT_OAUTH_TOKEN);
