import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, DecodedIdToken, getAuth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseService {
  private readonly app: App | null;

  constructor(config: ConfigService) {
    const projectId = config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = config
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');
    this.app =
      projectId && clientEmail && privateKey
        ? (getApps()[0] ??
          initializeApp({
            credential: cert({ projectId, clientEmail, privateKey }),
          }))
        : null;
  }

  get enabled(): boolean {
    return this.app !== null;
  }

  private get auth(): Auth {
    if (!this.app) throw new Error('Firebase authentication is not configured');
    return getAuth(this.app);
  }

  verifyIdToken(token: string): Promise<DecodedIdToken> {
    return this.auth.verifyIdToken(token);
  }
}
