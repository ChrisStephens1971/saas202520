/**
 * POST /api/notifications/sms/webhook
 * Twilio webhook for handling SMS replies (STOP, START, HELP)
 * Sprint 4 - NOTIFY-008 (TCPA Compliance)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleSMSOptOut, handleSMSOptIn } from '@/lib/notification-service';

/**
 * Handle incoming SMS from Twilio
 * https://www.twilio.com/docs/sms/twiml
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get('From') as string; // Phone number
    const body = (formData.get('Body') as string)?.toUpperCase().trim();

    if (!from || !body) {
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Find player by phone number
    const player = await prisma.player.findFirst({
      where: { phone: from },
    });

    if (!player) {
      console.warn(`No player found with phone number: ${from}`);
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Handle STOP command (opt-out)
    if (
      body === 'STOP' ||
      body === 'STOPALL' ||
      body === 'UNSUBSCRIBE' ||
      body === 'CANCEL' ||
      body === 'END' ||
      body === 'QUIT'
    ) {
      await handleSMSOptOut(player.id);

      // Send confirmation response
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>You have been unsubscribed from SMS notifications. Reply START to re-subscribe.</Message>
</Response>`,
        {
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    // Handle START command (opt-in)
    if (body === 'START' || body === 'YES' || body === 'UNSTOP') {
      await handleSMSOptIn(player.id);

      // Send confirmation response
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>You have been subscribed to SMS notifications. Reply STOP to unsubscribe.</Message>
</Response>`,
        {
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    // Handle HELP command
    if (body === 'HELP' || body === 'INFO') {
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Tournament Platform notifications. Reply STOP to unsubscribe or START to subscribe. For support, contact your tournament organizer.</Message>
</Response>`,
        {
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    // Unrecognized command - no response
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Error handling SMS webhook:', error);
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
