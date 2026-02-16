import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    throw new Error('Test error from /api/test-error endpoint');
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { message: 'Test error captured by Sentry' },
      { status: 500 }
    );
  }
}
