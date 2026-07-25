import type { ArgumentsHost} from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';

const makeHost = () => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: '/api/v1/x', method: 'POST', headers: {} }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
};

const dbError = (code: string) =>
  new QueryFailedError('INSERT ...', [], { code } as unknown as Error);

describe('GlobalExceptionFilter — DB xato mapping', () => {
  const filter = new GlobalExceptionFilter();

  it('unique_violation (23505) -> 409', () => {
    const { host, status, json } = makeHost();
    filter.catch(dbError('23505'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json.mock.calls[0][0].error.code).toBe('RESOURCE_CONFLICT');
  });

  it('foreign_key_violation (23503) -> 409', () => {
    const { host, status, json } = makeHost();
    filter.catch(dbError('23503'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json.mock.calls[0][0].error.code).toBe('RELATED_RESOURCE_CONFLICT');
  });

  it('value too long (22001) -> 400', () => {
    const { host, status, json } = makeHost();
    filter.catch(dbError('22001'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json.mock.calls[0][0].error.code).toBe('VALIDATION_FAILED');
  });

  it('unknown DB error stays 500', () => {
    const { host, status } = makeHost();
    filter.catch(dbError('99999'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('HttpException o‘z statusini saqlaydi', () => {
    const { host, status } = makeHost();
    filter.catch(new HttpException('not found', HttpStatus.NOT_FOUND), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });
});
