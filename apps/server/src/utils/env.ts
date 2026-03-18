// these values are injected at build time
const OPENCORD_ENV = process.env.OPENCORD_ENV;
const OPENCORD_BUILD_VERSION = process.env.OPENCORD_BUILD_VERSION;
const OPENCORD_BUILD_DATE = process.env.OPENCORD_BUILD_DATE;
const OPENCORD_MEDIASOUP_BIN_NAME = process.env.OPENCORD_MEDIASOUP_BIN_NAME;

const SERVER_VERSION =
  typeof OPENCORD_BUILD_VERSION !== 'undefined'
    ? OPENCORD_BUILD_VERSION
    : '0.0.0-dev';

const BUILD_DATE =
  typeof OPENCORD_BUILD_DATE !== 'undefined' ? OPENCORD_BUILD_DATE : 'dev';

const env = typeof OPENCORD_ENV !== 'undefined' ? OPENCORD_ENV : 'development';
const IS_PRODUCTION = env === 'production';
const IS_DEVELOPMENT = !IS_PRODUCTION;
const IS_TEST = process.env.NODE_ENV === 'test';
const IS_DOCKER = process.env.RUNNING_IN_DOCKER === 'true';

if (IS_PRODUCTION) {
  if (!OPENCORD_MEDIASOUP_BIN_NAME) {
    throw new Error('OPENCORD_MEDIASOUP_BIN is not defined');
  }
}

export {
  BUILD_DATE,
  IS_DEVELOPMENT,
  IS_DOCKER,
  IS_PRODUCTION,
  IS_TEST,
  SERVER_VERSION,
  OPENCORD_MEDIASOUP_BIN_NAME
};

