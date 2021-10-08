/**
 * A service for sending emails to clients
 */
import { logger } from '@shared';
import nodemailer from 'nodemailer';

export class EmailService {
    private transport: nodemailer.Transporter;

    constructor(private to: string, private subject: string, private body: string, private html?: string) {
        this.transport = nodemailer.createTransport({
            //@ts-ignore
            host: process.env.SMTP_HOST,
            port: process.env.SMPT_PORT,
            auth: {
                user: process.env.SMTP_USERNAME,
                pass: process.env.SMTP_PASSWORD
            },
            from: process.env.EMAIL_FROM,
        })

        /* istanbul ignore next */
        if (process.env.NODE_ENV !== 'development') {
            this.transport
                .verify()
                .then(() => logger.info('Connected to email server'))
                .catch(() => logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env'));
        }
    }


    public async send() {
        const subject = this.subject;
        const text = this.body;
        const to = this.to;

        const msg = {to, subject, text } as nodemailer.SendMailOptions;

        if (!!this.html) {
            msg['html'] = this.html;
            delete msg.text
        }

        await this.transport.sendMail(msg);
    };

}