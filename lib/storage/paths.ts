// =============================================================================
// VAYTU — Storage path conventions
// =============================================================================
// Every object lives at `{ownerId}/...` so the Storage RLS policies in
// /supabase/migrations/008_onboarding_storage_buckets.sql (which check
// `(storage.foldername(name))[1] = auth.uid()::text`) can enforce
// ownership. Two buckets:
//   - public-assets: avatars, business logos/covers (public read)
//   - verification-evidence: proof screenshots + verification docs (private,
//     owner + admin only)
// =============================================================================
import type { EvidenceKind } from '@/lib/db/types';

export const PUBLIC_ASSETS_BUCKET = 'public-assets';
export const VERIFICATION_EVIDENCE_BUCKET = 'verification-evidence';

function extFromFile(file: File): string {
  const fromName = file.name.split('.').pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  const fromType = file.type.split('/').pop();
  return fromType || 'bin';
}

export function avatarPath(userId: string, file: File): string {
  return `${userId}/avatar.${extFromFile(file)}`;
}

export function businessLogoPath(userId: string, file: File): string {
  return `${userId}/logo.${extFromFile(file)}`;
}

export function businessCoverPath(userId: string, file: File): string {
  return `${userId}/cover.${extFromFile(file)}`;
}

export function evidencePath(
  creatorId: string,
  kind: EvidenceKind,
  file: File
): string {
  return `${creatorId}/metrics/${kind}.${extFromFile(file)}`;
}

/** Parses the evidence `kind` back out of a storage_path saved via evidencePath(). */
export function evidenceKindFromPath(path: string): string | null {
  const match = path.match(/\/metrics\/([a-z]+)\./);
  return match ? match[1] : null;
}
