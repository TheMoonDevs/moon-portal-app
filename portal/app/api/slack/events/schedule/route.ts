import { SlackBotSdk, SlackChannels } from "@/utils/services/slackBotSdk";
import { NextRequest, NextResponse } from "next/server";
import { format, addMinutes, addHours, parse, isBefore } from "date-fns";
import { enIN } from "date-fns/locale";

const slackBotSdk = new SlackBotSdk();

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const params = new URLSearchParams(payload);
    const jsonPayload = Object.fromEntries(params);
    const text = jsonPayload.text;

    // Extract mentions
    const mentionPattern = /@\w+/g;
    const mentions = text.match(mentionPattern) || [];

    // Resolve mentions to Slack user IDs and emails
    const usersList = await slackBotSdk.getSlackUsers(); // Fetch all Slack users

    const usersPromise = mentions.map(async (mention) => {
      const username = mention.substring(1); // remove @ from username
      const user = usersList?.find((u: any) => u.name.startsWith(username)); // Find user by username starting with mention
      if (!user) {
        throw new Error(`User @${username} not found in Slack`);
      }
      return { id: user.id, email: user.profile.email };
    });
    const resolvedUsers = await Promise.all(usersPromise);

    // Extract title if provided
    let meetingTitle = "Untitled";
    const titlePattern = /title:(.+)/i;
    const titleMatch = text.match(titlePattern);
    if (titleMatch) {
      meetingTitle = titleMatch[1].trim();
    }

    // Remove mentions and title from the text for date and time extraction
    let cleanText = text.replace(mentionPattern, "").replace(titlePattern, "");

    // Extract and parse time
    const timePattern = /(\d{1,2}):?(\d{2})?\s?(am|pm)?/i;
    const timeMatch = cleanText.match(timePattern);
    if (!timeMatch) {
      throw new Error("Invalid or missing time format");
    }

    let hours = parseInt(timeMatch[1]);
    let minutes = parseInt(timeMatch[2]) || 0;
    const period = timeMatch[3];

    if (period) {
      if (period.toLowerCase() === "pm" && hours !== 12) {
        hours += 12;
      } else if (period.toLowerCase() === "am" && hours === 12) {
        hours = 0;
      }
    }

    // Get current date in IST
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const nowIST = new Date(now.getTime() + istOffset);

    // Calculate chosen date based on current date in IST
    let chosenDate = new Date(nowIST);
    chosenDate.setHours(hours, minutes, 0, 0);

    // Remove time-related text from cleanText before extracting date
    cleanText = cleanText.replace(timeMatch[0], "");

    // Extract and parse date
    const datePattern =
      /(today|tomorrow|\d{1,2}(?:th|st|nd|rd)?\s*\w*(?:\s*\d{4})?)/i;
    const dateMatch = cleanText.match(datePattern);
    if (dateMatch) {
      const dateStr = dateMatch[0].toLowerCase();
      if (dateStr === "tomorrow") {
        chosenDate.setDate(chosenDate.getDate() + 1);
      } else if (dateStr !== "today") {
        const parsedDate = parse(dateStr, "d MMMM yyyy", new Date(), {
          locale: enIN,
        });
        if (!isNaN(parsedDate.getTime())) {
          chosenDate = parsedDate;
          chosenDate.setHours(hours, minutes, 0, 0);
        } else {
          const parsedDateWithoutYear = parse(dateStr, "d MMMM", new Date(), {
            locale: enIN,
          });
          if (!isNaN(parsedDateWithoutYear.getTime())) {
            chosenDate = parsedDateWithoutYear;
            chosenDate.setFullYear(nowIST.getFullYear());
            chosenDate.setHours(hours, minutes, 0, 0);
          } else {
            throw new Error("Invalid date format");
          }
        }
      }
    }

    // Convert chosenDate to IST
    const chosenDateIST = new Date(chosenDate.getTime());

    // Check if the chosen date and time are in the past
    if (isBefore(chosenDate, nowIST)) {
      throw new Error("The date and time cannot be in the past");
    }

    // Calculate reminder time (30 minutes before start)
    const reminderTime = addMinutes(chosenDateIST, -30);

    // Construct the reminder message
    let reminderMessage = `Reminder: ${titleMatch ? meetingTitle : "A"
      } meeting is starting in 30 minutes.`;
    if (resolvedUsers.length > 0) {
      const formattedMentions = resolvedUsers
        .map((user) => `<@${user.id}>`)
        .join(", ");
      reminderMessage += ` Participants: ${formattedMentions}.`;
    }
    reminderMessage += " Please join on time!";

    const encodedMeetingTitle = encodeURIComponent(meetingTitle);
    const googleCalendarLink = `https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodedMeetingTitle}&dates=${format(
      chosenDateIST.getTime() - istOffset,
      "yyyyMMdd'T'HHmmss'Z'"
    )}/${format(
      addHours(chosenDateIST.getTime() - istOffset, 1),
      "yyyyMMdd'T'HHmmss'Z'"
    )}`;

    // Send Slack reminder using global time
    await slackBotSdk.setSlackReminder({
      time: format(reminderTime, "yyyyMMdd'T'HHmmss'Z'"),
      message: reminderMessage,
      channel: SlackChannels.y_moon_reminders
    });

    // Construct response message based on resolved users
    let responseMessage =
      resolvedUsers.length > 0
        ? `Don't forget to add ${resolvedUsers
          .map((user) => user.email)
          .join(", ")}.`
        : "Please make sure to add Guests.";

    // Response to user
    return NextResponse.json({
      response_type: "in_channel",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Great! I have scheduled a reminder on Slack.`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `The meeting${titleMatch ? ` "${meetingTitle}"` : ""
              } is scheduled for ${format(
                chosenDateIST,
                "do MMMM yyyy"
              )} at ${format(chosenDateIST, "HH:mm")} IST.`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `You can create a Google event via this link - <${googleCalendarLink}|Click here>.`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${responseMessage}`,
          },
        },
      ],
    });
  } catch (error: any) {
    console.error("Error processing the request:", error);
    return NextResponse.json({
      response_type: "ephemeral",
      text: `Sorry, there was an error processing your request: ${error.message}. Please make sure your command is formatted correctly.`,
    });
  }
}
