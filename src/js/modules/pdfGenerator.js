/**
 * PDF 生成模組
 *
 * 負責生成一式四份的調代課單 PDF
 * 四份表單分別給：
 * 1. 原任課教師
 * 2. 代課教師
 * 3. 班級（教室張貼）
 * 4. 教學組（存檔）
 *
 * 使用 html2canvas + jsPDF 實現中文支援
 */

export class PDFGenerator {
    constructor() {
        // PDF 設定
        this.config = {
            pageWidth: 210,  // A4 寬度 (mm)
            pageHeight: 297, // A4 高度 (mm)
            margin: 15
        };

        // 星期對照
        this.weekdays = ['週一', '週二', '週三', '週四', '週五'];
        this.periods = ['第一節', '第二節', '第三節', '第四節', '第五節', '第六節', '第七節'];
    }

    /**
     * 生成調代課單 PDF
     * @param {Object} record - 調課紀錄
     * @param {Array} scheduleData - 課表資料
     * @param {Array} teachers - 教師資料
     */
    async generateSubstituteForm(record, scheduleData, teachers) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        // 準備四份表單的資料
        const recipients = [
            { title: '原任課教師留存', type: 'original' },
            { title: '代課教師留存', type: 'substitute' },
            { title: '班級公告', type: 'class' },
            { title: '教學組存查', type: 'admin' }
        ];

        // 取得課表資料
        const originalTeacherSchedule = this.getTeacherWeekSchedule(scheduleData, record.originalTeacher);
        const substituteTeacherSchedule = this.getTeacherWeekSchedule(scheduleData, record.substituteTeacher);

        // 建立隱藏的 HTML 容器
        const container = document.createElement('div');
        container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 794px;';
        document.body.appendChild(container);

        try {
            // 生成四份表單
            for (let i = 0; i < recipients.length; i++) {
                // 建立 HTML 表單
                const html = this.createFormHTML(
                    record,
                    recipients[i],
                    recipients[i].type === 'substitute' ? substituteTeacherSchedule : originalTeacherSchedule,
                    i
                );
                container.innerHTML = html;

                // 等待渲染
                await new Promise(resolve => setTimeout(resolve, 100));

                // 轉換為圖片
                const canvas = await html2canvas(container, {
                    scale: 2,
                    useCORS: true,
                    logging: false
                });

                // 添加到 PDF
                if (i > 0) {
                    doc.addPage();
                }

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const imgWidth = this.config.pageWidth;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                doc.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, this.config.pageHeight));
            }

            // 下載 PDF
            const fileName = `調代課單_${record.date}_${record.className}_${record.period}.pdf`;
            doc.save(fileName);

        } finally {
            // 清理
            document.body.removeChild(container);
        }
    }

    /**
     * 建立表單 HTML
     */
    createFormHTML(record, recipientInfo, schedule, pageIndex) {
        const scheduleTable = this.createScheduleTableHTML(schedule, record, recipientInfo.type);
        const isClassNotice = recipientInfo.type === 'class';

        return `
        <div style="
            font-family: 'Microsoft JhengHei', 'Noto Sans TC', sans-serif;
            padding: 30px;
            background: white;
            color: #333;
            line-height: 1.6;
        ">
            <!-- 標題 -->
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="font-size: 24px; margin: 0; color: #2563eb;">調代課通知單</h1>
                <p style="font-size: 14px; color: #666; margin: 5px 0 0 0;">【${recipientInfo.title}】</p>
            </div>

            <!-- 基本資訊 -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; width: 15%; font-weight: bold;">日期</td>
                    <td style="padding: 8px; border: 1px solid #ddd; width: 35%;">${record.date}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; width: 15%; font-weight: bold;">班級</td>
                    <td style="padding: 8px; border: 1px solid #ddd; width: 35%;">${record.className}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">星期</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${record.weekday}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">節次</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${record.period}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">科目</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${record.subject}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">領域</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${record.domain || '-'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">原任課教師</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #dc2626;">${record.originalTeacher}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">代課教師</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #16a34a;">${record.substituteTeacher}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">調課事由</td>
                    <td colspan="3" style="padding: 8px; border: 1px solid #ddd;">${record.reason}</td>
                </tr>
            </table>

            ${isClassNotice ? this.createClassNoticeHTML(record) : scheduleTable}

            <!-- 簽章區 -->
            <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px;">
                <div style="text-align: center; width: 25%;">
                    <p style="margin-bottom: 30px;">原任課教師</p>
                    <div style="border-top: 1px solid #333; padding-top: 5px;">簽章</div>
                </div>
                <div style="text-align: center; width: 25%;">
                    <p style="margin-bottom: 30px;">代課教師</p>
                    <div style="border-top: 1px solid #333; padding-top: 5px;">簽章</div>
                </div>
                <div style="text-align: center; width: 25%;">
                    <p style="margin-bottom: 30px;">教學組長</p>
                    <div style="border-top: 1px solid #333; padding-top: 5px;">簽章</div>
                </div>
            </div>

            <!-- 頁尾 -->
            <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #999;">
                列印時間：${new Date().toLocaleString('zh-TW')} | 第 ${pageIndex + 1}/4 頁
            </div>
        </div>
        `;
    }

    /**
     * 建立週課表 HTML
     * @param {Array} schedule - 課表資料
     * @param {Object} record - 調課紀錄
     * @param {string} type - 表單類型：original(原任課教師)、substitute(代課教師)、admin(教學組)
     */
    createScheduleTableHTML(schedule, record, type) {
        // 根據類型決定標題
        let title = '原任課教師本週課表';
        if (type === 'substitute') {
            title = '代課教師本週課表';
        }

        let tableRows = '';
        this.periods.forEach(period => {
            let row = `<td style="padding: 6px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold; text-align: center;">${period}</td>`;

            this.weekdays.forEach(weekday => {
                const isTargetSlot = record.weekday === weekday && record.period === period;

                if (isTargetSlot) {
                    // 調課的節次：黃色標記，顯示特定資訊
                    let displayContent = '';

                    if (type === 'original') {
                        // 原任課教師留存：顯示代課教師名稱
                        displayContent = `${record.className}<br><span style="font-size: 11px;">${record.subject}</span><br><span style="font-size: 10px; color: #16a34a;">(${record.substituteTeacher}老師)</span>`;
                    } else if (type === 'substitute') {
                        // 代課教師留存：顯示原任課教師名稱
                        displayContent = `${record.className}<br><span style="font-size: 11px;">${record.subject}</span><br><span style="font-size: 10px; color: #dc2626;">(${record.originalTeacher}老師)</span>`;
                    } else {
                        // 教學組存查：只顯示班級和科目
                        displayContent = `${record.className}<br><span style="font-size: 11px;">${record.subject}</span>`;
                    }

                    row += `<td style="padding: 6px; border: 1px solid #ddd; text-align: center; background: #fef08a; font-weight: bold;">
                        ${displayContent}
                    </td>`;
                } else {
                    // 非調課節次：只顯示空白格線
                    row += `<td style="padding: 6px; border: 1px solid #ddd; text-align: center; min-height: 40px;">&nbsp;</td>`;
                }
            });

            tableRows += `<tr>${row}</tr>`;
        });

        return `
        <div style="margin-top: 20px;">
            <h3 style="font-size: 14px; margin-bottom: 10px; color: #333;">${title}</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr style="background: #2563eb; color: white;">
                        <th style="padding: 8px; border: 1px solid #1d4ed8; width: 12%;">節次</th>
                        <th style="padding: 8px; border: 1px solid #1d4ed8;">週一</th>
                        <th style="padding: 8px; border: 1px solid #1d4ed8;">週二</th>
                        <th style="padding: 8px; border: 1px solid #1d4ed8;">週三</th>
                        <th style="padding: 8px; border: 1px solid #1d4ed8;">週四</th>
                        <th style="padding: 8px; border: 1px solid #1d4ed8;">週五</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <p style="font-size: 11px; color: #666; margin-top: 5px;">※ 黃色標記為本次調課節次</p>
        </div>
        `;
    }

    /**
     * 建立班級公告 HTML（不顯示調課事由）
     */
    createClassNoticeHTML(record) {
        return `
        <div style="
            margin: 30px 0;
            padding: 30px;
            border: 3px solid #dc2626;
            border-radius: 10px;
            text-align: center;
            background: #fef2f2;
        ">
            <h2 style="font-size: 22px; color: #dc2626; margin-bottom: 20px;">班級公告</h2>

            <div style="font-size: 18px; line-height: 2;">
                <p><strong>${record.date}</strong>（${record.weekday}）</p>
                <p><strong style="font-size: 24px;">${record.period}</strong></p>
                <p style="margin: 20px 0;">
                    <span style="color: #666;">科目：</span>
                    <strong>${record.subject}</strong>
                </p>
                <p style="margin: 15px 0;">
                    <span style="background: #fee2e2; padding: 5px 15px; border-radius: 5px;">
                        原任課教師：<strong>${record.originalTeacher}</strong>
                    </span>
                </p>
                <p style="font-size: 20px; margin: 15px 0;">
                    ↓ 改由 ↓
                </p>
                <p style="margin: 15px 0;">
                    <span style="background: #dcfce7; padding: 5px 15px; border-radius: 5px;">
                        代課教師：<strong style="font-size: 22px;">${record.substituteTeacher}</strong>
                    </span>
                </p>
            </div>
        </div>
        `;
    }

    /**
     * 取得教師週課表
     */
    getTeacherWeekSchedule(scheduleData, teacherName) {
        return scheduleData.filter(course => course.teacher === teacherName);
    }

    /**
     * 生成月結算報表 PDF
     */
    async generateSettlementReport(settlementData, year, month) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4'); // 橫向

        // 建立 HTML
        const html = this.createSettlementHTML(settlementData, year, month);

        // 建立隱藏容器
        const container = document.createElement('div');
        container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 1100px;';
        container.innerHTML = html;
        document.body.appendChild(container);

        try {
            await new Promise(resolve => setTimeout(resolve, 100));

            const canvas = await html2canvas(container, {
                scale: 2,
                useCORS: true,
                logging: false
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const imgWidth = 297; // A4 橫向寬度
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            doc.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, 210));

            const fileName = `授課時數結算表_${year}學年度_${month}月.pdf`;
            doc.save(fileName);

        } finally {
            document.body.removeChild(container);
        }
    }

    /**
     * 建立結算表 HTML
     */
    createSettlementHTML(settlementData, year, month) {
        let tableRows = settlementData.map(row => `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${row.teacherName}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${row.weeklyHours}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${row.originalHours}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #16a34a;">${row.substituteHours > 0 ? '+' + row.substituteHours : '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #dc2626;">${row.substitutedHours > 0 ? '-' + row.substitutedHours : '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${row.actualHours}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${row.overtimeHours}</td>
            </tr>
        `).join('');

        // 合計
        const totals = settlementData.reduce((acc, row) => ({
            weekly: acc.weekly + row.weeklyHours,
            original: acc.original + row.originalHours,
            substitute: acc.substitute + row.substituteHours,
            substituted: acc.substituted + row.substitutedHours,
            actual: acc.actual + row.actualHours,
            overtime: acc.overtime + row.overtimeHours
        }), { weekly: 0, original: 0, substitute: 0, substituted: 0, actual: 0, overtime: 0 });

        tableRows += `
            <tr style="background: #f5f5f5; font-weight: bold;">
                <td style="padding: 8px; border: 1px solid #ddd;">合計</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${totals.weekly}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${totals.original}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #16a34a;">+${totals.substitute}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #dc2626;">-${totals.substituted}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${totals.actual}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${totals.overtime}</td>
            </tr>
        `;

        return `
        <div style="
            font-family: 'Microsoft JhengHei', 'Noto Sans TC', sans-serif;
            padding: 30px;
            background: white;
        ">
            <h1 style="text-align: center; font-size: 22px; margin-bottom: 20px; color: #2563eb;">
                ${year} 學年度 ${month} 月 教師授課時數結算表
            </h1>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: #2563eb; color: white;">
                        <th style="padding: 10px; border: 1px solid #1d4ed8;">教師姓名</th>
                        <th style="padding: 10px; border: 1px solid #1d4ed8;">每週節數</th>
                        <th style="padding: 10px; border: 1px solid #1d4ed8;">原定授課時數</th>
                        <th style="padding: 10px; border: 1px solid #1d4ed8;">代課增加</th>
                        <th style="padding: 10px; border: 1px solid #1d4ed8;">被代課減少</th>
                        <th style="padding: 10px; border: 1px solid #1d4ed8;">實際授課時數</th>
                        <th style="padding: 10px; border: 1px solid #1d4ed8;">超鐘點時數</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>

            <p style="margin-top: 20px; font-size: 11px; color: #666;">
                列印時間：${new Date().toLocaleString('zh-TW')} |
                計算基準：每週基本授課 20 節，每月以 4 週計算
            </p>
        </div>
        `;
    }
}
