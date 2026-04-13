import {
  EndpointAuthType,
  EndpointRequestType,
  EndpointHandler,
  reportError,
  reportInfo
} from 'node-server-engine';
import { Response } from 'express';
import transporter from '../../config/mailer';

export const emailTestHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  _req: EndpointRequestType[EndpointAuthType.NONE],
  res: Response
) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Sending to yourself for testing
      subject: 'NEA Backend - Test Email',
      text: 'This is a test email from your NEA Backend project. If you are reading this, your SMTP configuration is working perfectly!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4A90E2;">NEA Backend Email Test</h2>
          <p>This is a test email to verify that your <b>Nodemailer</b> configuration is working correctly.</p>
          <p><b>Status:</b> Success ✅</p>
          <p><b>Sender:</b> ${process.env.EMAIL_USER}</p>
          <p><b>SMTP Host:</b> ${process.env.EMAIL_HOST}</p>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #777;">Sent via NEA Backend Engine</p>
        </div>
      `
    };

    reportInfo(`Attempting to send test email to ${process.env.EMAIL_USER}`);

    const info = await transporter.sendMail(mailOptions);

    reportInfo(`Test email sent successfully: ${info.messageId}`);

    res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      messageId: info.messageId,
      accepted: info.accepted
    });
  } catch (error) {
    reportError('Failed to send test email');
    reportError(error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error instanceof Error ? error.message : error
    });
  }
};
