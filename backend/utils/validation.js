// 유틸리티 함수들

// HTML 태그 제거 함수
function stripHtmlTags(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '');
}

// 태스크 데이터 검증
function validateTaskData(data) {
  const { title, status } = data;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return { isValid: false, error: "제목은 필수 항목입니다." };
  }

  if (!status || typeof status !== 'string') {
    return { isValid: false, error: "상태는 필수 항목입니다." };
  }

  const validStatuses = ['todo', 'in-progress', 'review', 'done'];
  if (!validStatuses.includes(status)) {
    return { isValid: false, error: "유효하지 않은 상태값입니다." };
  }

  return { isValid: true };
}

// 날짜 파싱 함수
function parseDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

module.exports = {
  stripHtmlTags,
  validateTaskData,
  parseDate
};