const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'cooperative.team8503@gmail.com',
    pass: 'smoj mmng xobp gpuf'
  }
});

const getHtmlTemplate = (title, userName, contentHtml) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f3f4f6;
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: none;
            -ms-text-size-adjust: none;
          }
          .email-wrapper {
            width: 100%;
            background-color: #f3f4f6;
            padding: 20px 0;
          }
          .email-container {
            max-width: 580px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            border: 1px solid #e5e7eb;
          }
          .email-header {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            padding: 30px 24px;
            text-align: center;
          }
          .email-header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 26px;
            font-weight: 800;
            letter-spacing: 0.5px;
          }
          .email-body {
            padding: 32px 24px;
            color: #374151;
            line-height: 1.6;
          }
          .email-body h2 {
            font-size: 20px;
            color: #111827;
            margin-top: 0;
            margin-bottom: 16px;
          }
          .email-body p {
            margin-top: 0;
            margin-bottom: 16px;
            font-size: 15px;
          }
          .otp-code {
            display: inline-block;
            font-size: 32px;
            font-weight: 800;
            color: #047857;
            letter-spacing: 6px;
            padding: 12px 24px;
            background-color: #ecfdf5;
            border: 2px dashed #a7f3d0;
            border-radius: 12px;
            margin: 16px 0;
            text-align: center;
          }
          .btn-action {
            display: inline-block;
            background-color: #059669;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 28px;
            font-weight: 600;
            border-radius: 10px;
            margin: 16px 0;
            text-align: center;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
          }
          .info-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 14px;
          }
          .info-table td.label {
            font-weight: 600;
            color: #4b5563;
            width: 35%;
          }
          .info-table td.value {
            color: #1f2937;
          }
          .email-footer {
            background-color: #f9fafb;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #f3f4f6;
            color: #6b7280;
            font-size: 12px;
          }
          .email-footer p {
            margin: 4px 0;
          }
          .email-footer a {
            color: #059669;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-container">
            <div class="email-header">
              <h1>EcoSync</h1>
            </div>
            <div class="email-body">
              <h2>Hello ${userName || 'User'},</h2>
              ${contentHtml}
            </div>
            <div class="email-footer">
              <p>Together we can reduce electronic waste and build a sustainable future.</p>
              <p>© ${new Date().getFullYear()} EcoSync. All rights reserved.</p>
              <p>Need support? Contact us at <a href="mailto:support@ecosync.com">support@ecosync.com</a></p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

// Helper function to send email via nodemailer
const sendMailHelper = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: '"EcoSync" <cooperative.team8503@gmail.com>',
      to,
      subject,
      html
    });
    console.log(`[EMAIL SUCCESS] Sent "${subject}" successfully to ${to}`);
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send "${subject}" to ${to}:`, error.message);
  }
};

/**
 * Sends a Registration OTP
 */
const sendOtp = async (email, otp, userName = 'User') => {
  const subject = 'EcoSync - Verify Your Email Address';
  const html = getHtmlTemplate(
    subject,
    userName,
    `<p>Thank you for signing up with EcoSync! To complete your registration, please verify your email address by entering the following 6-digit OTP code:</p>
     <div style="text-align: center;"><div class="otp-code">${otp}</div></div>
     <p>Please note that this code is valid for <strong>5 minutes</strong>. If you did not request this registration, you can safely ignore this email.</p>`
  );
  await sendMailHelper(email, subject, html);
};

/**
 * Sends Password Reset OTP
 */
const sendPasswordResetOtp = async (email, otp, userName = 'User') => {
  const subject = 'EcoSync - Password Reset OTP';
  const html = getHtmlTemplate(
    subject,
    userName,
    `<p>We received a request to reset your EcoSync password. Please enter the following 6-digit OTP code to authorize the password reset:</p>
     <div style="text-align: center;"><div class="otp-code">${otp}</div></div>
     <p>This code will expire in <strong>5 minutes</strong>. If you did not make this request, please ignore this email.</p>`
  );
  await sendMailHelper(email, subject, html);
};

/**
 * Sends a Welcome/Verification Success email
 */
const sendWelcomeEmail = async (email, userName = 'User') => {
  const subject = 'EcoSync - Welcome & Verification Success';
  const html = getHtmlTemplate(
    subject,
    userName,
    `<p>Your email address has been successfully verified! Welcome to the EcoSync family.</p>
     <p>Your account is now fully active. You can log in to schedule pickup requests, track your collections, and help recycle electronics responsibly.</p>
     <div style="text-align: center;"><a href="https://ewaste-frontend-4jyx.onrender.com/login" class="btn-action">Log In to Your Account</a></div>`
  );
  await sendMailHelper(email, subject, html);
};

/**
 * Sends a Request Submitted confirmation
 */
const sendPickupSubmitted = async (email, deviceType, quantity, address, userName = 'User') => {
  const subject = 'EcoSync - E-Waste Pickup Request Submitted';
  const html = getHtmlTemplate(
    subject,
    userName,
    `<p>We have successfully received your electronic waste pickup request. Here are the submission details:</p>
     <table class="info-table">
       <tr>
         <td class="label">Device Type:</td>
         <td class="value">${deviceType}</td>
       </tr>
       <tr>
         <td class="label">Quantity:</td>
         <td class="value">${quantity}</td>
       </tr>
       <tr>
         <td class="label">Pickup Address:</td>
         <td class="value">${address}</td>
       </tr>
       <tr>
         <td class="label">Status:</td>
         <td class="value" style="color: #d97706; font-weight: bold;">PENDING REVIEW</td>
       </tr>
     </table>
     <p>Our team is currently reviewing your submission. You will receive an email confirmation once the pickup is scheduled.</p>`
  );
  await sendMailHelper(email, subject, html);
};

/**
 * Sends Pickup Scheduled notification
 */
const sendPickupScheduled = async (email, deviceType, date, time, adminNotes, userName = 'User') => {
  const subject = 'EcoSync - E-Waste Pickup Scheduled';
  const html = getHtmlTemplate(
    subject,
    userName,
    `<p>Great news! Your electronic waste pickup request has been reviewed, approved, and scheduled for collection.</p>
     <table class="info-table">
       <tr>
         <td class="label">Device Type:</td>
         <td class="value">${deviceType}</td>
       </tr>
       <tr>
         <td class="label">Scheduled Date:</td>
         <td class="value" style="font-weight: bold; color: #047857;">${date}</td>
       </tr>
       <tr>
         <td class="label">Scheduled Time:</td>
         <td class="value" style="font-weight: bold; color: #047857;">${time}</td>
       </tr>
       ${adminNotes ? `<tr><td class="label">Admin Notes:</td><td class="value">${adminNotes}</td></tr>` : ''}
       <tr>
         <td class="label">Status:</td>
         <td class="value" style="color: #059669; font-weight: bold;">SCHEDULED</td>
       </tr>
     </table>
     <p>Please keep the devices packed and ready by the scheduled slot. Thank you for your contribution to a greener environment!</p>`
  );
  await sendMailHelper(email, subject, html);
};

/**
 * Sends Better Images Required notification
 */
const sendBetterImagesRequired = async (email, deviceType, userName = 'User') => {
  const subject = 'EcoSync - Action Required: Upload Better Images';
  const html = getHtmlTemplate(
    subject,
    userName,
    `<p>Our collection team inspected the details of your e-waste request for: <strong>${deviceType}</strong>.</p>
     <p>To safely approve and plan the logistics, we need clearer images of the electronic item. Please log in to your dashboard and update the images for this pickup request.</p>
     <div style="text-align: center;"><a href="https://ewaste-frontend-4jyx.onrender.com/user/my-requests" class="btn-action">Update Request Details</a></div>`
  );
  await sendMailHelper(email, subject, html);
};

/**
 * Sends status updates (Completed, Rejected, etc.)
 */
const sendTrackingStatusUpdate = async (email, deviceType, requestId, status, adminNotes = '', userName = 'User') => {
  let subject = `EcoSync - Pickup Request Update (#${requestId})`;
  let content = '';

  if (status === 'REJECTED') {
    subject = 'EcoSync - Pickup Request Rejected';
    content = `<p>We regret to inform you that your e-waste pickup request has been rejected after review.</p>
               <table class="info-table">
                 <tr>
                   <td class="label">Device:</td>
                   <td class="value">${deviceType}</td>
                 </tr>
                 <tr>
                   <td class="label">Status:</td>
                   <td class="value" style="color: #dc2626; font-weight: bold;">REJECTED</td>
                 </tr>
                 ${adminNotes ? `<tr><td class="label">Reason/Notes:</td><td class="value">${adminNotes}</td></tr>` : ''}
               </table>
               <p>If you believe this was an error, please submit a new request with correct details via your dashboard.</p>`;
  } else if (status === 'COMPLETED' || status === 'COLLECTED') {
    subject = 'EcoSync - E-Waste Pickup Completed';
    content = `<p>Success! Your electronic waste collection has been successfully completed by our team.</p>
               <table class="info-table">
                 <tr>
                   <td class="label">Device:</td>
                   <td class="value">${deviceType}</td>
                 </tr>
                 <tr>
                   <td class="label">Status:</td>
                   <td class="value" style="color: #059669; font-weight: bold;">COMPLETED / RECYCLED</td>
                 </tr>
               </table>
               <p>The collected devices have been securely routed to our recycling facilities. Your recycling effort has successfully prevented hazardous chemicals from reaching landfills. Thank you!</p>`;
  } else {
    content = `<p>Your pickup request status has been updated to: <strong>${status}</strong>.</p>
               <p>Log in to your dashboard to track details or contact support for queries.</p>`;
  }

  const html = getHtmlTemplate(subject, userName, content);
  await sendMailHelper(email, subject, html);
};

module.exports = {
  sendOtp,
  sendWelcomeEmail,
  sendPasswordResetOtp,
  sendPickupSubmitted,
  sendPickupScheduled,
  sendBetterImagesRequired,
  sendTrackingStatusUpdate
};
