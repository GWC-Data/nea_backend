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
import bcrypt from 'bcryptjs';

export const resetPasswordHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req: EndpointRequestType[EndpointAuthType.NONE],
  res: Response
) => {
  const { password } = req.body;
  const { token } = req.params;

  try {
    // Hash the token from URL to match the stored version
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find valid token in DB
    const resetRecord = await PasswordReset.findOne({
      where: {
        token: hashedToken
      },
      include: [{ model: User, as: 'user' }]
    });

    if (!resetRecord) {
      reportInfo('No reset record found for this token.');
      res.status(400).json({ message: 'Invalid or expired reset token' });
      return;
    }

    const now = new Date();
    reportInfo(`Token check - Now: ${now.toISOString()}, ExpiresAt: ${resetRecord.expiresAt.toISOString()}`);

    if (resetRecord.expiresAt < now) {
      reportInfo('Token has expired.');
      res.status(400).json({ message: 'Invalid or expired reset token' });
      return;
    }

    if (!resetRecord.user) {
      reportInfo('Reset record found but user association is missing.');
      res.status(400).json({ message: 'User not found for this token' });
      return;
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password safely
    await User.update(
      { password: hashedPassword },
      { where: { id: resetRecord.userId } }
    );

    // Delete all reset records for this user (invalidate all active tokens)
    await PasswordReset.destroy({
      where: { userId: resetRecord.userId }
    });

    reportInfo(`Password reset successful for User ID: ${resetRecord.userId}`);
    res.status(200).json({ message: 'Password has been reset successfully' });

  } catch (error: any) {
    reportError('Reset password error');
    reportError(error.message || error);
    if (error.stack) reportError(error.stack);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
