import { query } from '$lib/server/db';

// 날짜에 해당하는 semester_code 조회
export async function getSemesterCode(date: string): Promise<string | null> {
    try {
        const sql = `
            SELECT semester_code
            FROM semester
            WHERE $1::date BETWEEN start_date AND end_date;
        `;
        const result = await query(sql, [date]);
        if (result.length === 0) {
            return null;
        }
        if (result.length > 1) {
            console.warn(`Multiple semesters found for date: ${date}`, result);
        }
        return result[0].semester_code;
    } catch (error) {
        console.error('getSemesterCode Error:', error);
        return null;
    }
}