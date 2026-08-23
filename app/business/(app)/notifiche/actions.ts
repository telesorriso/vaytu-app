'use server';

import { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '@/lib/notifications/data';

export async function handleMarkAsRead(notificationId: string) {
  return markNotificationAsRead(notificationId);
}

export async function handleMarkAllAsRead() {
  return markAllNotificationsAsRead();
}

export async function handleDelete(notificationId: string) {
  return deleteNotification(notificationId);
}
