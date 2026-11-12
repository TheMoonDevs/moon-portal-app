import * as Calendar from 'expo-calendar';
import { createEventInCalendarAsync } from 'expo-calendar/legacy';
import { Alert, Platform } from 'react-native';

/**
 * Adds an event with the phone's own "New event" sheet, so the person picks
 * the calendar and can change anything before saving.
 */
export async function addToCalendar(event: {
  title: string;
  start: string;
  end: string;
  notes?: string | null;
  url?: string | null;
}) {
  try {
    if (Platform.OS === 'ios') {
      const { granted } = await Calendar.requestCalendarPermissions(true);
      if (!granted) {
        Alert.alert('Calendar access is off', 'Allow Portal to add events in Settings › Portal.');
        return;
      }
    }
    await createEventInCalendarAsync({
      title: event.title,
      startDate: new Date(event.start),
      endDate: new Date(event.end),
      notes: [event.notes, event.url].filter(Boolean).join('\n\n') || undefined,
      ...(event.url && Platform.OS === 'ios' && { url: event.url }),
    });
  } catch {
    Alert.alert('Couldn’t open the calendar', 'Please try again.');
  }
}
