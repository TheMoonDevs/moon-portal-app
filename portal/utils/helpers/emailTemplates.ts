export const POST_EMAIL_API = 'https://ihf5stm3646ia7f575qxjrhujm0klmkp.lambda-url.ap-southeast-2.on.aws/send-email';

export const ADMIN_EMAIL = 'admin@themoondevs.com';

export const passcodeEmailTemplate = (userName: string, passcode: string) => {
  return `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; padding: 20px; background-color: #f0f0f0;">
        <div style="max-width: 600px; margin: auto; background-color: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">Hey ${userName},</h2>
            <p>Welcome to The Moon Devs! Here is your login passcode:</p>
            <p><strong>Passcode:</strong> ${passcode}</p>
            <p>Use this to log in to <a href="https://portal.themoondevs.com" style="color: #000; text-decoration: none; font-weight: bold;">portal.themoondevs.com</a>.</p>
            <p>If you have any questions, reach out to <a href="mailto:contact@themoondevs.com" style="color: #000; text-decoration: none; font-weight: bold;">contact@themoondevs.com</a>.</p>
            <p>Best,</p>
            <p><strong>Team TheMoonDevs</strong></p>
        </div>
    </div>`;
};

export const passphraseEmailTemplate = (
  userName: string,
  passphrase: string,
) => {
  return `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; padding: 20px; background-color: #f0f0f0;">
        <div style="max-width: 600px; margin: auto; background-color: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">Hey ${userName},</h2>
            <p>Your private logs authentication passphrase has been generated:</p>
            <p><strong>Passphrase:</strong> ${passphrase}</p>
            <p>Keep it safe, as resetting it will delete your old private logs for security.</p>
            <p>If you have any questions, reach out to <a href="mailto:contact@themoondevs.com" style="color: #000; text-decoration: none; font-weight: bold;">contact@themoondevs.com</a>.</p>
            <p>Stay secure!</p>
            <p><strong>Team TheMoonDevs</strong></p>
        </div>
    </div>`;
};
