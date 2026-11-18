# 현금 계수 관리자

매번 들어오는 지폐 묶음을 함께 일하는 사람들이 공평하게 나눠 세도록 배분량을 계산하는 휴대폰용 웹 앱(PWA)입니다.
홈 화면에 추가하면 앱처럼 열리고, 사람 목록과 기록은 그 폰 안에만 저장됩니다(서버 없음).

## 개발

```bash
npm install
npm run dev      # 개발 서버
npm test         # 계산 규칙 테스트 (실제 사례 1~5)
npm run build    # dist/ 에 배포용 파일 생성
```

## 배포 (GitHub Pages)

`main`에 올라가면 GitHub Actions가 테스트·빌드 후 자동으로 배포합니다.
처음 한 번: Settings → Pages → Source를 **GitHub Actions**로 선택.
주소: https://healcye-sys.github.io/cash-count-app/
