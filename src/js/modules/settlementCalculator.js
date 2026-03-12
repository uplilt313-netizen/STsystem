/**
 * 月結算計算模組
 *
 * 負責計算教師每月的實際授課時數
 *
 * 計算邏輯（含假別區分）：
 * 1. 原定授課時數 = 該教師在課表中的每週授課節數 × 當月上課週數
 * 2. 代課增加時數 = 該月該教師為他人代課的總節數（不論假別皆 +1）
 * 3. 被代課減少時數 = 該月他人為該教師代課的總節數
 *    - 公假 (official)：不扣時數（學校支付公費）
 *    - 事假/病假/休假/其他：扣時數 (-1)
 *    - 調課 (swap)：不扣時數（互換，時數不變）
 * 4. 實際授課時數 = 原定時數 + 代課增加 - 被代課減少
 * 5. 超鐘點時數 = 實際授課時數 - 基本授課時數（需另設定）
 */

export class SettlementCalculator {
    constructor() {
        // 每週基本授課時數（可依學校規定調整）
        this.baseWeeklyHours = 20;

        // 每月預設上課週數
        this.defaultWeeksPerMonth = 4;

        // 不扣時數的假別（公假由學校支付，調課為互換）
        this.noDeductLeaveTypes = ['official', 'swap'];
    }

    /**
     * 計算月結算資料
     * @param {number} year - 學年度
     * @param {number} month - 月份
     * @param {Array} scheduleData - 課表資料
     * @param {Array} substituteRecords - 調代課紀錄
     * @param {Array} teachers - 教師資料
     * @returns {Array} 結算資料陣列
     */
    calculate(year, month, scheduleData, substituteRecords, teachers) {
        // 計算該月的上課週數（可以根據行事曆調整）
        const weeksInMonth = this.getWeeksInMonth(year, month);

        // 篩選該月份的調代課紀錄
        const monthlyRecords = this.filterMonthlyRecords(substituteRecords, year, month);

        // 計算每位教師的結算資料
        const settlementData = teachers.map(teacher => {
            // 1. 計算原定授課時數（每週節數 × 週數）
            const weeklyHours = this.getTeacherWeeklyHours(scheduleData, teacher.name);
            const originalHours = weeklyHours * weeksInMonth;

            // 2. 計算代課增加時數（該教師為他人代課）
            const substituteHours = this.countSubstituteHours(monthlyRecords, teacher.name);

            // 3. 計算被代課減少時數（他人為該教師代課）
            const substitutedHours = this.countSubstitutedHours(monthlyRecords, teacher.name);

            // 4. 計算實際授課時數
            const actualHours = originalHours + substituteHours - substitutedHours;

            // 5. 計算超鐘點時數
            const baseMonthlyHours = this.baseWeeklyHours * weeksInMonth;
            const overtimeHours = Math.max(0, actualHours - baseMonthlyHours);

            return {
                teacherName: teacher.name,
                weeklyHours,
                originalHours,
                substituteHours,
                substitutedHours,
                actualHours,
                overtimeHours,
                baseMonthlyHours
            };
        });

        // 按照實際授課時數排序（降序）
        settlementData.sort((a, b) => b.actualHours - a.actualHours);

        return settlementData;
    }

    /**
     * 取得該月的上課週數
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @returns {number} 上課週數
     */
    getWeeksInMonth(year, month) {
        // 這裡使用簡化的計算方式
        // 實際應用中可以根據學校行事曆調整

        // 特殊月份處理
        const specialMonths = {
            1: 2,   // 1 月（寒假）
            2: 3,   // 2 月（寒假）
            7: 0,   // 7 月（暑假）
            8: 0,   // 8 月（暑假）
        };

        if (specialMonths.hasOwnProperty(month)) {
            return specialMonths[month];
        }

        return this.defaultWeeksPerMonth;
    }

    /**
     * 篩選該月份的調代課紀錄
     * @param {Array} records - 全部紀錄
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @returns {Array} 該月份的紀錄
     */
    filterMonthlyRecords(records, year, month) {
        // 將學年度轉換為西元年
        // 台灣學年度：114 學年度 = 2025/8 ~ 2026/7
        const westernYear = parseInt(year) + 1911;

        // 根據學年度和月份計算實際年份
        // 1-7 月屬於學年度 +1 的年份
        // 8-12 月屬於學年度的年份
        const actualYear = month >= 8 ? westernYear : westernYear + 1;

        const monthStr = String(month).padStart(2, '0');
        const prefix = `${actualYear}-${monthStr}`;

        return records.filter(record => record.date && record.date.startsWith(prefix));
    }

    /**
     * 計算教師每週授課節數
     * @param {Array} scheduleData - 課表資料
     * @param {string} teacherName - 教師姓名
     * @returns {number} 每週授課節數
     */
    getTeacherWeeklyHours(scheduleData, teacherName) {
        return scheduleData.filter(course => course.teacher === teacherName).length;
    }

    /**
     * 計算代課增加時數
     * 所有代課（不論假別）皆增加時數 +1
     * 調課互換不增加時數（因為是交換，不是額外代課）
     * @param {Array} records - 該月調課紀錄
     * @param {string} teacherName - 教師姓名
     * @returns {number} 代課節數
     */
    countSubstituteHours(records, teacherName) {
        return records.filter(record =>
            record.substituteTeacher === teacherName &&
            record.type !== 'swap'  // 調課互換不計入代課增加
        ).length;
    }

    /**
     * 計算被代課減少時數
     * 根據假別區分：
     * - 公假 (official)：不扣時數（學校支付公費）
     * - 調課 (swap)：不扣時數（互換）
     * - 事假/病假/休假/其他：扣時數 (-1)
     * @param {Array} records - 該月調課紀錄
     * @param {string} teacherName - 教師姓名
     * @returns {number} 被代課節數
     */
    countSubstitutedHours(records, teacherName) {
        return records.filter(record => {
            if (record.originalTeacher !== teacherName) return false;

            // 公假和調課不扣時數
            const leaveType = record.leaveType || '';
            if (this.noDeductLeaveTypes.includes(leaveType)) {
                return false;
            }

            // 其他假別扣時數
            return true;
        }).length;
    }

    /**
     * 取得詳細的結算明細（含假別分類）
     * @param {Array} records - 該月調課紀錄
     * @param {string} teacherName - 教師姓名
     * @returns {Object} 分類統計
     */
    getDetailedSettlement(records, teacherName) {
        const asSubstitute = records.filter(r => r.substituteTeacher === teacherName);
        const asOriginal = records.filter(r => r.originalTeacher === teacherName);

        // 代課統計
        const substituteCount = asSubstitute.filter(r => r.type !== 'swap').length;
        const swapAsSubCount = asSubstitute.filter(r => r.type === 'swap').length;

        // 被代課統計（按假別分類）
        const substitutedByLeaveType = {
            official: asOriginal.filter(r => r.leaveType === 'official').length,
            personal: asOriginal.filter(r => r.leaveType === 'personal').length,
            sick: asOriginal.filter(r => r.leaveType === 'sick').length,
            rest: asOriginal.filter(r => r.leaveType === 'rest').length,
            other: asOriginal.filter(r => r.leaveType === 'other').length,
            swap: asOriginal.filter(r => r.type === 'swap').length
        };

        // 實際扣減時數（排除公假和調課）
        const deductedHours = substitutedByLeaveType.personal +
                              substitutedByLeaveType.sick +
                              substitutedByLeaveType.rest +
                              substitutedByLeaveType.other;

        return {
            teacherName,
            substituteCount,        // 代課增加（不含調課）
            swapCount: swapAsSubCount + substitutedByLeaveType.swap,  // 調課次數
            substitutedByLeaveType, // 被代課（按假別）
            deductedHours,          // 實際扣減時數
            officialLeaveCount: substitutedByLeaveType.official  // 公假次數（不扣）
        };
    }

    /**
     * 匯出結算表為 Excel
     * @param {Array} settlementData - 結算資料
     * @param {number} year - 學年度
     * @param {number} month - 月份
     */
    exportToExcel(settlementData, year, month) {
        // 建立工作表資料
        const wsData = [
            [`${year} 學年度 ${month} 月 教師授課時數結算表`],
            [],
            ['教師姓名', '每週節數', '原定授課時數', '代課增加', '被代課減少', '實際授課時數', '超鐘點時數']
        ];

        settlementData.forEach(row => {
            wsData.push([
                row.teacherName,
                row.weeklyHours,
                row.originalHours,
                row.substituteHours,
                row.substitutedHours,
                row.actualHours,
                row.overtimeHours
            ]);
        });

        // 加入合計列
        const totalRow = [
            '合計',
            settlementData.reduce((sum, r) => sum + r.weeklyHours, 0),
            settlementData.reduce((sum, r) => sum + r.originalHours, 0),
            settlementData.reduce((sum, r) => sum + r.substituteHours, 0),
            settlementData.reduce((sum, r) => sum + r.substitutedHours, 0),
            settlementData.reduce((sum, r) => sum + r.actualHours, 0),
            settlementData.reduce((sum, r) => sum + r.overtimeHours, 0)
        ];
        wsData.push(totalRow);

        // 建立工作簿
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // 設定欄寬
        ws['!cols'] = [
            { wch: 12 },  // 教師姓名
            { wch: 10 },  // 每週節數
            { wch: 14 },  // 原定授課時數
            { wch: 10 },  // 代課增加
            { wch: 12 },  // 被代課減少
            { wch: 14 },  // 實際授課時數
            { wch: 12 }   // 超鐘點時數
        ];

        // 合併標題儲存格
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }
        ];

        XLSX.utils.book_append_sheet(wb, ws, '結算表');

        // 下載檔案
        const fileName = `授課時數結算表_${year}學年度_${month}月.xlsx`;
        XLSX.writeFile(wb, fileName);
    }

    /**
     * 設定每週基本授課時數
     * @param {number} hours - 時數
     */
    setBaseWeeklyHours(hours) {
        this.baseWeeklyHours = hours;
    }

    /**
     * 設定每月上課週數
     * @param {number} weeks - 週數
     */
    setDefaultWeeksPerMonth(weeks) {
        this.defaultWeeksPerMonth = weeks;
    }

    /**
     * 取得詳細的調課明細
     * @param {Array} records - 調課紀錄
     * @param {string} teacherName - 教師姓名
     * @returns {Object} 調課明細
     */
    getSubstituteDetails(records, teacherName) {
        const asSubstitute = records.filter(r => r.substituteTeacher === teacherName);
        const asOriginal = records.filter(r => r.originalTeacher === teacherName);

        return {
            teacherName,
            substituteRecords: asSubstitute.map(r => ({
                date: r.date,
                period: r.period,
                className: r.className,
                subject: r.subject,
                for: r.originalTeacher
            })),
            substitutedRecords: asOriginal.map(r => ({
                date: r.date,
                period: r.period,
                className: r.className,
                subject: r.subject,
                by: r.substituteTeacher,
                reason: r.reason
            }))
        };
    }
}
