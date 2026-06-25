// src/utils/emailService.js
import nodemailer from 'nodemailer';

let transporter = null;

function getSmtpConfig() {
    const host = process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io';
    const port = Number(process.env.SMTP_PORT || 2525);
    return { host, port };
}

function getTransporter() {
    if (transporter) return transporter;

    const { host, port } = getSmtpConfig();

    console.log('[EmailService] Init with:', {
        host,
        port,
        user: process.env.SMTP_USER ? '(set)' : '(missing)',
        env: process.env.NODE_ENV,
    });

    transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        requireTLS: port === 587,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    transporter
        .verify()
        .then(() => {
            console.log('[EmailService] transporter.verify OK, ready to send.');
        })
        .catch((err) => {
            console.error('[EmailService] transporter.verify FAILED:', {
                name: err.name,
                message: err.message,
                code: err.code,
            });
        });

    return transporter;
}

/**
 * Simple helper to send email with optional PDF attachment
 *
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function sendDocumentEmail({
    to,
    cc,
    subject,
    html,
    pdfBuffer,
    fileName,
}) {
    if (!to) {
        const message = 'No recipient email address provided';
        console.warn(`[EmailService] sendDocumentEmail: ${message}`);
        return { success: false, error: message };
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        const message = 'SMTP is not configured (SMTP_USER / SMTP_PASS missing)';
        console.error(`[EmailService] sendDocumentEmail: ${message}`);
        return { success: false, error: message };
    }

    const mailOptions = {
        from: process.env.SMTP_FROM || '"Seecog Softwares" <seecogonline@gmail.com>',
        to,
        cc,
        subject,
        html,
        attachments: [],
    };

    if (pdfBuffer) {
        mailOptions.attachments.push({
            filename: fileName || 'document.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf',
        });
    }

    try {
        const info = await getTransporter().sendMail(mailOptions);
        console.log('[EmailService] sendMail OK:', {
            messageId: info.messageId,
            response: info.response,
        });
        return { success: true };
    } catch (err) {
        const message = err?.message || 'Unknown SMTP error';
        console.error('[EmailService] sendMail ERROR:', {
            name: err.name,
            message: err.message,
            code: err.code,
            command: err.command,
            syscall: err.syscall,
            reason: err.reason,
        });
        return { success: false, error: message };
    }
}
