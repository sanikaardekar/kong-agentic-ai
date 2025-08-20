// Simple test to send email without OpenAI
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const emailText = `Dear Hiring Manager,

I am writing to express my interest in the Backend Engineer position at Lever. With 1-2 years of experience in Node.js, JavaScript, MongoDB, Redis, and AWS, I am excited about the opportunity to contribute to your team.

Your job posting particularly caught my attention because of the focus on modern technologies like DerbyJS, real-time applications, and scalable backend systems. My experience aligns well with your tech stack, and I'm passionate about building enterprise-grade software in startup environments.

Key highlights of my background:
• 1-2 years of hands-on experience with Node.js and JavaScript
• Proficiency in MongoDB, Redis, and AWS cloud services
• Experience with API development and modern web frameworks
• Strong interest in real-time applications and scalable architecture

I would welcome the opportunity to discuss how my skills and enthusiasm can contribute to Lever's mission of transforming how companies grow their teams.

Thank you for your consideration.

Best regards,
Software Engineer

Apply here: https://jobs.lever.co/leverdemo/cd1ea494-1629-4cb1-a1c7-5dbcc9dea545`;

async function sendTestEmail() {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: 'sanikaardekar@gmail.com',
      subject: 'Application for Backend Engineer at Lever',
      text: emailText,
    });
    console.log('✅ Email sent successfully!');
  } catch (error) {
    console.error('❌ Email failed:', error.message);
  }
}

sendTestEmail();