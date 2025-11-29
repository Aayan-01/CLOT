import { createThumbnailUrl } from '../src/utils/uploadUtil';

describe('createThumbnailUrl', () => {
  const mockReq = {
    protocol: 'http',
    get: (name: string) => {
      if (name === 'host') return 'localhost:4000';
      return '';
    },
  } as any;

  test('handles unix-style paths', () => {
    const path1 = '/some/dir/uploads/thumb_file.jpg';
    const url = createThumbnailUrl(mockReq, path1);
    expect(url).toBe('http://localhost:4000/uploads/thumb_file.jpg');
  });

  test('handles windows-style paths with backslashes', () => {
    const path2 = 'C:\\projects\\repo\\server\\uploads\\thumb_file.jpg';
    const url = createThumbnailUrl(mockReq, path2);
    expect(url).toBe('http://localhost:4000/uploads/thumb_file.jpg');
  });
});
