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

const getDownloadCandidatePaths = () => {
  const sourcePath = path.join(WINDOWS_DOWNLOADS_PATH, WINDOWS_DOWNLOAD_FILE);
  const executableSiblingPath = path.join(
    path.dirname(process.execPath),
    'downloads',
    WINDOWS_DOWNLOAD_FILE
  );

  return [sourcePath, executableSiblingPath];
};

const serveFileFromDisk = (
  filePath: string,
  res: http.ServerResponse
): http.ServerResponse => {
  const stat = fs.statSync(filePath);
  const fileStream = fs.createReadStream(filePath);

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
};

const desktopDownloadRouteHandler = async (
  _req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const candidatePaths = getDownloadCandidatePaths();
  const isSourceMode = IS_DEVELOPMENT || IS_TEST;

  for (const candidatePath of candidatePaths) {
    if (fs.existsSync(candidatePath)) {
      return serveFileFromDisk(candidatePath, res);
    }
  }

  const embeddedFile = findEmbeddedDownload(WINDOWS_DOWNLOAD_FILE);

  if (!embeddedFile || isSourceMode) {
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
