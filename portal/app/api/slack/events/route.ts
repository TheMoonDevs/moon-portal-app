import { SlackBotSdk, SlackChannelWebhooks } from "@/utils/services/slackBotSdk";
import { NextRequest, NextResponse } from "next/server";

const meetingTitle = 'The Moon Developers - Meet'

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const params = new URLSearchParams(payload);
  const jsonPayload = Object.fromEntries(params);
  console.log(jsonPayload);

  const text = jsonPayload.text;

  const mentionPattern = /@(\w+)/g;
  let mentionMatch;
  let mentions = [];

  while ((mentionMatch = mentionPattern.exec(text)) !== null) {
    mentions.push(`@${mentionMatch[1]}`);
  }

  let reminderMessage = '';
  if (mentions.length > 0) {
    const formattedMentions = mentions.length > 1 ? mentions.slice(0, -1).join(', ') + ', ' + mentions.slice(-1) : mentions[0];
    reminderMessage = `Do not forget to add ${formattedMentions} as guests.`;
  }

  const timePattern = /(\d{1,2}):?(\d{2})?(am|pm)/i;
  const timeMatch = text.match(timePattern);
  let time = '';
  let minutes = '00';

  if (timeMatch) {
    const period = timeMatch[3];
    let hours = parseInt(timeMatch[1]);
    minutes = timeMatch[2] || '00'; 

    if (period.toLowerCase() === 'pm' && hours !== 12) {
      hours += 12;
    } else if (period.toLowerCase() === 'am' && hours === 12) {
      hours = 0;
    }

    const hoursStr = hours.toString().padStart(2, '0');
    time = `T${hoursStr}${minutes}00UTC`;
  }
  const datePattern = /(today|tomorrow|[a-z]+day)/i;
  const dateMatch = text.match(datePattern);
  const date = dateMatch ? dateMatch[0] : null;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0].replace(/-/g, '');

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0].replace(/-/g, '');

  let chosenDate;
  if (date === 'today') {
    chosenDate = todayStr;
  } else if (date === 'tomorrow') {
    chosenDate = tomorrowStr;
  }

  let endTime;
  let reminderTime;
  if (time !== '') {
    const startHour = parseInt(time.slice(1, 3));
    const startMinutes = parseInt(time.slice(3, 5));

    let endHour = startHour + 1;
    let endMinutes = startMinutes;

    if (endHour >= 24) {
      endHour -= 24;
      endMinutes = 0;
    }

    const endHourStr = endHour.toString().padStart(2, '0');
    const endMinutesStr = endMinutes.toString().padStart(2, '0');

    endTime = `T${endHourStr}${endMinutesStr}00UTC`;
  }


  if (time !== '') {
    const startHour = parseInt(time.slice(1, 3));
    const startMinutes = parseInt(time.slice(3, 5));
    const reminderMinutes = startMinutes - 30 < 0 ? startMinutes + 30 : startMinutes - 30;
    const reminderHour = startMinutes - 30 < 0 ? ((startHour - 1 + 24) % 24) : startHour;
    const reminderHourStr = reminderHour.toString().padStart(2, '0');
    const reminderMinutesStr = reminderMinutes.toString().padStart(2, '0');
    reminderTime = `T${reminderHourStr}${reminderMinutesStr}00UTC`;
  }

  const encodedMeetingTitle = encodeURIComponent(meetingTitle);

  const googleCalendarLink = `https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodedMeetingTitle}&dates=${chosenDate}${time}/${chosenDate}${endTime}`;

  const slackBotSdk = new SlackBotSdk();
  await slackBotSdk.setSlackReminder(
    `${chosenDate}${reminderTime}`,
    `Reminder: ${meetingTitle} is starting soon.`,
    // SlackChannelWebhooks.b_general
    'https://hooks.slack.com/commands/T01J1LR0YDN/7310114626864/hIbcXxJPCLcoRJKCCpcHGFfG'
  );


  return Response.json(`Great! I have scheduled a reminder on slack, You can create a google event via this link - ${googleCalendarLink}. ${reminderMessage}`);
}
