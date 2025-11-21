
import { Router } from 'express';
import { getQueue } from '../../lib/Queue';

const router = Router();

router.post('/send', (req, res) => {
  const { userId, notification } = req.body;
  const queue = getQueue('send-fcm');
  queue.add('send-fcm', { userId, notification });
  res.json({ message: 'FCM job added' });
});

export default router;
