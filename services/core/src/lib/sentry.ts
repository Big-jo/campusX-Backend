import * as sentry from '@sentry/node';

if (process.env.NODE_ENV === 'production') {
    sentry.init({dsn: process.env.DSN, environment: process.env.NODE_ENV});
}

export default sentry;
