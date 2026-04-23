import { embeddedFiles } from 'bun';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { getErrorMessage } from '../helpers/get-error-message';
import { WINDOWS_DOWNLOADS_PATH } from '../helpers/paths';
import { logger } from '../logger';
import { IS_DEVELOPMENT, IS_TEST } from '../utils/env';

const WINDOWS_DOWNLOAD_FILE = 'opencord.exe';

const findEmbeddedDownload = (fileName: string) => {
  return embeddedFiles.find((file) => (file as File).name.endsWith(fileName));
};

const desktopDownloadRouteHandler = async (
  _req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const sourcePath = path.join(WINDOWS_DOWNLOADS_PATH, WINDOWS_DOWNLOAD_FILE);
  const isSourceMode = IS_DEVELOPMENT || IS_TEST;

  if (isSourceMode) {
    if (!fs.existsSync(sourcePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Desktop app not found' }));
      return res;
    }

    const stat = fs.statSync(sourcePath);
    const fileStream = fs.createReadStream(sourcePath);

    fileStream.on('open', () => {
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size,
        'Content-Disposition': `attachment; filename="${WINDOWS_DOWNLOAD_FILE}"`,
        'Cache-Control': 'public, max-age=3600'
      });
      fileStream.pipe(res);
    });

    fileStream.on('error', (error) => {
      logger.error('Error serving desktop app: %s', getErrorMessage(error));

      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      } else {
        res.destroy();
      }
    });

    res.on('close', () => {
      fileStream.destroy();
    });

    return res;
  }

  const embeddedFile = findEmbeddedDownload(WINDOWS_DOWNLOAD_FILE);

  if (!embeddedFile) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Desktop app not found' }));
    return res;
  }

  try {
    const arrayBuffer = await embeddedFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': buffer.length,
      'Content-Disposition': `attachment; filename="${WINDOWS_DOWNLOAD_FILE}"`,
      'Cache-Control': 'public, max-age=3600'
    });
    res.end(buffer);
  } catch (error) {
    logger.error('Error serving embedded desktop app: %s', getErrorMessage(error));
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }

  return res;
};

export { desktopDownloadRouteHandler };
