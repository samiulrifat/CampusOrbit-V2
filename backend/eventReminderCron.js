const cron = require('node-cron');
const Event = require('./models/Event'); // adjust path if needed
const Notification = require('./models/Notification');
const mongoose = require('mongoose');

// Run every day at 8am
cron.schedule('0 8 * * *', async () => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);
    const events = await Event.find({ date: today });
    for (const event of events) {
      for (const attendeeId of event.attendees) {
        await Notification.create({
          user: attendeeId,
          type: 'event-reminder',
          message: `Reminder: Event "${event.name}" is happening today!`,
          relatedEvent: event._id
        });
      }
    }
    console.log('Event reminders sent for', today.toDateString());
  } catch (err) {
    console.error('Error sending event reminders:', err);
  }
});
