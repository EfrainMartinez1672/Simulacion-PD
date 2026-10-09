import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
  const configService = {
    get: jest.fn(() => 'first-key,second-key'),
  } as unknown as ConfigService;
  const guard = new ApiKeyGuard(configService);

  const contextFor = (apiKey?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          originalUrl: '/solicitudes',
          headers: apiKey ? { 'x-api-key': apiKey } : {},
        }),
      }),
    }) as never;

  it.each(['first-key', 'second-key'])('accepts configured key %s', (key) => {
    expect(guard.canActivate(contextFor(key))).toBe(true);
  });

  it('rejects requests without a key', () => {
    expect(() => guard.canActivate(contextFor())).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects keys that are not configured', () => {
    expect(() => guard.canActivate(contextFor('wrong-key'))).toThrow(
      UnauthorizedException,
    );
  });
});
