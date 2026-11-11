# 스타일 프리셋 & 프롬프트 작법

## 프롬프트 구조

```
[샷 타입/앵글] [피사체 + 행동/자세] [환경/배경], [공통 스타일 접미사]
```

- **샷 타입**: extreme close up / close up / medium shot / full shot / wide shot / extreme wide shot
- **앵글**: low angle / eye level / high angle / overhead top-down / dutch angle / over-the-shoulder
- **공통 스타일 접미사**: 아래 프리셋 중 하나 또는 조합. **모든 컷에 동일하게** 붙여야 톤이 맞는다.

---

## 스타일 접미사 프리셋

### 시네마틱 16mm 빈티지
```
cinematic 16mm film still, captured on grainy vintage film with warm saturated color grading, 90s art film aesthetic, heavy film grain texture, lo-fi nostalgic cinematic quality, painterly bokeh
```

### 시네마틱 매크로 인서트
```
extreme close up macro shot, heavily defocused shallow depth of field, soft hazy warm sunlight, dreamy abstract painterly composition, 8mm experimental film aesthetic, heavy film grain
```

### 애니메 일러스트
```
painterly anime illustration style, deep blue moody magical palette, soft volumetric light, glowing particles drifting, dreamy ethereal atmosphere, hand-painted anime art style
```

### 빈티지 폴라로이드
```
vintage polaroid photograph, soft faded colors, light leak, sun flare, nostalgic warm tones, dreamy hazy quality, 70s film aesthetic
```

### 다크 판타지
```
dark atmospheric fantasy illustration with deep blue and cyan monochromatic palette, mysterious nocturnal mood, deep moody shadows, heavy film grain, rough painterly brushstrokes
```

### 실사 인물 포토
```
photorealistic portrait photography, natural soft window light, shallow depth of field 85mm lens, true-to-life skin texture with visible pores, neutral color grading, editorial photography quality
```

### 제품 / 커머셜
```
clean commercial product photography, seamless gradient backdrop, crisp studio softbox lighting with controlled specular highlights, high detail macro clarity, premium advertising aesthetic
```

프리셋에 없는 스타일이면 사용자 설명에서 키워드를 뽑아 조합한다:
`[매체] + [색감/그레이딩] + [조명] + [질감/그레인] + [무드]`

---

## 캐릭터 일관성

같은 인물을 여러 컷에 걸쳐 유지해야 하면 **외모 블록**을 만들어 모든 프롬프트에 스타일 접미사와 함께 박는다.

```
a young woman with short blonde bob hair, wearing a white sleeveless dress and white ankle socks and simple white shoes, slim build
```

- 얼굴 특징보다 **머리 / 의상 / 체형 / 소품** 같은 재현 가능한 요소 위주로 쓴다
- 유지할 요소는 반복하고, 의상·헤어 등 사용자가 바꾸려는 요소는 고정 블록에서 제외한다.
- 레퍼가 있다면 통합 스킬의 manual 또는 folder 모드로 원본을 사용한다.

## 캐릭터 시트 기본안

캐릭터 시트를 요청했을 때만 사용한다. 별도 구도 지정이 없으면 왼쪽 얼굴 클로즈업, 가운데 정면 전신, 오른쪽 후면 전신을 기본으로 잡는다. 사용자가 다른 배치·뷰 수를 지정하거나 기존 시트 구성을 유지하라고 하면 그 요청을 우선한다. 고정된 화면비·패널 비율을 요구하지 않는다.

```text
Create a character reference sheet showing the same character in three views: a face close-up on the left, a front-facing full-body view in the center, and a rear full-body view on the right. Keep the character identity, outfit, hairstyle, body proportions, and art style consistent across all three views, on a shared simple background. Keep both full-body views completely visible and arrange the views clearly within the chosen canvas.
```

위 문장에 실제 캐릭터 특징과 요청한 변경 내용을 추가한다. 시트에서 의상을 바꾸면 세 뷰 모두 같은 새 의상으로 맞춘다. 원본 레퍼 사용 시 정체성 유지 지시를 추가하되, `single view`, `not a turnaround sheet`, `no multiple views`처럼 시트 구성과 충돌하는 이전 테스트 지시는 제거한다. 레퍼가 시트라는 이유만으로 일반 단일 컷·장면·의상 변경 요청에 이 구도를 적용하지 않는다.

---

## 콘텐츠 표현

사용자가 원하는 허용되는 장면을 구체적으로 설명한다. 생성 서비스의 차단을 우회하기 위해 표현을 숨기거나 바꾸는 방식은 안내하지 않는다. 인물은 맥락에 맞는 연령·의상·자세를 명확하게 적는다.

---

## 자주 하는 실수

- **모션 서술을 넣음** — `walking slowly`, `camera slowly pushes in` → 스틸에선 무의미. `mid-stride, one foot lifted` 같은 정지 자세로 쓴다.
- **컷마다 스타일 접미사가 다름** — 톤이 다 튄다. 접미사는 복붙 수준으로 동일해야 한다.
- **프롬프트가 너무 짧음** — 20단어짜리는 모델이 마음대로 해석한다. 최소 50단어.
- **부정문 사용** — `no people`, `without background` 같은 표현은 오히려 그걸 그린다. 원하는 것만 서술한다.
- 레퍼 사용 여부는 통합 스킬의 none·manual·folder 모드 중 작업에 맞게 선택한다.
