import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import * as nodemailer from 'nodemailer'

@Injectable()
export class EmailService implements OnModuleInit {
  private transporter: nodemailer.Transporter | null = null
  private readonly logger = new Logger(EmailService.name)

  onModuleInit() {
    const host = process.env.SMTP_HOST
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    if (!host || !user || !pass) {
      this.logger.warn('SMTP not configured — email OTP will be logged to console only')
      return
    }

    const port = parseInt(process.env.SMTP_PORT || '587')
    const secure = process.env.SMTP_SECURE === 'true' || port === 465

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    })

    this.transporter.verify().then(() => {
      this.logger.log(`SMTP ready — ${user} via ${host}:${port}`)
    }).catch((e) => {
      this.logger.error('SMTP verify failed — email OTP will fall back to console', e.message)
      this.transporter = null
    })
  }

  async sendOtp(to: string, otp: string): Promise<boolean> {
    if (!this.transporter) return false

    const from = process.env.SMTP_FROM || process.env.SMTP_USER

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Wick Office — Email Verification Code',
        text: `Your verification code is: ${otp}\n\nThis code expires in 5 minutes. Do not share it.`,
        html: `
          <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
            <h2 style="margin:0 0 8px">🏢 Wick Office</h2>
            <p style="color:#666;margin:0 0 24px">Email Verification</p>
            <div style="background:#f4f4f5;border-radius:8px;padding:24px;text-align:center">
              <p style="margin:0 0 8px;color:#666;font-size:13px">Your verification code</p>
              <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:0;color:#18181b">${otp}</p>
            </div>
            <p style="color:#999;font-size:12px;margin:16px 0 0">Expires in 5 minutes. Do not share this code.</p>
          </div>
        `,
      })
      return true
    } catch (e: any) {
      this.logger.error(`Failed to send email OTP to ${to}`, e.message)
      return false
    }
  }

  isConfigured(): boolean {
    return !!this.transporter
  }
}
