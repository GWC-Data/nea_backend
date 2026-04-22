import {
  EndpointAuthType,
  EndpointRequestType,
  EndpointHandler,
  reportError,
  reportInfo
} from 'node-server-engine';
import { Response } from 'express';
import { User, PasswordReset } from 'db';
import crypto from 'crypto';
import transporter from '../../config/mailer';

export const forgotPasswordHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req: EndpointRequestType[EndpointAuthType.NONE],
  res: Response
) => {
  const { email } = req.body;

  try {
    reportInfo(`Forgot password request for email: ${email}`);
    
    const user = await User.findOne({ where: { email } });

    if (!user) {
      reportInfo(`User NOT found in database for email: ${email}.`);
      res.status(404).json({
        message: 'User not found'
      });
      return;
    }

    reportInfo(`User found: ${user.id}. Generating reset token...`);

    // Generate secure token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token for database storage
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Expiry: 15 minutes from now
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    reportInfo(`Token Expiry calculated as: ${expiresAt.toLocaleString()} (Local) / ${expiresAt.toISOString()} (UTC)`);
    reportInfo(`DEBUG: Raw Reset Token (Use this in Postman): ${resetToken}`);

    // Store in password_resets table
    const resetRecord = await PasswordReset.create({
      userId: user.id,
      token: hashedToken,
      expiresAt: expiresAt
    });

    reportInfo(`Reset token stored in DB with ID: ${resetRecord.id}. expires_at in DB might be converted to UTC.`);

    reportInfo(`Reset token stored in DB. Attempting to send email to ${user.email}...`);

    // Send Email
    const frontendUrl = process.env.FRONTEND_URL || 'http://34.100.224.44';
    const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request - NEA',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your NEA account.</p>
          <p>Please click the link below to set a new password. This link is valid for 15 minutes.</p>
          <div style="margin: 20px 0;">
            <a href="${resetLink}" style="background-color: #4A90E2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          </div>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #777;">Sent via NEA Backend Engine</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    reportInfo(`Reset email sent successfully to ${user.email}. Message ID: ${info.messageId}`);

    res.status(200).json({
      message: 'If an account with that email exists, we have sent a reset link.'
    });

  } catch (error) {
    reportError('Forgot password error');
    reportError(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
