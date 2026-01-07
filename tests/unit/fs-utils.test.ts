import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const rmMock = vi.fn();

vi.mock('fs/promises', () => ({
  __esModule: true,
  default: { rm: rmMock },
  rm: rmMock,
}));

let removeIfExists: (filePath: string) => Promise<void>;

beforeAll(async () => {
  ({ removeIfExists } = await import('@/lib/fs-utils'));
});

beforeEach(() => {
  rmMock.mockReset();
});

describe('removeIfExists', () => {
  it('invokes fs.rm with force enabled', async () => {
    rmMock.mockResolvedValueOnce(undefined);

    await removeIfExists('/tmp/example.json');

    expect(rmMock).toHaveBeenCalledTimes(1);
    expect(rmMock).toHaveBeenCalledWith('/tmp/example.json', { force: true });
  });

  it('propagates unexpected rm errors', async () => {
    const failure = new Error('disk failure');
    rmMock.mockRejectedValueOnce(failure);

    await expect(removeIfExists('/tmp/example.json')).rejects.toThrow(failure);
  });
});
