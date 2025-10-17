import nodemailer from 'nodemailer';

// 이메일 전송을 위한 transporter 설정
const createTransporter = () => {
  // 환경 변수에서 이메일 설정 가져오기
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const emailPort = parseInt(process.env.EMAIL_PORT || '587');

  if (!emailUser || !emailPassword) {
    console.warn('이메일 설정이 없습니다. .env 파일에 EMAIL_USER와 EMAIL_PASSWORD를 설정해주세요.');
    return null;
  }

  return nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailPort === 465, // true for 465, false for other ports
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });
};

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const transporter = createTransporter();

  if (!transporter) {
    console.error('이메일 transporter가 설정되지 않았습니다.');
    return { success: false, error: '이메일 설정이 완료되지 않았습니다.' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Colla 프로젝트 관리" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log('이메일 전송 성공:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('이메일 전송 실패:', error);
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류' };
  }
}

// 마감일 알림 이메일 템플릿
export function createDeadlineEmailTemplate(params: {
  userName: string;
  taskTitle: string;
  taskDescription?: string;
  dueDate: Date;
  projectName: string;
  daysRemaining: number;
  taskUrl: string;
}) {
  const { userName, taskTitle, taskDescription, dueDate, projectName, daysRemaining, taskUrl } = params;

  const urgencyColor = daysRemaining <= 1 ? '#ef4444' : daysRemaining <= 3 ? '#f59e0b' : '#3b82f6';
  const urgencyBg = daysRemaining <= 1 ? '#fee2e2' : daysRemaining <= 3 ? '#fef3c7' : '#dbeafe';
  const urgencyText = daysRemaining === 0 ? '오늘' : daysRemaining === 1 ? '내일' : `${daysRemaining}일 후`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>작업 마감일 알림</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">

                <!-- 헤더 -->
                <tr>
                  <td style="padding: 32px 32px 24px 32px; background-color: #ffffff; border-bottom: 1px solid #e5e7eb;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <div style="display: inline-flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; background-color: #000000; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;">
                              <span style="color: #ffffff; font-size: 20px; font-weight: 700; line-height: 1;">C</span>
                            </div>
                            <div>
                              <h1 style="margin: 0; color: #111827; font-size: 20px; font-weight: 600; letter-spacing: -0.01em;">Colla</h1>
                              <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">프로젝트 관리 시스템</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- 본문 -->
                <tr>
                  <td style="padding: 32px;">
                    <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 24px; font-weight: 600; letter-spacing: -0.02em;">
                      작업 마감일 알림
                    </h2>
                    <p style="margin: 0 0 24px 0; font-size: 15px; color: #6b7280; line-height: 1.5;">
                      안녕하세요, <strong style="color: #111827;">${userName}</strong>님
                    </p>

                    <!-- 작업 카드 -->
                    <div style="background-color: ${urgencyBg}; border: 1px solid ${urgencyColor}; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
                      <!-- 프로젝트 이름 -->
                      <div style="margin: 0 0 12px 0;">
                        <span style="display: inline-block; background-color: #f3f4f6; color: #374151; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500;">
                          ${projectName}
                        </span>
                      </div>

                      <!-- 작업 제목 -->
                      <h3 style="margin: 0 0 8px 0; color: #111827; font-size: 18px; font-weight: 600; line-height: 1.4;">
                        ${taskTitle}
                      </h3>

                      <!-- 작업 설명 -->
                      ${taskDescription ? `<p style="margin: 0 0 16px 0; font-size: 14px; color: #4b5563; line-height: 1.6;">${taskDescription}</p>` : ''}

                      <!-- 마감일 정보 -->
                      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span style="display: inline-block; background-color: ${urgencyColor}; color: #ffffff; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; letter-spacing: -0.01em;">
                          마감 ${urgencyText}
                        </span>
                        <span style="color: #6b7280; font-size: 14px; font-weight: 500;">
                          ${dueDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} ${dueDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                      작업 마감일이 임박했습니다. 원활한 프로젝트 진행을 위해 기한 내 완료를 부탁드립니다.
                    </p>

                    <!-- 버튼 -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 0;">
                          <a href="${taskUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; letter-spacing: -0.01em;">
                            칸반보드에서 확인하기 →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- 푸터 -->
                <tr>
                  <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 0 0 12px 0;">
                          <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                            이 이메일은 Colla에서 자동으로 발송되었습니다.<br>
                            작업 마감일 알림을 받지 않으려면 설정에서 알림을 변경할 수 있습니다.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0 0 0; border-top: 1px solid #e5e7eb;">
                          <p style="margin: 0; font-size: 11px; color: #d1d5db; text-align: center;">
                            © ${new Date().getFullYear()} Colla. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
