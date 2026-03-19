import { withErrorHandler } from './error-handler.js';

describe('withErrorHandler', () => {
  it('returns result unchanged on success', async () => {
    const fn = async () => ({ data: 42 });
    const wrapped = withErrorHandler(fn);
    const result = await wrapped();
    expect(result).toEqual({ data: 42 });
  });

  it('forwards arguments to the original function', async () => {
    const fn = async (a: number, b: string) => `${b}-${a}`;
    const wrapped = withErrorHandler(fn);
    const result = await wrapped(3, 'hello');
    expect(result).toBe('hello-3');
  });

  it('catches Error and returns error response', async () => {
    const fn = async () => {
      throw new Error('something went wrong');
    };
    const wrapped = withErrorHandler(fn);
    const result = await wrapped();
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Error: something went wrong' }],
      isError: true,
    });
  });

  it('catches non-Error throwable (string)', async () => {
    const fn = async () => {
      throw 'plain string error';
    };
    const wrapped = withErrorHandler(fn);
    const result = await wrapped();
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Error: plain string error' }],
      isError: true,
    });
  });

  it('catches non-Error throwable (number)', async () => {
    const fn = async () => {
      throw 404;
    };
    const wrapped = withErrorHandler(fn);
    const result = await wrapped();
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Error: 404' }],
      isError: true,
    });
  });
});
