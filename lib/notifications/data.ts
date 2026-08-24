import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth/dal';
import { withTimeout } from '@/lib/actions/timeout';
import type { NotificationRow } from '@/lib/db/types';
import { toUserMessage } from '@/lib/actions/errors';

/**
 * Gets all notifications for the authenticated user.
 */
export async function getNotifications(
  limit?: number,
  offset?: number
): Promise<NotificationRow[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();

  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }

    const { data } = await withTimeout(query, 10_000);

    return (data as NotificationRow[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * Gets unread notification count for the authenticated user.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const user = await getAuthUser();
  if (!user) return 0;

  const supabase = await createClient();

  try {
    const { count } = await withTimeout(
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false),
      10_000
    );

    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success?: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: 'Non autenticato' };

  const supabase = await createClient();

  try {
    const { error } = await withTimeout(
      supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('user_id', user.id),
      10_000
    );

    if (error) return { error: toUserMessage(error) };
    return { success: true };
  } catch (err) {
    return { error: toUserMessage(err) };
  }
}

/**
 * Marks all notifications as read.
 */
export async function markAllNotificationsAsRead(): Promise<{
  success?: boolean;
  error?: string;
}> {
  const user = await getAuthUser();
  if (!user) return { error: 'Non autenticato' };

  const supabase = await createClient();

  try {
    const { error } = await withTimeout(
      supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('is_read', false),
      10_000
    );

    if (error) return { error: toUserMessage(error) };
    return { success: true };
  } catch (err) {
    return { error: toUserMessage(err) };
  }
}

/**
 * Deletes a notification.
 */
export async function deleteNotification(notificationId: string): Promise<{
  success?: boolean;
  error?: string;
}> {
  const user = await getAuthUser();
  if (!user) return { error: 'Non autenticato' };

  const supabase = await createClient();

  try {
    const { error } = await withTimeout(
      supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id),
      10_000
    );

    if (error) return { error: toUserMessage(error) };
    return { success: true };
  } catch (err) {
    return { error: toUserMessage(err) };
  }
}
