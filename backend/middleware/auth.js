// 인증 미들웨어 (임시로 개발 모드용)
function authMiddleware(req, res, next) {
  // 개발 중에는 인증 체크 우회
  req.user = { id: "temp-user-id" };
  next();
}

// JWT 토큰 검증 (향후 구현 예정)
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "토큰이 필요합니다." });
  }

  // 향후 JWT 검증 로직 구현
  // 현재는 임시로 통과
  req.user = { id: "temp-user-id" };
  next();
}

module.exports = {
  authMiddleware,
  verifyToken
};