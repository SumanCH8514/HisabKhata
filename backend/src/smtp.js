import { connect } from 'cloudflare:sockets';

export async function sendSmtpEmail({
    host,
    port = 465,
    secure = true,
    user,
    pass,
    fromName = 'HisabKhata PRO',
    fromEmail,
    toEmail,
    subject,
    html,
    text
}) {
    if (!host || !user || !pass) {
        throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASS must be provided in Cloudflare Worker environment.');
    }

    const sender = fromEmail || user;
    const socketPort = parseInt(port, 10) || 465;
    const useDirectTls = socketPort === 465 || secure === true || secure === 'true';

    const socket = connect(
        { hostname: host, port: socketPort },
        useDirectTls ? { secureTransport: 'on' } : {}
    );

    const reader = socket.readable.getReader();
    const writer = socket.writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let buffer = '';

    async function readResponse() {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\r\n');
            if (lines.length > 1) {
                const lastCompleteLine = lines[lines.length - 2];
                if (/^\d{3}\s/.test(lastCompleteLine)) {
                    const fullResp = buffer;
                    buffer = lines[lines.length - 1];
                    return fullResp;
                }
            }
        }
        return buffer;
    }

    async function sendCommand(cmd, expectedCode) {
        await writer.write(encoder.encode(cmd + '\r\n'));
        const resp = await readResponse();
        const code = parseInt(resp.substring(0, 3), 10);

        if (expectedCode && !resp.startsWith(String(expectedCode))) {
            throw new Error(`SMTP command "${cmd.split(' ')[0]}" failed: ${resp.trim()}`);
        }
        return { code, response: resp };
    }

    try {
        const greeting = await readResponse();
        if (!greeting.startsWith('220')) {
            throw new Error(`SMTP connection rejected greeting: ${greeting.trim()}`);
        }

        await sendCommand(`EHLO hisabkhata.sumanonline.com`, 250);

        await sendCommand('AUTH LOGIN', 334);
        await sendCommand(btoa(user), 334);
        await sendCommand(btoa(pass), 235);

        await sendCommand(`MAIL FROM:<${sender}>`, 250);
        await sendCommand(`RCPT TO:<${toEmail}>`, 250);

        await sendCommand('DATA', 354);

        const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        const emailHeaders = [
            `From: "${fromName}" <${sender}>`,
            `To: <${toEmail}>`,
            `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
            `Date: ${new Date().toUTCString()}`,
            `Message-ID: <${Date.now()}.${Math.random().toString(36).substring(2)}@hisabkhata.sumanonline.com>`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            `X-Mailer: HisabKhata Mail Delivery Engine`
        ].join('\r\n');

        const emailBody = [
            `--${boundary}`,
            `Content-Type: text/plain; charset=UTF-8`,
            `Content-Transfer-Encoding: 8bit`,
            ``,
            text || 'HisabKhata Statement Notification',
            ``,
            `--${boundary}`,
            `Content-Type: text/html; charset=UTF-8`,
            `Content-Transfer-Encoding: 8bit`,
            ``,
            html,
            ``,
            `--${boundary}--`
        ].join('\r\n');

        const fullMimeMessage = `${emailHeaders}\r\n\r\n${emailBody}\r\n.`;

        await writer.write(encoder.encode(fullMimeMessage + '\r\n'));
        const dataResponse = await readResponse();
        if (!dataResponse.startsWith('250')) {
            throw new Error(`SMTP DATA rejected: ${dataResponse.trim()}`);
        }

        try {
            await sendCommand('QUIT', 221);
        } catch {
        }

        return {
            success: true,
            message: 'Email delivered successfully via Project SMTP',
            response: dataResponse.trim()
        };
    } finally {
        try {
            reader.releaseLock();
            writer.releaseLock();
            socket.close();
        } catch {
        }
    }
}
