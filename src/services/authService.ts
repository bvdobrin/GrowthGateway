import { PERSONAS, PERSONAS_BY_ID } from '@/mocks/users';
import type { Session, User } from '@/types';
import { ServiceError } from './errors';
import { effectiveGroups } from './iamService';
import { delay } from './latency';

export const IDP_NAME = 'Atlas Meridian SSO (Entra ID, mocked)';
const SESSION_HOURS = 8;

const base64Url = (value: object) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(value))))
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

/** A JWT-shaped token. The signature is a placeholder; nothing here is secret. */
const fakeJwt = (user: User, issuedAt: Date, expiresAt: Date) =>
  [
    base64Url({ alg: 'none', typ: 'JWT' }),
    base64Url({
      iss: 'https://login.atlasmeridian.example/mock',
      aud: 'growthgateway',
      sub: user.id,
      email: user.email,
      name: user.name,
      groups: effectiveGroups(user),
      clearance: user.clearance,
      ext: !!user.external,
      iat: Math.floor(issuedAt.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    }),
    'mock-signature',
  ].join('.');

export const listPersonas = (): User[] => PERSONAS;

/** Simulates the OIDC redirect, consent and token exchange for a chosen persona. */
export async function signIn(personaId: string): Promise<Session> {
  await delay(500, 400);
  const user = PERSONAS_BY_ID[personaId];
  if (!user) throw new ServiceError('unauthenticated', 'Unknown identity');
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + SESSION_HOURS * 3_600_000);
  const token = fakeJwt(user, issuedAt, expiresAt);
  return {
    user,
    idp: IDP_NAME,
    idToken: token,
    accessToken: token,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export async function signOut(): Promise<void> {
  await delay(80, 80);
}

export const isSessionValid = (session: Session | null | undefined, now = new Date()) =>
  !!session && new Date(session.expiresAt).getTime() > now.getTime();
