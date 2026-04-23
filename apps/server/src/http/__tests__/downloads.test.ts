import { beforeAll, describe, expect, test } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { testsBaseUrl } from '../../__tests__/setup';
import { WINDOWS_DOWNLOADS_PATH } from '../../helpers/paths';

const desktopDownloadPath = path.join(WINDOWS_DOWNLOADS_PATH, 'opencord.exe');

describe('/downloads/opencord.exe', () => {
  beforeAll(() => {
    if (!fs.existsSync(WINDOWS_DOWNLOADS_PATH)) {
      fs.mkdirSync(WINDOWS_DOWNLOADS_PATH, { recursive: true });
    }

    if (!fs.existsSync(desktopDownloadPath)) {
      fs.writeFileSync(desktopDownloadPath, 'test desktop app');
    }
  });

  test('should serve the Windows desktop app as attachment', async () => {
    const response = await fetch(`${testsBaseUrl}/downloads/opencord.exe`);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/octet-stream');
    expect(response.headers.get('Content-Disposition')).toContain(
      'attachment; filename="opencord.exe"'
    );

    const body = await response.text();

    expect(body.length).toBeGreaterThan(0);
  });
});
