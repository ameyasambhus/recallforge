import { Request, Response } from 'express';
import cloudinary from '../config/cloudinary.js';
import { cardMediaService } from '../services/cardMedia.service.js';

const SIGNATURE_VALID_FOR_SECONDS = 60 * 60 * 2;

function getRawBody(req: Request): string {
  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }
  if (typeof req.body === 'string') {
    return req.body;
  }
  return JSON.stringify(req.body ?? {});
}

export const handleCloudinaryWebhook = async (req: Request, res: Response) => {
  const signature = req.get('X-Cld-Signature');
  const timestamp = req.get('X-Cld-Timestamp');

  if (!signature || !timestamp) {
    res.status(401).json({ ok: false, error: 'Missing Cloudinary signature headers' });
    return;
  }

  const rawBody = getRawBody(req);
  const isValid = cloudinary.utils.verifyNotificationSignature(
    rawBody,
    Number(timestamp),
    signature,
    SIGNATURE_VALID_FOR_SECONDS
  );

  if (!isValid) {
    res.status(401).json({ ok: false, error: 'Invalid Cloudinary signature' });
    return;
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ ok: false, error: 'Invalid JSON payload' });
    return;
  }

  if (payload.notification_type !== 'moderation') {
    res.json({ ok: true });
    return;
  }

  const publicId = payload.public_id as string | undefined;
  const moderationKind = payload.moderation_kind as string | undefined;
  const moderationStatus = payload.moderation_status as string | undefined;

  if (!publicId || !moderationKind || !moderationStatus) {
    res.status(400).json({ ok: false, error: 'Missing moderation fields' });
    return;
  }

  await cardMediaService.applyModerationResult({
    publicId,
    provider: moderationKind,
    status: moderationStatus,
  });

  res.json({ ok: true });
};
