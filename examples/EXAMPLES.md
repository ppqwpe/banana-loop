# 텍스트 생성 예시

`flower_meadow.json`은 레퍼 없이 생성하는 여섯 컷의 편집용 데이터다. prompts와 labels를 목적에 맞게 바꾼다.

```sh
python scripts/build_console.py examples/flower_meadow.json --reference none --out "작업폴더/콘솔에_붙여넣기.js"
```

완성된 JS 전체를 Higgsfield 콘솔에 붙여넣는다. JSON 파일 열기 버튼은 사용하지 않는다. 기본 한 회전이며 한 번 테스트는 요청 한 번만 보낸다. 화면비·모델·출력 수는 사이트 설정을 따른다.
